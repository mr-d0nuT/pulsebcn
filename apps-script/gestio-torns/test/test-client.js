/* Carrega el codi real del client amb un DOM mínim i prova la capa de dades */
const fs = require('fs');
const vm = require('vm');

const noop = () => {};
const elem = () => new Proxy({ style:{setProperty:noop}, classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},
  dataset:{}, setAttribute:noop, appendChild:noop, removeChild:noop, remove:noop,
  querySelector:()=>null, querySelectorAll:()=>[], cloneNode:()=>elem(), value:'1519', textContent:'', innerHTML:'' },
  { get:(t,k)=> k in t ? t[k] : (typeof k==='string'? undefined : undefined) });

const sandbox = {
  console,
  Date, Math, JSON, Set, Array, Object, String, Number, parseInt, parseFloat, isNaN,
  setTimeout, setInterval, clearTimeout, performance,
  requestAnimationFrame: noop,
  navigator: {},
  localStorage: { _d:{}, getItem(k){return this._d[k]??null;}, setItem(k,v){this._d[k]=String(v);},
                  removeItem(k){delete this._d[k];}, key(i){return Object.keys(this._d)[i];},
                  get length(){return Object.keys(this._d).length;} },
  google: { script: { run: new Proxy({}, { get:()=>()=>sandbox.google.script.run }) } },
  document: { readyState:'loading', getElementById: elem, querySelector: ()=>null, querySelectorAll: ()=>[],
              createElement: elem, createDocumentFragment: elem, addEventListener: noop,
              documentElement:{ setAttribute:noop } },
};
sandbox.window = sandbox;
sandbox.matchMedia = () => ({ matches:false, addEventListener:noop });
sandbox.window.matchMedia = sandbox.matchMedia;

