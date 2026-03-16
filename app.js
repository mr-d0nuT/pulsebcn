var SCRIPTS_URL = 'https://script.google.com/macros/s/AKfycbz0zF34AMEsNr3fCzqRlFKKQP08sUwKSv93iy7MS9OmYU5R-ZPmTCKiPgoJa5PZZI_I/exec';
var API_URL = 'https://opendata-ajuntament.barcelona.cat/data/api/action/datastore_search_sql';
var RESOURCE_ID = '877ccf66-9106-4ae2-be51-95a9f6469e4c';
var BCN_CENTER = [41.3851, 2.1734];

var map, userMarker;
window.userLat = null;
window.userLng = null;
var allEvents = [];
var filteredEvents = [];
var markers = [];
var activeFilter = 'all';
var activeDate = new Date().toISOString().split('T')[0];
var reviewRating = 0;

var ICONS = {
  cultura:'🎭', musica:'🎵', esport:'⚽', cinema:'🎬',
  exposicio:'🖼️', menjar:'🍽️', familia:'👶', natura:'🌿',
  congres:'🎤', festa:'🎉', default:'📍'
};
var COLORS = {
  cultura:'#a855f7', musica:'#3b82f6', esport:'#22c55e', cinema:'#f59e0b',
  exposicio:'#8b5cf6', menjar:'#f97316', familia:'#06b6d4', natura:'#16a34a',
  congres:'#0ea5e9', festa:'#ec4899', default:'#e94560'
};

window.addEventListener('load', function() {
  initMap();
  initFilters();
  initDatePicker();
  initListToggle();
  initReviewModal();
  loadEvents(activeDate);
  document.getElementById('btn-locate').addEventListener('click', getLocation);
  document.getElementById('btn-refresh').addEventListener('click', function() {
    showToast('🔄 Actualitzant…');
    loadEvents(activeDate);
  });
  getLocation();
});

function initMap() {
  var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  map = L.map('map', {center: BCN_CENTER, zoom: 13, zoomControl: false});
  L.tileLayer(tileUrl, {attribution:'© OpenStreetMap © CARTO', subdomains:'abcd', maxZoom:19}).addTo(map);
  L.control.zoom({position:'bottomleft'}).addTo(map);
  map.on('click', closePanel);
}

function initDatePicker() {
  var picker = document.getElementById('date-picker');
  picker.value = activeDate;
  picker.addEventListener('change', function() {
    activeDate = picker.value;
    showToast('📅 Carregant ' + formatDisplayDate(activeDate) + '…');
    loadEvents(activeDate);
  });
}

function formatDisplayDate(dateStr) {
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('ca', {day:'numeric', month:'short'});
  } catch(e) { return dateStr; }
}

function mapCategoryFromTitle(name) {
  var n = (name || '').toLowerCase();
  if (n.includes('concert') || n.includes('música') || n.includes('musica') || n.includes('jazz') || n.includes('coral') || n.includes('cantada') || n.includes('rock') || n.includes('clàssic') || n.includes('simfon') || n.includes('òpera') || n.includes('recital')) return 'musica';
  if (n.includes('cinema') || n.includes('film') || n.includes('pel·lícula') || n.includes('pelicula') || n.includes('projecci') || n.includes('audiovisual') || n.includes('curtmetratge')) return 'cinema';
  if (n.includes('exposici') || n.includes('exhibit') || n.includes('galeria') || n.includes('museu') || n.includes('pintura') || n.includes('escultura') || n.includes('fotograf') || n.includes('instal·laci')) return 'exposicio';
  if (n.includes('esport') || n.includes('futbol') || n.includes('bàsquet') || n.includes('basket') || n.includes('natació') || n.includes('running') || n.includes('tennis') || n.includes('ciclisme') || n.includes('marató') || n.includes('cursa') || n.includes('torneig')) return 'esport';
  if (n.includes('mercat') || n.includes('gastro') || n.includes('cuina') || n.includes('tast') || n.includes('fira') || n.includes('food')) return 'menjar';
  if (n.includes('infant') || n.includes('familiar') || n.includes('bressol') || n.includes('nens') || n.includes('nenes') || n.includes('escola') || n.includes('jovent') || n.includes('taller per a nens') || n.includes('taller per a famíl')) return 'familia';
  if (n.includes('natura') || n.includes('medi ambient') || n.includes('jardí botànic') || n.includes('parc') || n.includes('excursió') || n.includes('senderisme')) return 'natura';
  if (n.includes('congrés') || n.includes('jornada') || n.includes('conferència') || n.includes('simposi') || n.includes('seminari') || n.includes('taula rodona') || n.includes('debat')) return 'congres';
  if (n.includes('festa') || n.includes('celebrac') || n.includes('carnestoltes') || n.includes('revetlla') || n.includes('aplec') || n.includes('rua') || n.includes('cercavila')) return 'festa';
  if (n.includes('teatre') || n.includes('dansa') || n.includes('circ') || n.includes('espectacle') || n.includes('performance') || n.includes('ballet') || n.includes('monòleg')) return 'cultura';
  return 'cultura';
}

