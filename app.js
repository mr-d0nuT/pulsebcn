var JSONBIN_KEY = '$2a$10$dQtht8LzWjIaoWatBAp86uJJv/0ZxlbfPgmK4qzr2FxTDNo/yKlmK';
var JSONBIN_URL = 'https://api.jsonbin.io/v3/b';
var BCN_CENTER = [41.3851, 2.1734];
var map, userMarker;
window.userLat = null;
window.userLng = null;
var allEvents = [];
var filteredEvents = [];
var markers = [];
var activeFilter = 'all';
var reviewRating = 0;
var reviewsBinId = null;

var ICONS = {culture:'🎭',music:'🎵',sport:'⚽',cinema:'🎬',protest:'📣',family:'👨‍👩‍👧',exhibition:'🖼️',food:'🍽️',default:'📍'};
var COLORS = {culture:'#a855f7',music:'#3b82f6',sport:'#22c55e',cinema:'#f59e0b',protest:'#ef4444',family:'#06b6d4',exhibition:'#8b5cf6',food:'#f97316',default:'#e94560'};

window.addEventListener('load', function() {
  map = L.map('map', {center: BCN_CENTER, zoom: 13, zoomControl: false});
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CARTO', subdomains: 'abcd', maxZoom: 19
  }).addTo(map);
  L.control.zoom({position: 'bottomleft'}).addTo(map);
  map.on('click', closePanel);

  allEvents = getFallback();
  window.allEvents = allEvents;
  renderEvents();
  document.getElementById('loading-overlay').classList.add('hidden');

  initReviewsBin();

  document.querySelectorAll('.filter-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderEvents();
      closePanel();
    });
  });

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

  document.querySelectorAll('.star').forEach(function(s) {
    s.addEventListener('click', function() {
      reviewRating = parseInt(s.dataset.v);
      document.querySelectorAll('.star').forEach(function(st, i) {
        st.classList.toggle('active', i < reviewRating);
      });
    });
  });

  document.getElementById('review-cancel').addEventListener('click', closeReviewModal);
  document.getElementById('review-submit').addEventListener('click', submitReview);
  document.getElementById('review-photo').addEventListener('change', function(e) {
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      window._reviewPhoto = ev.target.result;
      document.getElementById('photo-preview').innerHTML =
        '<img src="' + ev.target.result + '" style="width:80px;height:80px;object-fit:cover;border-radius:8px"/>';
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('btn-refresh').addEventListener('click', function() { showToast('Actualitzat!'); });
  document.getElementById('btn-locate').addEventListener('click', getLocation);
  getLocation();
});

function initReviewsBin() {
  var today = new Date().toISOString().split('T')[0];
  var storedDate = localStorage.getItem('reviews_date');
  var storedBinId = localStorage.getItem('reviews_bin_id');

  if (storedDate === today && storedBinId) {
    reviewsBinId = storedBinId;
    return;
  }

  fetch(JSONBIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': JSONBIN_KEY,
      'X-Bin-Name': 'pulsebcn-' + today,
      'X-Bin-Private': 'false'
    },
    body: JSON.stringify({ date: today, reviews: {} })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    reviewsBinId = d.metadata.id;
    localStorage.setItem('reviews_bin_id', reviewsBinId);
    localStorage.setItem('reviews_date', today);
  })
  .catch(function(e) { console.error('Bin init error:', e); });
}

function saveReview(eventId, rating, text, photo) {
  if (!reviewsBinId) { showToast('Error connectant. Torna-ho a provar.'); return; }
  getReviews(eventId, function(existing) {
    existing.push({
      rating: rating,
      text: text,
      photo: photo || null,
      timestamp: Date.now()
    });
    fetch(JSONBIN_URL + '/' + reviewsBinId, {
      method: 'GET',
      headers: { 'X-Master-Key': JSONBIN_KEY }
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      var data = d.record || { reviews: {} };
      data.reviews = data.reviews || {};
      data.reviews[eventId] = existing;
      return fetch(JSONBIN_URL + '/' + reviewsBinId, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_KEY
        },
        body: JSON.stringify(data)
      });
    })
    .then(function() { console.log('Review saved!'); })
    .catch(function(e) { console.error('Save error:', e); });
  });
}

function getReviews(eventId, callback) {
  if (!reviewsBinId) { callback([]); return; }
  fetch(JSONBIN_URL + '/' + reviewsBinId + '/latest', {
    headers: { 'X-Master-Key': JSONBIN_KEY }
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    var data = d.record || { reviews: {} };
    callback((data.reviews && data.reviews[eventId]) || []);
  })
  .catch(function() { callback([]); });
}

