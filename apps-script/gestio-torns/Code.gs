/**
 * ============================================================================
 *  GESTIÓ TORNS — Backend (Google Apps Script)
 * ============================================================================
 *
 *  MODEL DE DADES: "payload anual".
 *
 *  Abans, la interfície demanava al servidor un mes cada cop que navegaves
 *  (obtenerEventosMes), l'any sencer per a les estadístiques
 *  (obtenerResumenAnual) i l'any sencer una altra vegada per a la vista anual
 *  (obtenerVistaAnual). Cada crida rellegia el calendari de Google: fins a 13
 *  escombrades per any i tres viatges d'anada i tornada després de cada desat.
 *
 *  Ara el servidor construeix UNA sola vegada tot el que necessita el client
 *  per a un any — events, torns amb horari, festius, bolsa i configuració — i
 *  el client en deriva els mesos, les estadístiques i la vista anual en local.
 *  Navegar pel calendari ja no toca el servidor mai més.
 *
 *  A més:
 *   · El payload es guarda a CacheService amb una clau que inclou la versió de
 *     les dades. Qualsevol escriptura incrementa la versió, de manera que la
 *     memòria cau s'invalida sola sense TTL curts ni purgues manuals.
 *   · Les escriptures llegeixen el calendari UNA vegada per a tot el rang de
 *     dates (abans: una consulta per dia) i retornen el payload ja refrescat,
 *     de manera que desar són tres viatges menys.
 *   · Les hores realitzades NO es calculen aquí: el servidor envia els torns
 *     amb hora d'inici i fi i el client fa el càlcul. Així el payload es pot
 *     cachejar sense quedar-se obsolet a mesura que avança el dia.
 */

// ============ CONSTANTS ============

var CACHE_TTL   = 21600;   // 6 h — el límit real és la versió de dades, no el temps
var CACHE_MAX   = 95000;   // CacheService rebutja valors de més de 100 KB
var FODES_EUROS = 150;

// ============ WEB APP ============

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Gestió Torns')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
      .addMetaTag('mobile-web-app-capable', 'yes');
}

// ============ TIPUS ============
// Retorna el tipus intern a partir del títol de l'event
function detectarTipo(titulo) {
  var t = String(titulo || '').toLowerCase().trim();
  // Overlaps sobre torn (compten com a treballat)
  if (t === 'va'   || t.startsWith('va '))                                  return 'VA';
  if (t === 'ebep' || t.startsWith('ebep '))                                return 'EBEP';
  // Overlaps sobre torn (alliberen d'anar-hi però mantenen les hores del torn)
  if (t === 'llic' || t.startsWith('llic '))                                return 'LLIC';
  if (t === 'baixa'|| t.startsWith('baixa '))                               return 'BAIXA';
  // Dies de bolsa (sense hores laborables)
  if (t === 've'   || t.startsWith('ve '))                                  return 'VE';
  if (t === 'ap/ch'|| t === 'apch' || t === 'ap;ch' || t.startsWith('ap/ch ')) return 'APCH';
  // Dies sense hores laborables (generals)
  // 'fc' = nou nom; 'vacances' = compatibilitat amb events antics del calendari
  if (t === 'fc' || t.startsWith('fc ') || t === 'vacances' || t.startsWith('vacances')) return 'FC';
  if (t.startsWith('fs -') || t === 'fs')                                   return 'FS';
  if (t.startsWith('fo/des') || t === 'fo/des')                             return 'FODES';
  if (t.startsWith('fo -') || t === 'fo')                                   return 'FO';
  // Torns de treball
  if (t.includes('matí') || t.includes('mati') || t.includes('mañana'))    return 'MATI';
  if (t.includes('completo') || t.includes('tarda') || t.includes('completa')) return 'COMPLETO';
  if (t.includes('especial'))                                               return 'ESPECIAL';
  return 'OTRO';
}

// Grups funcionals: un dia només pot tenir un event de cada grup
var GRUPS = {
  TORN:    ['MATI', 'COMPLETO', 'ESPECIAL'],
  OVERLAY: ['LLIC', 'BAIXA', 'VA', 'EBEP'],
  NOHORES: ['FC', 'FS', 'FO', 'FODES', 'VE', 'APCH']
};
function grupoDe(tipo) {
  for (var g in GRUPS) if (GRUPS[g].indexOf(tipo) !== -1) return g;
  return null;
}