function isFree(val) {
  if (!val || val.trim() === '') return false;
  var v = val.toLowerCase().trim();
  return v === 'gratuït' || v === 'gratuit' || v === 'gratis' || v === 'free' || v === '0' ||
    v.includes('gratuït') || v.includes('gratuit') || v.includes('entrada lliure') || v.includes('accés lliure');
}

function isFamily(name, filters) {
  var n = (name || '').toLowerCase();
  var f = (filters || '').toLowerCase();
  return n.includes('familiar') || n.includes('infant') || n.includes('bressol') ||
    n.includes('nens') || n.includes('escola') || f.includes('famil') || f.includes('infant');
}

function formatDate(start, end) {
  if (!start) return '';
  try {
    var s = new Date(start);
    var sh = s.getHours(), sm = s.getMinutes();
    if (sh === 3 && sm === 0) return '';
    var pad = function(n){ return n.toString().padStart(2,'0'); };
    var t = pad(sh) + ':' + pad(sm);
    if (end) {
      var e = new Date(end);
      if (!(e.getHours() === 3 && e.getMinutes() === 0)) {
        t += '–' + pad(e.getHours()) + ':' + pad(e.getMinutes());
      }
    }
    return t;
  } catch(ex) { return ''; }
}

function formatFullDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('ca', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  } catch(e) { return ''; }
}

function loadEvents(date) {
  var sql = 'SELECT * FROM "' + RESOURCE_ID + '" WHERE start_date <= \'' + date + 'T23:59:59\' AND end_date >= \'' + date + 'T00:00:00\' LIMIT 500';
  var url = API_URL + '?sql=' + encodeURIComponent(sql);

  document.getElementById('loading-overlay').classList.remove('hidden');

  fetch(url)
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(data) {
      if (!data.success) throw new Error('API error');
      var records = (data.result && data.result.records) || [];
      console.log('Events from API:', records.length, 'for date:', date);

      if (records.length > 0) {
        allEvents = records.map(function(item) {
          var lat = parseFloat(item.geo_epgs_4326_lat);
          var lng = parseFloat(item.geo_epgs_4326_lon);
          if (isNaN(lat)) lat = BCN_CENTER[0] + (Math.random()-0.5)*0.04;
          if (isNaN(lng)) lng = BCN_CENTER[1] + (Math.random()-0.5)*0.07;

          var registerId = (item.register_id || '').replace(/[^\d]/g,'').trim();
          var guiaUrl = registerId
            ? 'https://guia.barcelona.cat/ca/detall/' + registerId
            : 'https://guia.barcelona.cat/ca/llistat?tipuscerca=agenda&d=avui';

          var address = '';
          if (item.addresses_road_name) {
            address = item.addresses_road_name;
            if (item.addresses_start_street_number) address += ', ' + item.addresses_start_street_number;
            if (item.addresses_zip_code) address += ' (CP: ' + item.addresses_zip_code + ')';
          }

          var description = item.values_description || item.values_value || '';
          if (!description && item.secondary_filters_fullpath) {
            description = item.secondary_filters_fullpath.replace(/\//g,' · ');
          }
          if (!description) description = 'Clica "Més info" per veure tots els detalls a la Guia Barcelona.';

          var tags = [];
          if (item.values_category && item.values_category.trim()) tags.push(item.values_category);
          if (item.secondary_filters_name && item.secondary_filters_name.trim()) tags.push(item.secondary_filters_name);
          if (item.values_outstanding === 'True') tags.push('⭐ Destacat');

          return {
            id: 'bcn-' + item._id,
            title: item.name || 'Esdeveniment',
            category: mapCategoryFromTitle(item.name),
            lat: lat, lng: lng,
            free: isFree(item.values_value || ''),
            family: isFamily(item.name, item.secondary_filters_name),
            time: item.timetable ? item.timetable.trim() : formatDate(item.start_date, item.end_date),
            startDate: item.start_date,
            endDate: item.end_date,
            estimatedDates: item.estimated_dates || '',
            location: address || 'Barcelona',
            neighborhood: item.addresses_neighborhood_name || '',
            district: item.addresses_district_name || '',
            description: description,
            organizer: item.institution_name || '',
            tags: tags,
            url: guiaUrl
          };
        });
      } else {
        allEvents = [];
      }

      window.allEvents = allEvents;
      renderEvents();
      document.getElementById('loading-overlay').classList.add('hidden');
      showToast('✅ ' + allEvents.length + ' esdeveniments el ' + formatDisplayDate(date));
    })
    .catch(function(err) {
      console.error('loadEvents error:', err);
      allEvents = getFallback();
      window.allEvents = allEvents;
      renderEvents();
      document.getElementById('loading-overlay').classList.add('hidden');
      showToast('⚠️ Usant dades locals');
    });
}