const html = fs.readFileSync(require('path').join(__dirname,'..','Index.html'),'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/g).pop().replace(/^<script>|<\/script>$/g,'');
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const S = sandbox;
let fails = 0;
const ok = (cond, name, extra) => { console.log((cond?'  ✓ ':'  ✗ ')+name+(cond?'':'  → '+JSON.stringify(extra))); if(!cond) fails++; };

/* ---------- payload de prova (any 2026) ---------- */
const ANY = 2026;
S.anioV = ANY;
S.ANYS[ANY] = {
  anio: ANY, v:'1',
  eventos: [
    {m:0,d:5,t:'COMPLETO',n:'Trabajo (Completo)',h:'08:30 a 19:00'},
    {m:0,d:6,t:'MATI',    n:'Trabajo (Matí)',    h:'08:30 a 15:00'},
    {m:0,d:6,t:'LLIC',    n:'LLIC',              h:'Tot el dia'},
    {m:0,d:7,t:'VE',      n:'VE',                h:'Tot el dia'},
    {m:0,d:8,t:'OTRO',    n:'Dentista',          h:'Evento'},
  ],
  torns: [ {f:'2026-01-05',a:8.5,b:19}, {f:'2026-01-06',a:8.5,b:15} ],
  festivos: [ {mes:0,dia:1,titulo:"Cap d'Any"} ],
  bolsas: {VE:19,APCH:7,VA:2,EBEP:0},
  cfg: {}, fodesEur:150
};

console.log('\n== derivar() ==');
S.derivar(ANY);
const D = S.DERIV[ANY];
ok(D.byDay['0_6'].length===2, 'el dia 6 té torn + overlay', D.byDay['0_6']);
ok(D.byDay['0_1'][0].tipo==='FESTIVO', 'els festius s\'injecten al dia', D.byDay['0_1']);
ok(D.byDay['0_8'][0].tipo==='OTRO', 'els events personals es conserven');
ok(Math.abs(D.plan-(10.5+6.5))<1e-9, 'hores planificades = 17', D.plan);
ok(D.plan===D.real, 'gener de 2026 ja és passat: realitzat = planificat', {plan:D.plan,real:D.real});
ok(D.resumen.complet===1 && D.resumen.mati===1 && D.resumen.llic===1 && D.resumen.ve===1, 'comptadors per tipus', D.resumen);
ok(S.bolsaUsed.VE===1, 'la bolsa VE compta 1 dia usat', S.bolsaUsed);

console.log('\n== mutarLocal(): substitució dins del mateix grup ==');
const cfgMati = S.MODO_CFG.MATI();
const prev1 = S.mutarLocal(ANY, ['2026-01-05'], 'MATI', cfgMati);
const d5 = S.ANYS[ANY].eventos.filter(e=>e.m===0&&e.d===5);
ok(d5.length===1 && d5[0].t==='MATI', 'el COMPLETO se substitueix pel MATI', d5);
ok(S.ANYS[ANY].torns.filter(t=>t.f==='2026-01-05').length===1, 'queda un sol torn el dia 5');
ok(S.ANYS[ANY].torns.find(t=>t.f==='2026-01-05').b===15, 'les hores del dia 5 s\'actualitzen a 15:00');
ok(prev1[0].evs[0].t==='COMPLETO', 'la instantània per a Desfés guarda el COMPLETO previ', prev1);

console.log('\n== restaurarLocal(): Desfés ==');
S.restaurarLocal(ANY, prev1);
const d5b = S.ANYS[ANY].eventos.filter(e=>e.m===0&&e.d===5);
ok(d5b.length===1 && d5b[0].t==='COMPLETO', 'Desfés recupera el COMPLETO', d5b);
ok(S.ANYS[ANY].torns.find(t=>t.f==='2026-01-05').b===19, 'Desfés recupera les hores originals');

console.log('\n== grups diferents conviuen ==');
S.mutarLocal(ANY, ['2026-01-05'], 'VE', S.MODO_CFG.VE());
const d5c = S.ANYS[ANY].eventos.filter(e=>e.m===0&&e.d===5).map(e=>e.t).sort();
ok(JSON.stringify(d5c)===JSON.stringify(['COMPLETO','VE']), 'VE (sense hores) no esborra el torn', d5c);
ok(S.ANYS[ANY].torns.some(t=>t.f==='2026-01-05'), 'les hores del torn es mantenen');

console.log('\n== BORRAR respecta els events personals ==');
const prev2 = S.mutarLocal(ANY, ['2026-01-08','2026-01-06'], 'BORRAR', null);
ok(S.ANYS[ANY].eventos.some(e=>e.d===8&&e.n==='Dentista'), 'l\'event personal "Dentista" sobreviu');
ok(!S.ANYS[ANY].eventos.some(e=>e.d===6), 'els events de l\'app del dia 6 desapareixen');
ok(!S.ANYS[ANY].torns.some(t=>t.f==='2026-01-06'), 'les hores del dia 6 desapareixen');
S.restaurarLocal(ANY, prev2);
ok(S.ANYS[ANY].eventos.filter(e=>e.d===6).length===2, 'Desfés recupera els dos events del dia 6');

console.log('\n== reconstruirEv(): torn especial ==');
const r = S.reconstruirEv({t:'ESPECIAL', n:'Trabajo (Especial)', h:'07:00 a 13:30'});
ok(r.descripcion==='Horario: 07:00 a 13:30', 'l\'horari especial es reconstrueix', r);
ok(S.reconstruirEv({t:'VE',n:'VE',h:'Tot el dia'}).colorId===10, 'el color de VE es recupera');

console.log('\n== esEventApp() ==');
[['Trabajo (Matí)',true],['VE',true],['VERBENA',false],['FCB - partit',false],['FC',true],['LLIC matinal',true],['Dentista',false]]
  .forEach(([t,e]) => ok(S.esEventApp(t)===e, `esEventApp(${JSON.stringify(t)}) === ${e}`));

console.log('\n== parseHorari() ==');
ok(JSON.stringify(S.parseHorari('Horario: 08:30 a 15:00'))==='{"a":8.5,"b":15}', 'parseHorari amb prefix');
ok(S.parseHorari('Tot el dia')===null, 'parseHorari sense horari retorna null');

console.log(fails? `\n${fails} PROVES FALLIDES\n` : '\nTOTES LES PROVES PASSEN\n');
process.exit(fails?1:0);
