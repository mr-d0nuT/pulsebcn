const WORKER_URL = '';
const BCN_CENTER = [41.3851, 2.1734];
const TODAY = new Date().toISOString().split('T')[0];

let map, userMarker, userLat, userLng;
let allEvents = [];
let filteredEvents = [];
let markers = [];
let activeFilter = 'all';
let activeEventId = null;
let reviewRating = 0;
let reviewPhotoB64 = null;

const CATEGORY_ICONS = {
  culture:'🎭', music:'🎵', sport:'⚽', cinema:'🎬',
  protest:'📣', family:'👨‍👩‍👧', exhibition:'🖼️', food:'🍽️',
  theatre:'🎪', conference:'🎤', default:'📍'
};
const CATEGORY_COLORS = {
  culture:'#a855f7', music:'#3b82f6', sport:'#22c55e', cinema:'#f59e0b',
  protest:'#ef4444', family:'#06b6d4', exhibition:'#8b5cf6',
  food:'#f97316', theatre:'#ec4899', default:'#e94560'
};

document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  initFilters();
  initListToggle();
  initReviewModal();
  await loadEvents();
  hideLoading();
  locateUser();
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

async function loadEvents() {
  allEvents = getFallbackEvents();
  window.allEvents = allEvents;
  renderEvents();
}

function getFallbackEvents() {
  return [
    { id:'evt-001', title:'Mercat de la Boqueria', category:'food', lat:41.3816, lng:2.1726, free:true, family:true, time:'08:00–20:30', location:'La Rambla, 91', description:'El mercat més emblemàtic de Barcelona, ple de productes frescos i vida.', url:'https://www.boqueria.barcelona' },
    { id:'evt-002', title:'Concert Plaça del Rei', category:'music', lat:41.3841, lng:2.1769, free:true, family:false, time:'19:00–21:00', location:'Plaça del Rei, s/n', description:'Cicle de música en viu al cor del barri gòtic.', url:'https://guia.barcelona.cat' },
    { id:'evt-003', title:'Exposició Museu Picasso', category:'exhibition', lat:41.3851, lng:2.1812, free:false, family:true, time:'10:00–19:00', location:'Carrer de Montcada, 15-23', description:"Una mirada als anys clau en la formació artística del geni de Màlaga.", price:'12€ / 7€ reduïda', url:'https://museupicasso.bcn.cat' },
    { id:'evt-004', title:'Marató Cinema Fantàstic', category:'cinema', lat:41.3968, lng:2.1614, free:false, family:false, time:'16:00–00:00', location:'Cinema Verdi, Gràcia', description:'Sessió especial amb 4 pel·lícules de terror i fantasia.', price:'22€', url:'https://cines-verdi.com' },
    { id:'evt-005', title:'Manifestació Llengua Catalana', category:'protest', lat:41.3909, lng:2.1698, free:true, family:true, time:'18:00', location:'Arc de Triomf', description:'Concentració i manifestació convocada per entitats culturals.', url:'#' },
    { id:'evt-006', title:'Taller Robòtica Infantil', category:'culture', lat:41.4000, lng:2.1900, free:true, family:true, time:'10:00–13:00', location:'Biblioteca Sagrada Família', description:'Tallers gratuïts per a nens de 8 a 12 anys.', url:'https://biblioteques.barcelona' },
    { id:'evt-007', title:'Mercat Vintage El Raval', category:'food', lat:41.3795, lng:2.1680, free:true, family:true, time:'10:00–18:00', location:"Plaça dels Àngels, El Raval", description:'Mercat de productes vintage i objectes curiosos.', url:'#' },
    { id:'evt-008', title:'Visita Guiada Modernisme', category:'culture', lat:41.3917, lng:2.1649, free:false, family:false, time:'10:30 i 16:30', location:"Sortida: Plaça Catalunya", description:'Descobreix edificis modernistes fora dels circuits turístics.', price:'15€', url:'https://barcelona.cat/turisme' }
  ];
}

function renderEvents() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  filteredEvents = allEvents.filter(evt => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'free') return evt.free;
    if (activeFilter === 'family') return evt.family;
    return evt.category === activeFilter;
  });
  filteredEvents.forEach(evt => {
    const icon = createIcon(evt);
    const marker = L.marker([evt.lat, evt.lng], { icon })
      .addTo(map).on('click', () => openEventPanel(evt));
    markers.push(marker);
  });
  updateCount();
  renderList();
}

function createIcon(evt) {
  const emoji = CATEGORY_ICONS[evt.category] || CATEGORY_ICONS.default;
  const color = CATEGORY_COLORS[evt.category] || CATEGORY_COLORS.default;
  const badges = [];
  if (evt.free) badges.push(`<span style="background:#00d084;color:#000;font-size:8px;padding:1px 4px;border-radius:4px;font-weight:700">FREE</span>`);
  if (evt.family) badges.push(`<span style="font-size:10px">👨‍👩‍👧</span>`);
  const html = `
    <div style="background:${color};width:40px;height:40px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(0,0,0,0.5);border:2px solid rgba(255,255,255,0.3);">
      <span style="transform:rotate(45deg);font-size:18px">${emoji}</span>
    </div>
    <div style="display:flex;gap:2px;justify-content:center;margin-top:2px">${badges.join('')}</div>`;
  return L.divIcon({ html, className:'custom-marker', iconSize:[40,50], iconAnchor:[20,50], popupAnchor:[0,-52] });
}

