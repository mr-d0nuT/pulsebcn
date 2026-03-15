var BCN_CENTER = [41.3851, 2.1734];
var map, userMarker;
window.userLat = null;
window.userLng = null;
var allEvents = [];
var filteredEvents = [];
var markers = [];
var activeFilter = 'all';
var activeEventId = null;
var reviewRating = 0;

var ICONS = { culture:'🎭', music:'🎵', sport:'⚽', cinema:'🎬', protest:'📣', family:'👨‍👩‍👧', exhibition:'🖼️', food:'🍽️', theatre:'🎪', default:'📍' };
var COLORS = { culture:'#a855f7', music:'#3b82f6', sport:'#22c55e', cinema:'#f59e0b', protest:'#ef4444', family:'#06b6d4', exhibition:'#8b5cf6', food:'#f97316', theatre:'#ec4899', default:'#e94560' };

window.addEventListener('load', function() {
  initMap();
  initFilters();
  initListToggle();
  initReviewModal();
  loadEvents();
  initLocate();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
});

function initMap() {
  map = L.map('map', { center: BCN_CENTER, zoom: 13, zoomControl: false });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CARTO', subdomains: 'abcd', maxZoom: 19
  }).addTo(map);
  L.control.zoom({ position: 'bottomleft' }).addTo(map);
  map.on('click', closePanel);
}

function loadEvents() {
  allEvents = [
    { id:'evt-001', title:'Mercat de la Boqueria', category:'food', lat:41.3816, lng:2.1726, free:true, family:true, time:'08:00–20:30', location:'La Rambla, 91', description:'El mercat més emblemàtic de Barcelona, ple de productes frescos i vida.', url:'https://www.boqueria.barcelona' },
    { id:'evt-002', title:'Concert Plaça del Rei', category:'music', lat:41.3841, lng:2.1769, free:true, family:false, time:'19:00–21:00', location:'Plaça del Rei, s/n', description:'Cicle de música en viu al cor del barri gòtic.', url:'https://guia.barcelona.cat' },
    { id:'evt-003', title:'Exposició Museu Picasso', category:'exhibition', lat:41.3851, lng:2.1812, free:false, family:true, time:'10:00–19:00', location:'Carrer de Montcada, 15-23', description:"Una mirada als anys clau en la formació artística del geni de Màlaga.", price:'12€ / 7€ reduïda', url:'https://museupicasso.bcn.cat' },
    { id:'evt-004', title:'Marató Cinema Fantàstic', category:'cinema', lat:41.3968, lng:2.1614, free:false, family:false, time:'16:00–00:00', location:'Cinema Verdi, Gràcia', description:'Sessió especial amb 4 pel·lícules de terror i fantasia.', price:'22€', url:'https://cines-verdi.com' },
    { id:'evt-005', title:'Manifestació Llengua Catalana', category:'protest', lat:41.3909, lng:2.1698, free:true, family:true, time:'18:00', location:'Arc de Triomf', description:'Concentració i manifestació convocada per entitats culturals.', url:'#' },
    { id:'evt-006', title:'Taller Robòtica Infantil', category:'culture', lat:41.4000, lng:2.1900, free:true, family:true, time:'10:00–13:00', location:'Biblioteca Sagrada Família', description:'Tallers gratuïts per a nens de 8 a 12 anys.', url:'https://biblioteques.barcelona' },
    { id:'evt-007', title:'Mercat Vintage El Raval', category:'food', lat:41.3795, lng:2.1680, free:true, family:true, time:'10:00–18:00', location:"Plaça dels Àngels, El Raval", description:'Mercat de productes vintage i objectes curiosos.', url:'#' },
    { id:'evt-008', title:'Visita Guiada Modernisme', category:'culture', lat:41.3917, lng:2.1649, free:false, family:false, time:'10:30 i 16:30', location:"Sortida: Plaça Catalunya", description:'Descobreix edificis modernistes fora dels circuits turístics.', price:'15€', url:'https://barcelona.cat/turisme' }
  ];
  window.allEvents = allEvents;
  renderEvents();
  document.getElementById('loading-overlay').classList.add('hidden');
}

function renderEvents() {
  markers.forEach(function(m) { map.removeLayer(m); });
  markers = [];
  filteredEvents = allEvents.filter(function(evt) {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'free') return evt.free;
    if (activeFilter === 'family') return evt.family;
    return evt.category === activeFilter;
  });
  filteredEvents.forEach(function(evt) {
    var icon = createIcon(evt);
    var marker = L.marker([evt.lat, evt.lng], { icon: icon }).addTo(map);
    marker.on('click', function() { openPanel(evt); });
    markers.push(marker);
  });
  document.getElementById('event-count').textContent = filteredEvents.length + ' event' + (filteredEvents.length !== 1 ? 's' : '');
  renderList();
}

function createIcon(evt) {
  var emoji = ICONS[evt.category] || ICONS.default;
  var color = COLORS[evt.category] || COLORS.default;
  var badges = '';
  if (evt.free) badges += '<span style="background:#00d084;color:#000;font-size:8px;padding:1px 4px;border-radius:4px;font-weight:700">FREE</span>';
  if (evt.family) badges += '<span style="font-size:10px">👨‍👩‍👧</span>';
  var html = '<div style="background:' + color + ';width:40px;height:40px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(0,0,0,0.5);border:2px solid rgba(255,255,255,0.3);"><span style="transform:rotate(45deg);font-size:18px">' + emoji + '</span></div><div style="display:flex;gap:2px;justify-content:center;margin-top:2px">' + badges + '</div>';
  return L.divIcon({ html: html, className: 'custom-marker', iconSize: [40,50], iconAnchor: [20,50] });
}