function renderEvents() {
  markers.forEach(function(m) { map.removeLayer(m); });
  markers = [];
  filteredEvents = allEvents.filter(function(e) {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'free') return e.free;
    if (activeFilter === 'family') return e.family;
    return e.category === activeFilter;
  });
  filteredEvents.forEach(function(evt) {
    var color = COLORS[evt.category] || COLORS.default;
    var emoji = ICONS[evt.category] || ICONS.default;
    var freeBadge = evt.free ? '<div style="background:#00c853;color:#000;font-size:8px;padding:1px 5px;border-radius:4px;font-weight:700;margin-top:2px;text-align:center">FREE</div>' : '';
    var html = '<div style="text-align:center"><div style="background:' + color + ';width:40px;height:40px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:inline-flex;align-items:center;justify-content:center;box-shadow:0 3px 14px rgba(0,0,0,0.3);border:2px solid rgba(255,255,255,0.4)"><span style="transform:rotate(45deg);font-size:18px;line-height:1">' + emoji + '</span></div>' + freeBadge + '</div>';
    var icon = L.divIcon({html:html, className:'', iconSize:[40,54], iconAnchor:[20,50]});
    var marker = L.marker([evt.lat, evt.lng], {icon:icon}).addTo(map);
    marker.on('click', function() { openPanel(evt); });
    markers.push(marker);
  });
  document.getElementById('event-count').textContent = filteredEvents.length + ' event' + (filteredEvents.length !== 1 ? 's' : '');
  renderList();
}