// Títols que crea l'app (per a BORRAR i anti-duplicats).
// Els codis curts exigeixen coincidència exacta o seguida d'espai,
// per no tocar events personals com "VERBENA" o "FCB - partit".
var APP_PREFIX = ['Trabajo', 'FS -', 'FO -', 'FO/DES', 'AP/CH', 'Vacances'];
var APP_EXACT  = ['LLIC', 'BAIXA', 'FC', 'VE', 'VA', 'EBEP'];
function esEventApp(titulo) {
  var t = String(titulo || '').trim();
  for (var i = 0; i < APP_PREFIX.length; i++) if (t.indexOf(APP_PREFIX[i]) === 0) return true;
  for (var j = 0; j < APP_EXACT.length; j++) {
    if (t === APP_EXACT[j] || t.indexOf(APP_EXACT[j] + ' ') === 0) return true;
  }
  return false;
}

// ============ VERSIÓ DE DADES (invalidació de memòria cau) ============
// Cada escriptura incrementa aquest número. Com que forma part de la clau de
// CacheService, tots els payloads antics deixen de ser accessibles a l'instant.

function dataVersion() {
  var p = PropertiesService.getUserProperties();
  var v = p.getProperty('DATA_V');
  if (!v) { v = '1'; p.setProperty('DATA_V', v); }
  return v;
}

function bumpVersion() {
  var p = PropertiesService.getUserProperties();
  var v = String(parseInt(p.getProperty('DATA_V') || '1', 10) + 1);
  p.setProperty('DATA_V', v);
  return v;
}

// ============ CALENDARIS ============

function obtenerMisCalendarios() {
  var calendarios = CalendarApp.getAllCalendars();
  var lista = [];
  var myEmail = '';
  try { myEmail = Session.getActiveUser().getEmail(); } catch (e) {}
  for (var i = 0; i < calendarios.length; i++) {
    var c = calendarios[i];
    if (!c.isHidden()) {
      lista.push({ id: c.getId(), nombre: c.getName(), esMio: c.isOwnedByMe() });
    }
  }
  lista.sort(function(a, b) { return (b.esMio ? 1 : 0) - (a.esMio ? 1 : 0); });
  return { email: myEmail, calendarios: lista, url: ScriptApp.getService().getUrl() };
}

function getCal(id) {
  if (id) return CalendarApp.getCalendarById(id);
  return CalendarApp.getDefaultCalendar();
}

// ============ UTILITATS DE DATA ============

function tz() { return Session.getScriptTimeZone() || 'Europe/Madrid'; }

// Data → 'YYYY-MM-DD' en la zona horària del script
function isoDe(d) { return Utilities.formatDate(d, tz(), 'yyyy-MM-dd'); }

// 'YYYY-MM-DD' → Date local a mitjanit
function desdeIso(s) {
  var p = String(s).split('-');
  return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
}

// ============ FESTIUS ============
// Llista completa de festius de l'any: primer els guardats per l'usuari, si no el backup fix
function getFestivosAnio(anio) {
  var json = PropertiesService.getUserProperties().getProperty('FESTIVOS_' + anio);
  if (json) return JSON.parse(json);
  return festivosFijos(anio);
}

// Diumenge de Pasqua (algorisme de Meeus/Jones/Butcher, calendari gregorià).
// Abans els festius mòbils estaven escrits a mà només per a 2025 i 2026, de
// manera que qualsevol altre any es quedava sense cap festiu.
function pascua(anio) {
  var a = anio % 19,
      b = Math.floor(anio / 100),
      c = anio % 100,
      d = Math.floor(b / 4),
      e = b % 4,
      f = Math.floor((b + 8) / 25),
      g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30,
      i = Math.floor(c / 4),
      k = c % 4,
      l = (32 + 2 * e + 2 * i - h - k) % 7,
      m = Math.floor((a + 11 * h + 22 * l) / 451),
      mes = Math.floor((h + l - 7 * m + 114) / 31),   // 3 = març, 4 = abril
      dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anio, mes - 1, dia);
}

function sumaDies(fecha, n) {
  var d = new Date(fecha.getTime());
  d.setDate(d.getDate() + n);
  return d;
}