function submitReview() {
  if (!reviewRating) { showToast('Selecciona una puntuacio'); return; }
  var text = document.getElementById('review-text').value.trim();
  var evtId = window._currentEvtId;
  if (!evtId) return;
  saveReview(evtId, reviewRating, text, window._reviewPhoto || null);
  showToast('Ressenya publicada! 🎉');
  closeReviewModal();
  var evt = null;
  for (var i = 0; i < allEvents.length; i++) {
    if (allEvents[i].id === evtId) { evt = allEvents[i]; break; }
  }
  if (evt) setTimeout(function(){ openPanel(evt); }, 2000);
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
    var badge = evt.free ? '<div style="background:#00d084;color:#000;font-size:8px;padding:1px 4px;border-radius:4px;font-weight:bold;margin-top:2px">FREE</div>' : '';
    var html = '<div style="text-align:center"><div style="background:' + color + ';width:40px;height:40px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:inline-flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(0,0,0,0.5)"><span style="transform:rotate(45deg);font-size:18px">' + emoji + '</span></div>' + badge + '</div>';
    var icon = L.divIcon({html: html, className: '', iconSize: [40,52], iconAnchor: [20,50]});
    var marker = L.marker([evt.lat, evt.lng], {icon: icon}).addTo(map);
    marker.on('click', function() { openPanel(evt); });
    markers.push(marker);
  });
  document.getElementById('event-count').textContent = filteredEvents.length + ' events';
  renderList();
}

function openPanel(evt) {
  window._currentEvtId = evt.id;
  var panel = document.getElementById('event-panel');
  var content = document.getElementById('panel-content');
  content.innerHTML = '<div style="text-align:center;padding:20px;color:#9a9ab0">Carregant ressenyes...</div>';
  panel.classList.remove('hidden');
  setTimeout(function() { panel.classList.add('open'); }, 10);
  map.flyTo([evt.lat, evt.lng], 16, {duration: 0.8});

  getReviews(evt.id, function(reviews) {
    var avgHtml = '';
    if (reviews.length > 0) {
      var avg = reviews.reduce(function(s,r){ return s + r.rating; }, 0) / reviews.length;
      avgHtml = '<div style="color:#f59e0b;margin-bottom:8px">★ ' + avg.toFixed(1) +
        ' <span style="color:#9a9ab0;font-size:12px">(' + reviews.length + ' ressenya' + (reviews.length > 1 ? 'es' : '') + ')</span></div>';
    }
    var priceTag = evt.free ? '<span class="tag tag-free">Gratuit</span>' : '<span class="tag tag-paid">' + (evt.price || 'De pagament') + '</span>';
    var familyTag = evt.family ? '<span class="tag tag-family">Familia</span>' : '';
    content.innerHTML =
      '<div class="event-title">' + evt.title + '</div>' +
      avgHtml +
      '<div class="event-meta">' + priceTag + familyTag +
        '<span class="tag tag-category">' + evt.category + '</span>' +
        '<span class="tag tag-category">' + (evt.time||'') + '</span>' +
      '</div>' +
      '<div class="event-location">📍 <strong>' + evt.location + '</strong></div>' +
      '<p class="event-desc">' + evt.description + '</p>' +
      '<div class="panel-actions">' +
        '<button class="btn-primary" onclick="if(window._startAR)window._startAR(\'' + evt.id + '\')">📷 AR</button>' +
        '<button class="btn-secondary" onclick="window.open(\'https://www.google.com/maps/dir/?api=1&destination=' + evt.lat + ',' + evt.lng + '\')">🗺️ Maps</button>' +
      '</div>' +
      '<div class="panel-actions" style="margin-top:8px">' +
        '<button class="btn-secondary" onclick="openReviewModal()">Escriure ressenya</button>' +
      '</div>' +
      '<div class="reviews-section">' +
        '<div class="reviews-title">Ressenyes d\'avui (' + reviews.length + ')</div>' +
        renderReviews(reviews) +
      '</div>';
  });
}

function closePanel() {
  var panel = document.getElementById('event-panel');
  panel.classList.remove('open');
  setTimeout(function() { panel.classList.add('hidden'); }, 350);
}

function renderReviews(reviews) {
  if (!reviews.length) return '<p class="no-reviews">Sigues el primer avui!</p>';
  var html = '';
  reviews.forEach(function(r) {
    var stars = '';
    for (var i = 1; i <= 5; i++) stars += i <= r.rating ? '★' : '☆';
    var time = new Date(r.timestamp).toLocaleTimeString('ca', {hour:'2-digit', minute:'2-digit'});
    html += '<div class="review-item">' +
      '<div class="review-header"><span class="review-stars">' + stars + '</span><span class="review-time">' + time + '</span></div>' +
      (r.text ? '<div class="review-text">' + r.text + '</div>' : '') +
      (r.photo ? '<img class="review-photo" src="' + r.photo + '" alt="foto"/>' : '') +
      '</div>';
  });
  return html;
}