function openPanel(evt) {
  window._currentEvtId = evt.id;
  var panel = document.getElementById('event-panel');
  var content = document.getElementById('panel-content');
  content.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text2)">Carregant…</div>';
  panel.classList.remove('hidden');
  setTimeout(function() { panel.classList.add('open'); }, 10);
  map.flyTo([evt.lat, evt.lng], 16, {duration:0.8});

  var detailPromise = fetch(SCRIPTS_URL + '?action=detail&url=' + encodeURIComponent(evt.url))
    .then(function(r){ return r.json(); })
    .catch(function(){ return {}; });

  var reviewsPromise = new Promise(function(resolve) {
    loadReviews(evt.id, resolve);
  });

  Promise.all([detailPromise, reviewsPromise]).then(function(results) {
    var detail = results[0] || {};
    var reviews = results[1] || [];

    var avgHtml = '';
    if (reviews.length > 0) {
      var avg = reviews.reduce(function(s,r){return s+Number(r.estrellas);},0)/reviews.length;
      avgHtml = '<div class="avg-rating">★ ' + avg.toFixed(1) +
        ' <span style="font-size:13px;opacity:0.6">(' + reviews.length + ' ressenya' + (reviews.length!==1?'es':'') + ')</span></div>';
    }

    var fotoHtml = '';
    if (detail.foto) {
      fotoHtml = '<div class="event-foto"><img src="' + detail.foto + '" alt="' + escHtml(evt.title) + '" loading="lazy"/></div>';
    }

    var infoBlocks = '';

    var lloc = detail.lloc || evt.organizer || '';
    if (lloc) {
      infoBlocks += '<div class="info-block"><span class="info-icon">📍</span><div><strong>On</strong><br><span style="color:var(--accent)">' + escHtml(lloc) + '</span></div></div>';
    }

    var quan = detail.quan || evt.time || '';
    if (quan) {
      infoBlocks += '<div class="info-block"><span class="info-icon">📅</span><div><strong>Quan</strong><br>' + escHtml(quan) + '</div></div>';
    }

    if (evt.startDate) {
      infoBlocks += '<div class="info-block"><span class="info-icon">🗓️</span><div><strong>Data</strong><br>' +
        formatFullDate(evt.startDate) +
        (evt.endDate && evt.endDate !== evt.startDate ? '<br><small>Fins: ' + formatFullDate(evt.endDate) + '</small>' : '') +
        '</div></div>';
    }

    if (evt.location) {
      var mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(evt.location + ', Barcelona');
      infoBlocks += '<div class="info-block"><span class="info-icon">🏠</span><div><strong>Adreça</strong><br>' +
        escHtml(evt.location) +
        (evt.neighborhood ? '<br><small>' + escHtml(evt.neighborhood) + (evt.district ? ' (' + escHtml(evt.district) + ')' : '') + '</small>' : '') +
        '<br><a href="' + mapsUrl + '" target="_blank" style="font-size:12px;color:var(--accent)">Veure al mapa ↗</a></div></div>';
    }

    if (detail.phones && detail.phones.length) {
      var phonesHtml = detail.phones.map(function(p) {
        return '<a href="tel:' + p + '" style="color:var(--accent);display:block;text-decoration:none">📞 ' + p + '</a>';
      }).join('');
      infoBlocks += '<div class="info-block"><span class="info-icon">📞</span><div><strong>Telèfon</strong><br>' + phonesHtml + '</div></div>';
    }

    if (detail.web) {
      infoBlocks += '<div class="info-block"><span class="info-icon">🌐</span><div><strong>Web</strong><br><a href="' + detail.web + '" target="_blank" style="color:var(--accent);font-size:13px;word-break:break-all">' + detail.web + '</a></div></div>';
    }

    var googleUrl = 'https://www.google.com/search?q=' + encodeURIComponent(evt.title + ' Barcelona');
    var mapsNav = 'https://www.google.com/maps/dir/?api=1&destination=' + evt.lat + ',' + evt.lng;

    content.innerHTML =
      fotoHtml +
      '<div class="event-title">' + escHtml(evt.title) + '</div>' +
      avgHtml +
      '<div class="event-meta">' +
        (evt.free ? '<span class="tag tag-free">🆓 Gratuït</span>' : '<span class="tag tag-paid">💶 De pagament</span>') +
        (evt.family ? '<span class="tag tag-free">👶 Familiar</span>' : '') +
        '<span class="tag tag-cat">' + (ICONS[evt.category]||'📍') + ' ' + escHtml(evt.category) + '</span>' +
      '</div>' +
      '<p class="event-desc">' + escHtml(evt.description) + '</p>' +
      '<div class="info-blocks">' + infoBlocks + '</div>' +
      '<div class="panel-actions">' +
        '<button class="btn-primary" onclick="startARNav(\'' + evt.id + '\')">📷 AR</button>' +
        '<button class="btn-secondary" onclick="window.open(\'' + mapsNav + '\')">🗺️ Com arribar</button>' +
      '</div>' +
      '<div class="panel-actions" style="margin-top:8px">' +
        '<button class="btn-secondary" onclick="window.open(\'' + evt.url + '\')">🔗 Guia BCN</button>' +
        '<button class="btn-secondary" onclick="window.open(\'' + googleUrl + '\')">🔍 Google</button>' +
      '</div>' +
      '<div class="panel-actions" style="margin-top:8px">' +
        '<button class="btn-secondary" onclick="openReviewModal()">✍️ Escriure ressenya</button>' +
      '</div>' +
      '<div class="reviews-section">' +
        '<div class="reviews-title">💬 Ressenyes d\'avui (' + reviews.length + ')</div>' +
        renderReviews(reviews) +
      '</div>';
  });
}

function closePanel() {
  var panel = document.getElementById('event-panel');
  panel.classList.remove('open');
  setTimeout(function() { panel.classList.add('hidden'); }, 350);
}

function loadReviews(eventId, callback) {
  fetch(SCRIPTS_URL + '?evento_id=' + encodeURIComponent(eventId))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var reviews = Array.isArray(data) ? data.filter(function(r){
        return String(r.evento_id) === String(eventId);
      }) : [];
      callback(reviews);
    })
    .catch(function() { callback([]); });
}