function festivosFijos(anio) {
  anio = parseInt(anio, 10);
  if (!anio) return [];
  var f = [
    {m:0,d:1,t:"Cap d'Any"},{m:0,d:6,t:'Reis'},{m:4,d:1,t:'Dia del Treball'},
    {m:5,d:24,t:'Sant Joan'},{m:7,d:15,t:"L'Assumpció"},{m:8,d:11,t:'Diada Nacional'},
    {m:8,d:24,t:'La Mercè'},{m:9,d:12,t:'Hispanitat'},{m:10,d:1,t:'Tots Sants'},
    {m:11,d:6,t:'Constitució'},{m:11,d:8,t:'La Immaculada'},{m:11,d:25,t:'Nadal'},
    {m:11,d:26,t:'Sant Esteve'}
  ];
  // Festius mòbils, calculats a partir del diumenge de Pasqua
  var p  = pascua(anio);
  var dv = sumaDies(p, -2);   // Divendres Sant
  var dl = sumaDies(p,  1);   // Dilluns de Pasqua
  var pg = sumaDies(p, 50);   // Dilluns de Pasqua Granada
  f.push({m: dv.getMonth(), d: dv.getDate(), t: 'Divendres Sant'});
  f.push({m: dl.getMonth(), d: dl.getDate(), t: 'Dilluns de Pasqua'});
  f.push({m: pg.getMonth(), d: pg.getDate(), t: 'Dilluns Pasqua Granada'});
  f.sort(function(a, b) { return a.m !== b.m ? a.m - b.m : a.d - b.d; });
  return f.map(function(x) { return { mes: x.m, dia: x.d, titulo: x.t }; });
}

function importarFestivosWebAnual(anio) {
  var lista = [];
  var anioStr = String(anio);
  try {
    var url      = 'https://ajuntament.barcelona.cat/calendarifestius/files/calendarifestius_ca.ics?t=' + Math.floor(Math.random() * 10000);
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      var lineas       = response.getContentText().split(/\r\n|\n|\r/);
      var eventoActual = {}, dentroDeEvento = false;
      for (var i = 0; i < lineas.length; i++) {
        var linea = lineas[i].trim();
        if (linea === 'BEGIN:VEVENT') { dentroDeEvento = true; eventoActual = {}; }
        else if (linea === 'END:VEVENT') {
          if (dentroDeEvento && eventoActual.fecha && eventoActual.titulo && eventoActual.fecha.indexOf(anioStr) === 0) {
            var mes = parseInt(eventoActual.fecha.substring(4, 6), 10) - 1;
            var dia = parseInt(eventoActual.fecha.substring(6, 8), 10);
            if (!lista.some(function(e) { return e.mes === mes && e.dia === dia; })) {
              lista.push({ mes: mes, dia: dia, titulo: eventoActual.titulo });
            }
          }
          dentroDeEvento = false;
        } else if (dentroDeEvento) {
          if (linea.startsWith('DTSTART')) { var match = linea.match(/(\d{8})/); if (match) eventoActual.fecha = match[1]; }
          else if (linea.startsWith('SUMMARY')) { var partes = linea.split(':'); if (partes.length > 1) eventoActual.titulo = partes.slice(1).join(':').trim(); }
        }
      }
    }
  } catch (e) { Logger.log('Error web: ' + e.message); }

  if (lista.length === 0) lista = festivosFijos(anio);
  lista.sort(function(a, b) { return a.mes !== b.mes ? a.mes - b.mes : a.dia - b.dia; });
  return lista;
}

function getFestivosParaEditar(anio) {
  var json = PropertiesService.getUserProperties().getProperty('FESTIVOS_' + anio);
  return json ? JSON.parse(json) : [];
}

function guardarFestivosUsuario(anio, lista) {
  PropertiesService.getUserProperties().setProperty('FESTIVOS_' + anio, JSON.stringify(lista));
  bumpVersion();
  return 'ok';
}

// ============ BOLSA DE DIES ============

function getBolsas(anio) {
  var json = PropertiesService.getUserProperties().getProperty('BOLSAS_' + anio);
  if (json) return JSON.parse(json);
  return { VE: 19, APCH: 7, VA: 2, EBEP: 0 };
}

function saveBolsas(anio, bolsas) {
  PropertiesService.getUserProperties().setProperty('BOLSAS_' + anio, JSON.stringify(bolsas));
  bumpVersion();
  return 'ok';
}

// ============ CONFIG D'USUARI (objectiu d'hores i horaris de torn) ============

function getUserConfig() {
  var json = PropertiesService.getUserProperties().getProperty('CFG');
  return json ? JSON.parse(json) : {};
}

function saveUserConfig(cfg) {
  var actual = getUserConfig();
  for (var k in cfg) actual[k] = cfg[k];
  PropertiesService.getUserProperties().setProperty('CFG', JSON.stringify(actual));
  bumpVersion();
  return 'ok';
}