async function openEventPanel(evt) {
  activeEventId = evt.id;
  const panel = document.getElementById('event-panel');
  const content = document.getElementById('panel-content');
  const reviews = [];
  content.innerHTML = `
    <div class="event-title">${evt.title}</div>
    <div class="event-meta">
      ${evt.free ? '<span class="tag tag-free">🆓 Gratuït</span>' : `<span class="tag tag-paid">💶 ${evt.price||'De pagament'}</span>`}
      ${evt.family ? '<span class="tag tag-family">👨‍👩‍👧 Família</span>' : ''}
      <span class="tag tag-category">${evt.category}</span>
      <span class="tag tag-category">🕐 ${evt.time||'Consultar'}</span>
    </div>
    <div class="event-location">📍 <strong>${evt.location}</strong></div>
    <p class="event-desc">${evt.description}</p>
    <div class="panel-actions">
      <button class="btn-primary" onclick="window._startAR && window._startAR('${evt.id}')">📷 Navegar en AR</button>
      <button class="btn-secondary" onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${evt.lat},${evt.lng}')">🗺️ Maps</button>
    </div>
    <div class="panel-actions" style="margin-top:8px">
      <button class="btn-secondary" onclick="openReviewModal()">✍️ Ressenya</button>
      ${evt.url && evt.url!=='#' ? `<button class="btn-secondary" onclick="window.open('${evt.url}')">🔗 Més info</button>` : ''}
    </div>
    <div class="reviews-section">
      <div class="reviews-title">💬 Ressenyes d'avui</div>
      <p class="no-reviews">Sigues el primer en deixar una ressenya avui! 🌟</p>
    </div>`;
  panel.classList.remove('hidden');
  requestAnimationFrame(() => panel.classList.add('open'));
  map.flyTo([evt.lat, evt.lng], 16, { duration: 0.8 });
}

function closePanel() {
  const panel = document.getElementById('event-panel');
  panel.classList.remove('open');
  setTimeout(() => panel.classList.add('hidden'), 350);
  activeEventId = null;
}

function initReviewModal() {
  document.querySelectorAll('.star').forEach(s => s.addEventListener('click', () => {
    reviewRating = +s.dataset.v;
    document.querySelectorAll('.star').forEach((st,i) => st.classList.toggle('active', i < reviewRating));
  }));
  document.getElementById('review-photo').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      reviewPhotoB64 = ev.target.result;
      document.getElementById('photo-preview').innerHTML = `<img src="${reviewPhotoB64}" alt="preview"/>`;
    };
    reader.readAsDataURL(file);
  });
  document.getElementById('review-cancel').addEventListener('click', closeReviewModal);
  document.getElementById('review-submit').addEventListener('click', () => {
    if (!reviewRating) return showToast('Selecciona una puntuació ⭐');
    showToast('Ressenya publicada! 🎉');
    closeReviewModal();
  });
}

function openReviewModal() { document.getElementById('review-modal').classList.remove('hidden'); }
function closeReviewModal() {
  document.getElementById('review-modal').classList.add('hidden');
  document.getElementById('review-text').value = '';
  document.getElementById('photo-preview').innerHTML = '';
  reviewRating = 0; reviewPhotoB64 = null;
  document.querySelectorAll('.star').forEach(s => s.classList.remove('active'));
}

function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderEvents(); closePanel();
    });
  });
}

function initListToggle() {
  const list = document.getElementById('event-list');
  document.getElementById('btn-list-toggle').addEventListener('click', () => {
    list.classList.remove('hidden');
    requestAnimationFrame(() => list.classList.add('open'));
  });
  document.getElementById('btn-list-close').addEventListener('click', () => {
    list.classList.remove('open');
    setTimeout(() => list.classList.add('hidden'), 300);
  });
}

function renderList() {
  document.getElementById('list-items').innerHTML = filteredEvents.map(evt => `
    <div class="list-item" onclick="flyToEvent('${evt.id}')">
      <div class="list-item-title">${CATEGORY_ICONS[evt.category]||'📍'} ${evt.title}</div>
      <div class="list-item-sub">
        <span>${evt.time||''}</span>
        ${evt.free ? '<span class="dot-free">● Gratuït</span>' : ''}
        ${evt.family ? '<span class="dot-family">● Família</span>' : ''}
      </div>
    </div>`).join('');
}

function flyToEvent(id) {
  const evt = filteredEvents.find(e => e.id === id); if (!evt) return;
  map.flyTo([evt.lat, evt.lng], 16, { duration: 0.8 });
  setTimeout(() => openEventPanel(evt), 500);
  const list = document.getElementById('event-list');
  list.classList.remove('open');
  setTimeout(() => list.classList.add('hidden'), 300);
}

function locateUser() {
  document.getElementById('btn-locate').addEventListener('click', getUserLocation);
  getUserLocation();
}

function getUserLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(pos => {
    userLat = pos.coords.latitude; userLng = pos.coords.longitude;
    window.userLat = userLat; window.userLng = userLng;
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.circleMarker([userLat, userLng], {
      radius:10, fillColor:'#3b82f6', fillOpacity:0.9, color:'#fff', weight:3
    }).addTo(map).bindPopup('Ets aquí 📍');
    map.flyTo([userLat, userLng], 14);
  }, null, { enableHighAccuracy: true });
}

function updateCount() {
  document.getElementById('event-count').textContent =
    `${filteredEvents.length} event${filteredEvents.length!==1?'s':''}`;
}
function hideLoading() {
  document.getElementById('loading-overlay').classList.add('hidden');
}
function showToast(msg, dur=3000) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), dur);
}

document.getElementById('btn-refresh').addEventListener('click', async () => {
  showToast('🔄 Actualitzant…');
  loadEvents();
  showToast('✅ Actualitzat!');
});

import('./ar.js').then(ar => { window._startAR = ar.startAR; });

window.openEventPanel = openEventPanel;
window.flyToEvent = flyToEvent;
window.openReviewModal = openReviewModal;