function renderReviews(reviews) {
  if (!reviews.length) return '<p class="no-reviews">Sigues el primer en opinar avui! 🌟</p>';
  return reviews.map(function(r) {
    var stars = '';
    for (var i=1;i<=5;i++) stars += i<=Number(r.estrellas)?'★':'☆';
    var time = '';
    try { time = new Date(r.fecha).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); } catch(e){}
    return '<div class="review-item">' +
      '<div class="review-header">' +
        '<span class="review-user">@' + escHtml(r.usuario||'Anònim') + '</span>' +
        '<span class="review-stars">' + stars + '</span>' +
        '<span class="review-time">' + time + '</span>' +
      '</div>' +
      (r.comentario ? '<div class="review-text">' + escHtml(r.comentario) + '</div>' : '') +
      (r.foto ? '<img class="review-photo" src="' + r.foto + '" alt="foto" loading="lazy"/>' : '') +
      '</div>';
  }).join('');
}

function initReviewModal() {
  document.querySelectorAll('.star').forEach(function(s) {
    s.addEventListener('click', function() {
      reviewRating = parseInt(s.dataset.v);
      document.querySelectorAll('.star').forEach(function(st,i){
        st.classList.toggle('active', i < reviewRating);
      });
    });
  });
  document.getElementById('review-photo').addEventListener('change', function(e) {
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      window._reviewPhoto = ev.target.result;
      document.getElementById('photo-preview').innerHTML = '<img src="' + ev.target.result + '" alt="preview"/>';
    };
    reader.readAsDataURL(file);
  });
  document.getElementById('review-cancel').addEventListener('click', closeReviewModal);
  document.getElementById('review-submit').addEventListener('click', submitReview);
}

function openReviewModal() { document.getElementById('review-modal').classList.remove('hidden'); }

function closeReviewModal() {
  document.getElementById('review-modal').classList.add('hidden');
  document.getElementById('review-text').value = '';
  document.getElementById('review-user').value = '';
  document.getElementById('photo-preview').innerHTML = '';
  reviewRating = 0; window._reviewPhoto = null;
  document.querySelectorAll('.star').forEach(function(s){s.classList.remove('active');});
}

function submitReview() {
  var usuario = document.getElementById('review-user').value.trim();
  var texto = document.getElementById('review-text').value.trim();
  var evtId = window._currentEvtId;
  if (!usuario) { showToast('Escriu el teu nom o apodo'); return; }
  if (!reviewRating) { showToast('Selecciona una puntuació ⭐'); return; }
  if (!evtId) return;

  fetch(SCRIPTS_URL, {
    method: 'POST',
    body: JSON.stringify({
      evento_id: evtId,
      usuario: usuario,
      estrellas: reviewRating,
      comentario: texto,
      foto: window._reviewPhoto || ''
    })
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    if (d.status === 'success') {
      showToast('Ressenya publicada! 🎉');
      closeReviewModal();
      var evt = allEvents.find(function(e){ return e.id === evtId; });
      if (evt) setTimeout(function(){ openPanel(evt); }, 1500);
    } else {
      showToast('Error en publicar. Torna-ho a provar.');
    }
  })
  .catch(function(){ showToast('Error de connexió.'); });
}

function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderEvents();
      closePanel();
    });
  });
}

function initListToggle() {
  document.getElementById('btn-list-toggle').addEventListener('click', function() {
    var list = document.getElementById('event-list');
    if (list.classList.contains('open')) {
      list.classList.remove('open');
      setTimeout(function(){ list.classList.add('hidden'); }, 300);
    } else {
      list.classList.remove('hidden');
      setTimeout(function(){ list.classList.add('open'); }, 10);
    }
  });
  document.getElementById('btn-list-close').addEventListener('click', function() {
    var list = document.getElementById('event-list');
    list.classList.remove('open');
    setTimeout(function(){ list.classList.add('hidden'); }, 300);
  });
}

function renderList() {
  if (filteredEvents.length === 0) {
    document.getElementById('list-items').innerHTML =
      '<div style="padding:30px;text-align:center;color:var(--text2)">No hi ha esdeveniments per aquesta data i filtre.</div>';
    return;
  }
  document.getElementById('list-items').innerHTML = filteredEvents.map(function(evt) {
    return '<div class="list-item" onclick="flyToEvent(\'' + evt.id + '\')">' +
      '<div class="list-item-title">' + (ICONS[evt.category]||'📍') + ' ' + escHtml(evt.title) + '</div>' +
      '<div class="list-item-sub">' +
        (evt.time ? '<span>🕐 ' + evt.time + '</span>' : '') +
        (evt.free ? '<span class="dot-free">● Gratuït</span>' : '') +
        (evt.district ? '<span>' + escHtml(evt.district) + '</span>' : '') +
      '</div></div>';
  }).join('');
}