// ============ PAYLOAD ANUAL ============
// Tot el que la interfície necessita per a un any, en una sola resposta.

function claveCache(anio, calendarId) {
  return 'Y' + anio + '|' + String(calendarId || 'def').substring(0, 120) + '|v' + dataVersion();
}

function obtenerAnyComplet(anio, calendarId) {
  anio = parseInt(anio, 10);
  var cache = null, key = null;
  try {
    cache = CacheService.getUserCache();
    key   = claveCache(anio, calendarId);
    var hit = cache.get(key);
    if (hit) return JSON.parse(hit);
  } catch (e) { /* sense memòria cau seguim igualment */ }

  var payload = construirAnyComplet(anio, calendarId);

  if (cache && key) {
    try {
      var s = JSON.stringify(payload);
      if (s.length < CACHE_MAX) cache.put(key, s, CACHE_TTL);
    } catch (e2) { /* la memòria cau és opcional */ }
  }
  return payload;
}

function construirAnyComplet(anio, calendarId) {
  var calendario = getCal(calendarId);
  if (!calendario) throw new Error("No s'ha trobat el calendari");

  var eventos = calendario.getEvents(new Date(anio, 0, 1), new Date(anio + 1, 0, 1));
  var evs   = [];   // {m, d, t, n, h}  — mes, dia, tipus, nom, horari llegible
  var torns = [];   // {f, a, b}        — data ISO, hora inici i fi en decimal

  for (var i = 0; i < eventos.length; i++) {
    var e      = eventos[i];
    var titulo = e.getTitle();
    var st     = e.getStartTime();
    var desc   = e.getDescription();
    var tipo   = detectarTipo(titulo);

    var horario = e.isAllDayEvent() ? 'Tot el dia' : 'Evento';
    if (desc && desc.indexOf('Horario:') === 0) horario = desc.replace('Horario: ', '');

    evs.push({ m: st.getMonth(), d: st.getDate(), t: tipo, n: titulo, h: horario });

    // Les hores del dia surten de la descripció "Horario: HH:MM a HH:MM".
    // Enviem els extrems i deixem que el client calculi planificat/realitzat:
    // així el payload no caduca a mesura que avança el dia.
    if (desc && desc.indexOf('Horario:') !== -1) {
      var m = desc.match(/(\d{1,2}):(\d{2}) a (\d{1,2}):(\d{2})/);
      if (m) {
        torns.push({
          f: isoDe(st),
          a: parseInt(m[1], 10) + parseInt(m[2], 10) / 60,
          b: parseInt(m[3], 10) + parseInt(m[4], 10) / 60
        });
      }
    }
  }

  return {
    anio:     anio,
    v:        dataVersion(),
    eventos:  evs,
    torns:    torns,
    festivos: getFestivosAnio(anio),
    bolsas:   getBolsas(anio),
    cfg:      getUserConfig(),
    fodesEur: FODES_EUROS
  };
}

// Arrencada: calendaris + payload de l'any en una sola crida.
// Estalvia el segon viatge d'anada i tornada en obrir l'aplicació.
function arrancar(anio, calendarId) {
  var cals = obtenerMisCalendarios();
  var id   = calendarId || null;
  // Si el calendari recordat ja no existeix, caiem al primer de la llista
  var existe = false;
  for (var i = 0; i < cals.calendarios.length; i++) {
    if (cals.calendarios[i].id === id) { existe = true; break; }
  }
  if (!existe) id = cals.calendarios.length ? cals.calendarios[0].id : null;

  return { cals: cals, calId: id, any: obtenerAnyComplet(anio, id) };
}

// ============ PROCESSAR DIES ============

// Agrupa els events d'un rang per dia ISO amb UNA sola lectura del calendari.
// Abans es feia una consulta per cada dia seleccionat.
function eventosPorDia(calendario, fechas) {
  var ordenadas = fechas.slice().sort();
  var ini = desdeIso(ordenadas[0]);
  var fin = desdeIso(ordenadas[ordenadas.length - 1]);
  fin.setDate(fin.getDate() + 1);

  var todos = calendario.getEvents(ini, fin);
  var porDia = {};
  for (var i = 0; i < todos.length; i++) {
    var k = isoDe(todos[i].getStartTime());
    if (!porDia[k]) porDia[k] = [];
    porDia[k].push(todos[i]);
  }
  return porDia;
}