function renderList() {
  var html = '';
  filteredEvents.forEach(function(evt) {
    html += '<div class="list-item" onclick="flyToEvent(\'' + evt.id + '\')">' +
      '<div class="list-item-title">' + (ICONS[evt.category]||'📍') + ' ' + evt.title + '</div>' +
      '<div class="list-item-sub"><span>' + (evt.time||'') + '</span>' +
      (evt.free ? '<span class="dot-free"> Gratuit</span>' : '') + '</div></div>';
  });
  document.getElementById('list-items').innerHTML = html;
}

function flyToEvent(id) {
  for (var i = 0; i < filteredEvents.length; i++) {
    if (filteredEvents[i].id === id) {
      var evt = filteredEvents[i];
      map.flyTo([evt.lat, evt.lng], 16, {duration: 0.8});
      setTimeout(function(){ openPanel(evt); }, 500);
      var list = document.getElementById('event-list');
      list.classList.remove('open');
      setTimeout(function() { list.classList.add('hidden'); }, 300);
      return;
    }
  }
}

function getLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(function(pos) {
    window.userLat = pos.coords.latitude;
    window.userLng = pos.coords.longitude;
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.circleMarker([window.userLat, window.userLng], {
      radius: 10, fillColor: '#3b82f6', fillOpacity: 0.9, color: '#fff', weight: 3
    }).addTo(map).bindPopup('Ets aqui');
    map.flyTo([window.userLat, window.userLng], 14);
  }, null, {enableHighAccuracy: true});
}

function getFallback() {
  return [
    {id:'e1',title:'Mercat de la Boqueria',category:'food',lat:41.3816,lng:2.1726,free:true,family:true,time:'08:00-20:30',location:'La Rambla 91',description:'El mercat mes emblematic de Barcelona.'},
    {id:'e2',title:'Concert Placa del Rei',category:'music',lat:41.3841,lng:2.1769,free:true,family:false,time:'19:00-21:00',location:'Placa del Rei',description:'Cicle de musica en viu al barri gotic.'},
    {id:'e3',title:'Exposicio Museu Picasso',category:'exhibition',lat:41.3851,lng:2.1812,free:false,family:true,time:'10:00-19:00',location:'Carrer Montcada 15',description:'Formacio artistica del geni de Malaga.',price:'12 euros'},
    {id:'e4',title:'Cinema Verdi - Marato',category:'cinema',lat:41.3968,lng:2.1614,free:false,family:false,time:'16:00-00:00',location:'Cinema Verdi Gracia',description:'4 pellicules de terror i fantasia.',price:'22 euros'},
    {id:'e5',title:'Manifestacio Llengua',category:'protest',lat:41.3909,lng:2.1698,free:true,family:true,time:'18:00',location:'Arc de Triomf',description:'Concentracio per la llengua catalana.'},
    {id:'e6',title:'Taller Robotica Infantil',category:'culture',lat:41.4000,lng:2.1900,free:true,family:true,time:'10:00-13:00',location:'Biblioteca Sagrada Familia',description:'Tallers per a nens de 8 a 12 anys.'},
    {id:'e7',title:'Mercat Vintage Raval',category:'food',lat:41.3795,lng:2.1680,free:true,family:true,time:'10:00-18:00',location:'Placa dels Angels',description:'Mercat de productes vintage i curiosos.'},
    {id:'e8',title:'Visita Guiada Modernisme',category:'culture',lat:41.3917,lng:2.1649,free:false,family:false,time:'10:30 i 16:30',location:'Placa Catalunya',description:'Edificis modernistes fora dels circuits.',price:'15 euros'}
  ];
}

function openReviewModal() { document.getElementById('review-modal').classList.remove('hidden'); }
function closeReviewModal() {
  document.getElementById('review-modal').classList.add('hidden');
  document.getElementById('review-text').value = '';
  document.getElementById('photo-preview').innerHTML = '';
  reviewRating = 0;
  window._reviewPhoto = null;
  document.querySelectorAll('.star').forEach(function(s) { s.classList.remove('active'); });
}
function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(function() { t.classList.add('hidden'); }, 3000);
}

window.openReviewModal = openReviewModal;
window.flyToEvent = flyToEvent;