function flyToEvent(id) {
  var evt = filteredEvents.find(function(e){ return e.id === id; });
  if (!evt) return;
  map.flyTo([evt.lat, evt.lng], 16, {duration:0.8});
  setTimeout(function(){ openPanel(evt); }, 500);
  var list = document.getElementById('event-list');
  list.classList.remove('open');
  setTimeout(function(){ list.classList.add('hidden'); }, 300);
}

function getLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(function(pos) {
    window.userLat = pos.coords.latitude;
    window.userLng = pos.coords.longitude;
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.circleMarker([window.userLat, window.userLng], {
      radius:10, fillColor:'#2196f3', fillOpacity:0.9, color:'#fff', weight:3
    }).addTo(map).bindPopup('Ets aquí 📍');
    map.flyTo([window.userLat, window.userLng], 14);
  }, null, {enableHighAccuracy:true});
}

function showToast(msg, dur) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(function(){ t.classList.add('hidden'); }, dur || 3000);
}

function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function startARNav(eventId) {
  var evt = allEvents.find(function(e){ return e.id === eventId; });
  if (evt && window.startAR) window.startAR(evt);
}

function getFallback() {
  return [
    {id:'e1',title:'Mercat de la Boqueria',category:'menjar',lat:41.3816,lng:2.1726,free:true,family:true,time:'08:00–20:30',location:'La Rambla, 91',neighborhood:'El Raval',district:'Ciutat Vella',description:'El mercat més emblemàtic de Barcelona.',organizer:'Mercat de la Boqueria',tags:[],url:'https://www.boqueria.barcelona'},
    {id:'e2',title:'Concert a la Plaça del Rei',category:'musica',lat:41.3841,lng:2.1769,free:true,family:false,time:'19:00–21:00',location:'Plaça del Rei',neighborhood:'Gòtic',district:'Ciutat Vella',description:'Cicle de música en viu al cor del barri gòtic.',organizer:'Ajuntament de Barcelona',tags:[],url:'https://guia.barcelona.cat'},
    {id:'e3',title:'Exposició Museu Picasso',category:'exposicio',lat:41.3851,lng:2.1812,free:false,family:true,time:'10:00–19:00',location:'Carrer Montcada, 15',neighborhood:'El Born',district:'Ciutat Vella',description:'Una mirada als anys de formació artística del geni de Màlaga.',organizer:'Museu Picasso',tags:[],url:'https://museupicasso.bcn.cat'},
    {id:'e4',title:'Cinema Verdi',category:'cinema',lat:41.3968,lng:2.1614,free:false,family:false,time:'16:00–22:00',location:'Carrer de Verdi, 32',neighborhood:'Vila de Gràcia',district:'Gràcia',description:'Sessió de cinema independent.',organizer:'Cines Verdi',tags:[],url:'https://cines-verdi.com'},
    {id:'e5',title:'Taller Robòtica Infantil',category:'familia',lat:41.4000,lng:2.1900,free:true,family:true,time:'10:00–13:00',location:'Biblioteca Sagrada Família',neighborhood:'la Sagrada Família',district:'Eixample',description:'Tallers gratuïts per a nens.',organizer:'Biblioteques de Barcelona',tags:[],url:'https://biblioteques.barcelona'},
    {id:'e6',title:'Mercat Vintage El Raval',category:'menjar',lat:41.3795,lng:2.1680,free:true,family:true,time:'10:00–18:00',location:'Plaça dels Àngels',neighborhood:'El Raval',district:'Ciutat Vella',description:'Mercat de productes vintage.',organizer:'',tags:[],url:'#'},
    {id:'e7',title:'Visita Guiada Modernisme',category:'cultura',lat:41.3917,lng:2.1649,free:false,family:false,time:'10:30 i 16:30',location:'Sortida: Plaça Catalunya',neighborhood:'Dreta de l\'Eixample',district:'Eixample',description:'Edificis modernistes de Barcelona.',organizer:'Barcelona Turisme',tags:[],url:'https://barcelona.cat/turisme'},
    {id:'e8',title:'Festa Major del Poblenou',category:'festa',lat:41.4014,lng:2.1996,free:true,family:true,time:'Tot el dia',location:'Rambla del Poblenou',neighborhood:'el Poblenou',district:'Sant Martí',description:'Festa major amb activitats.',organizer:'',tags:[],url:'https://guia.barcelona.cat'}
  ];
}

window.openReviewModal = openReviewModal;
window.flyToEvent = flyToEvent;
window.startARNav = startARNav;