function procesarListaDias(datos) {
  var calendario = getCal(datos.calendarId);
  if (!calendario) throw new Error("No s'ha trobat el calendari");

  var fechas = datos.fechas || [];
  if (!fechas.length) throw new Error('Cap dia seleccionat');

  var accion   = datos.accion;
  var contador = 0;
  var grupNou  = accion === 'BORRAR' ? null : grupoDe(detectarTipo(datos.titulo));
  var porDia   = eventosPorDia(calendario, fechas);

  for (var i = 0; i < fechas.length; i++) {
    var fiso     = fechas[i];
    var fechaObj = desdeIso(fiso);
    var delDia   = porDia[fiso] || [];

    if (accion === 'BORRAR') {
      for (var k = 0; k < delDia.length; k++) {
        if (esEventApp(delDia[k].getTitle())) { delDia[k].deleteEvent(); contador++; }
      }
    } else {
      // Anti-duplicats: si el dia ja té un event de l'app del mateix grup, se substitueix
      for (var k2 = 0; k2 < delDia.length; k2++) {
        var tEv = delDia[k2].getTitle();
        if (esEventApp(tEv) && grupoDe(detectarTipo(tEv)) === grupNou) delDia[k2].deleteEvent();
      }
      var ev = calendario.createAllDayEvent(datos.titulo, fechaObj, { description: datos.descripcion });
      if (datos.colorId) ev.setColor(String(datos.colorId));
      contador++;
    }
  }

  bumpVersion();
  return {
    msg: accion === 'BORRAR' ? '🗑️ ' + contador + ' events eliminats'
                             : '✅ ' + contador + ' dies desats',
    n:   contador,
    any: obtenerAnyComplet(anioDeVista(datos, fechas), datos.calendarId)
  };
}

// Any que el client està mirant (per retornar-li el payload que necessita)
function anioDeVista(datos, fechas) {
  if (datos && datos.anioVista) return parseInt(datos.anioVista, 10);
  return parseInt(String(fechas[0]).substring(0, 4), 10);
}

// ============ EDITAR / ELIMINAR UN EVENT CONCRET ============

function eliminarEventoDia(fecha, titulo, calendarId, anioVista) {
  var calendario = getCal(calendarId);
  if (!calendario) throw new Error("No s'ha trobat el calendari");
  var ini = desdeIso(fecha);
  var fin = new Date(ini);
  fin.setDate(fin.getDate() + 1);
  var eventos = calendario.getEvents(ini, fin);
  var n = 0;
  for (var i = 0; i < eventos.length; i++) {
    if (eventos[i].getTitle() === titulo && esEventApp(eventos[i].getTitle())) {
      eventos[i].deleteEvent();
      n++;
    }
  }
  if (!n) throw new Error("No s'ha trobat l'event al calendari");
  bumpVersion();
  return {
    msg: '🗑️ Event eliminat',
    n:   n,
    any: obtenerAnyComplet(anioVista || parseInt(String(fecha).substring(0, 4), 10), calendarId)
  };
}

// Canvia el tipus d'un event: esborra l'antic i crea el nou el mateix dia
function cambiarTipoEvento(fecha, tituloAntiguo, datos, calendarId, anioVista) {
  var calendario = getCal(calendarId);
  if (!calendario) throw new Error("No s'ha trobat el calendari");
  var ini = desdeIso(fecha);
  var fin = new Date(ini);
  fin.setDate(fin.getDate() + 1);

  var eventos = calendario.getEvents(ini, fin);
  var borrado = 0;
  var grupNou = grupoDe(detectarTipo(datos.titulo));
  for (var i = 0; i < eventos.length; i++) {
    var tEv = eventos[i].getTitle();
    if (!esEventApp(tEv)) continue;
    // L'event original, o qualsevol altre del mateix grup que quedaria duplicat
    if (tEv === tituloAntiguo || grupoDe(detectarTipo(tEv)) === grupNou) {
      eventos[i].deleteEvent();
      borrado++;
    }
  }
  if (!borrado) throw new Error("No s'ha trobat l'event al calendari");

  var ev = calendario.createAllDayEvent(datos.titulo, ini, { description: datos.descripcion });
  if (datos.colorId) ev.setColor(String(datos.colorId));

  bumpVersion();
  return {
    msg: '✏️ Canviat a ' + datos.titulo,
    n:   1,
    any: obtenerAnyComplet(anioVista || parseInt(String(fecha).substring(0, 4), 10), calendarId)
  };
}