function openPanel(evt) {
  activeEventId = evt.id;
  var content = document.getElementById('panel-content');
  content.innerHTML =
    '<div class="event-title">' + evt.title + '</div>' +
    '<div class="event-meta">' +
      (evt.free ? '<span class="tag tag-free">🆓 Gratuït</span>' : '<span class="tag tag-paid">💶 ' + (evt.price||'De pagament') + '</span>') +
      (evt.family ? '<span class="tag tag-family">👨‍👩‍👧 Família</span>' : '') +
      '<span class="tag tag-category">' + evt.category + '</span>' +
      '<span class="tag tag-category">🕐 ' + (evt.time||'Consultar') + '</span>' +
    '</div>' +
    '<div class="event-location">📍 <strong>' + evt.location + '</strong></div>' +
    '<p class="event-desc">' + evt.description + '</p>' +
    '<div class="panel-actions">' +
      '<button class="btn-primary" onclick="window._startAR && window._startAR(\'' + evt.id + '\')">📷 Navegar en AR</button>' +
      '<button class="btn-secondary" onclick="window.open(\'https://www.google.com/maps/dir/?api=1&destination=' + evt.lat + ',' + evt.lng + '\')">🗺️ Maps</button>' +
    '</div>' +
    '<div class="panel-actions" style="margin-top:8px">' +
      '<button class="btn-secondary" onclick="openReviewModal()">✍️ Ressenya</button>' +
      (evt.url && evt.url !== '#' ? '<button class="btn-secondary" onclick="window.open(\'' + evt.url + '\')">🔗 Més info</button>' : '') +
    '</div>' +
    '<div class="reviews-section"><div class="reviews-title">💬 Ressenyes d\'avui</div><p class="no-reviews">Sigues el primer! 🌟</p></div>';

  var panel = document.getElementById('event-panel');
  panel.classList.remove('hidden');
  setTimeout(function() { panel.classList.add('open'); }, 10);
  map.flyTo([evt.lat, evt.lng], 16, { duration: 0.8 });
}

function closePanel() {
  var panel = document.getElementById('event-panel');
  panel.classList.remove('open');
  setTimeout(function() { panel.classList.add('hidden'); }, 350);
}

function initFilters() {
  var btns = document.querySelectorAll('.filter-btn');
  btns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      btns.forEach(function(b) { b.classList.remove('active'); });
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
    list.classList.remove('hidden');
    setTimeout(function() { list.classList.add('open'); }, 10);
  });
  document.getElementById('btn-list-close').addEventListener('click', function() {
    var list = document.getElementById('event-list');
    list.classList.remove('open');
    setTimeout(function() { list.classList.add('hidden'); }, 300);
  });
}

function renderList() {
  var html = '';
  filteredEvents.forEach(function(evt) {
    html += '<div class="list-item" onclick="flyToEvent(\'' + evt.id + '\')">' +
      '<div class="list-item-title">' + (ICONS[evt.category]||'📍') + ' ' + evt.title + '</div>' +
      '<div class="list-item-sub"><span>' + (evt.time||'') + '</span>' +
      (evt.free ? '<span class="dot-free">● Gratuït</span>' : '') +
      (evt.family ? '<span class="dot-family">● Família</span>' : '') +
      '</div></div>';
  });
  document.getElementById('list-items').innerHTML = html;
}

function flyToEvent(id) {
  var evt = null;
  for (var i = 0; i < filteredEvents.length; i++) {
    if (filteredEvents[i].id === id) { evt = filteredEvents[i]; break; }
  }
  if (!evt) return;
  map.flyTo([evt.lat, evt.lng], 16, { duration: 0.8 });
  setTimeout(function() { openPanel(evt); }, 500);
  var list = document.getElementById('event-list');
  list.classList.remove('open');
  setTimeout(function() { list.classList.add('hidden'); }, 300);
}

function initLocate() {
  document.getElementById('btn-locate').addEventListener('click', getLocation);
  getLocation();
}

function getLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(function(pos) {
    window.userLat = pos.coords.latitude;
    window.userLng = pos.coords.longitude;
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.circleMarker([window.userLat, window.userLng], {
      radius:10, fillColor:'#3b82f6', fillOpacity:0.9, color:'#fff', weight:3
    }).addTo(map).bindPopup('Ets aquí 📍');
    map.flyTo([window.userLat, window.userLng], 14);
  }, null, { enableHighAccuracy: true });
}

function initReviewModal() {
  document.querySelectorAll('.star').forEach(function(s) {
    s.addEventListener('click', function() {
      reviewRating = parseInt(s.dataset.v);
      document.querySelectorAll('.star').forEach(function(st, i) {
        st.classList.toggle('active', i < reviewRating);
      });
    });
  });
  document.getElementById('review-cancel').addEventListener('click', closeReviewModal);
  document.getElementById('review-submit').addEventListener('click', function() {
    if (!reviewRating) { showToast('Selecciona una puntuació ⭐'); return; }
    showToast('Ressenya publicada! 🎉');
    closeReviewModal();
  });
}

function openReviewModal() { document.getElementById('review-modal').classList.remove('hidden'); }
function closeReviewModal() {
  document.getElementById('review-modal').classList.add('hidden');
  document.getElementById('review-text').value = '';
  reviewRating = 0;
  document.querySelectorAll('.star').forEach(function(s) { s.classList.remove('active'); });
}

function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg; t.classList.remove('hidden');
  setTimeout(function() { t.classList.add('hidden'); }, 3000);
}

document.getElementById('btn-refresh').addEventListener('click', function() {
  showToast('✅ Actualitzat!');
});

window.openReviewModal = openReviewModal;
window.flyToEvent = flyToEvent;