// ============ DESFER ============
// Restaura l'estat exacte que tenien uns dies abans de l'última operació.
// El client envia, per a cada data, els events de l'app que hi havia.

function restaurarDies(calendarId, dies, anioVista) {
  var calendario = getCal(calendarId);
  if (!calendario) throw new Error("No s'ha trobat el calendari");
  if (!dies || !dies.length) throw new Error('Res a restaurar');

  var fechas = dies.map(function(x) { return x.f; });
  var porDia = eventosPorDia(calendario, fechas);
  var n = 0;

  for (var i = 0; i < dies.length; i++) {
    var fiso   = dies[i].f;
    var delDia = porDia[fiso] || [];

    // Fora tot el que hi hagi posat l'app ara mateix…
    for (var k = 0; k < delDia.length; k++) {
      if (esEventApp(delDia[k].getTitle())) delDia[k].deleteEvent();
    }
    // …i tornem a crear el que hi havia abans
    var previs = dies[i].evs || [];
    for (var j = 0; j < previs.length; j++) {
      var p  = previs[j];
      var ev = calendario.createAllDayEvent(p.titulo, desdeIso(fiso), { description: p.descripcion || '' });
      if (p.colorId) ev.setColor(String(p.colorId));
      n++;
    }
  }

  bumpVersion();
  return {
    msg: '↩️ Canvi desfet',
    n:   n,
    any: obtenerAnyComplet(anioVista || parseInt(String(fechas[0]).substring(0, 4), 10), calendarId)
  };
}

// ============ COMPATIBILITAT ============
// La interfície ja no fa servir aquestes funcions (ho deriva tot del payload
// anual), però es mantenen perquè qualsevol enllaç o script antic segueixi
// funcionant.

function obtenerEventosMes(mes, anio, calendarId) {
  var p = obtenerAnyComplet(anio, calendarId);
  var out = p.eventos.filter(function(e) { return e.m === mes; })
                     .map(function(e) {
                       return { dia: e.d, titulo: e.n, tipo: e.t, horario: e.h, descripcion: '' };
                     });
  p.festivos.forEach(function(f) {
    if (f.mes === mes) out.push({ dia: f.dia, titulo: f.titulo, tipo: 'FESTIVO', horario: 'Festiu' });
  });
  return out;
}

function obtenerVistaAnual(anio, calendarId) {
  var p = obtenerAnyComplet(anio, calendarId);
  var out = p.eventos.filter(function(e) { return e.t !== 'OTRO'; })
                     .map(function(e) { return { mes: e.m, dia: e.d, tipo: e.t }; });
  p.festivos.forEach(function(f) { out.push({ mes: f.mes, dia: f.dia, tipo: 'FESTIVO' }); });
  return out;
}

function obtenerResumenAnual(anio, calendarId) {
  var p = obtenerAnyComplet(anio, calendarId);

  var KEY = { FODES:'fodes', FC:'fc', FS:'fs', FO:'fo', LLIC:'llic', BAIXA:'baixa',
              VE:'ve', APCH:'apch', VA:'va', EBEP:'ebep',
              MATI:'mati', COMPLETO:'complet', ESPECIAL:'especial' };
  var resumen = { fodes:0, fc:0, fs:0, fo:0, llic:0, baixa:0, ve:0, apch:0,
                  va:0, ebep:0, mati:0, complet:0, especial:0 };
  var vistos = {};
  p.eventos.forEach(function(e) {
    var k = e.t + '|' + e.m + '|' + e.d;
    if (KEY[e.t] && !vistos[k]) { vistos[k] = true; resumen[KEY[e.t]]++; }
  });
  resumen.fodesMonto = resumen.fodes * FODES_EUROS;

  var ahora         = new Date();
  var hoyMedianoche = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  var horaActual    = ahora.getHours() + ahora.getMinutes() / 60;
  var plan = 0, real = 0;
  p.torns.forEach(function(t) {
    var dur = Math.max(t.b - t.a, 0);
    var f   = desdeIso(t.f);
    plan += dur;
    if (f < hoyMedianoche) real += dur;
    else if (f.getTime() === hoyMedianoche.getTime() && horaActual >= t.b) real += dur;
  });

  return {
    plan:    plan.toFixed(1),
    real:    real.toFixed(1),
    resumen: resumen,
    bolsas:  p.bolsas,
    cfg:     p.cfg
  };
}
