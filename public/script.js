/* ============================================================
   Family Nearby Helper — script.js
   Features: GPS auto-detect, text/pincode input, Leaflet map
   view, suggestion dropdown, favorites, CSV download.
   ============================================================ */

// ── DOM refs ────────────────────────────────────────────────
const form = document.getElementById('searchForm');
const pincodeInput = document.getElementById('pincodeInput');
const suggestionsList = document.getElementById('suggestionsList');
const categorySelect = document.getElementById('categorySelect');
const radiusSelect = document.getElementById('radiusSelect');
const phoneOnlyToggle = document.getElementById('phoneOnlyToggle');
const homeDeliveryToggle = document.getElementById('homeDeliveryToggle');
const openNowToggle = document.getElementById('openNowToggle');
const downloadBtn = document.getElementById('downloadBtn');
const resultsContainer = document.getElementById('resultsContainer');
const statusMessage = document.getElementById('statusMessage');
const locationText = document.getElementById('locationText');
const precisionText = document.getElementById('precisionText');
const resultCount = document.getElementById('resultCount');
const apiMode = document.getElementById('apiMode');
const largeTextBtn = document.getElementById('largeTextBtn');
const langToggleBtn = document.getElementById('langToggleBtn');
const voiceSearchBtn = document.getElementById('voiceSearchBtn');
const pageTitleLocation = document.getElementById('pageTitleLocation');
const tabs = document.querySelectorAll('.tab-btn');
const listViewBtn = document.getElementById('listViewBtn');
const mapViewBtn = document.getElementById('mapViewBtn');
const listViewEl = document.getElementById('listView');
const mapViewEl = document.getElementById('mapView');
const gpsStatusBar = document.getElementById('gpsStatusBar');
const gpsStatusIcon = document.getElementById('gpsStatusIcon');
const gpsStatusText = document.getElementById('gpsStatusText');
const detectLocationBtn = document.getElementById('detectLocationBtn');
const textInputWrap = document.getElementById('textInputWrap');
const gpsInputWrap = document.getElementById('gpsInputWrap');
const gpsLocationName = document.getElementById('gpsLocationName');
const mapSidebarHint = document.querySelector('.map-sidebar-hint');
const mapPlaceDetail = document.getElementById('mapPlaceDetail');
const footerYear = document.getElementById('footerYear');

// ── State ───────────────────────────────────────────────────
let currentResults = [];
let currentCenter = null;
let suggestionTimer = null;
let currentTab = 'all';
let currentView = 'list';
let isLargeText = false;
let isHindi = false;
let recognition;
let favorites = [];
let locationMode = 'text';   // 'text' | 'gps'
let gpsCoords = null;     // { lat, lng } when GPS detected
let leafletMap = null;
let mapMarkers = [];

// ── Category config ─────────────────────────────────────────
const categoryConfig = {
  all: { icon: '🗺️', color: 'blue', label: 'All', labelHindi: 'सभी' },
  hospital: { icon: '🏥', color: 'red', label: 'Hospital', labelHindi: 'अस्पताल' },
  medical: { icon: '🩺', color: 'red', label: 'Medical', labelHindi: 'मेडिकल' },
  doctor: { icon: '🩺', color: 'red', label: 'Doctor', labelHindi: 'डॉक्टर' },
  dentist: { icon: '🦷', color: 'red', label: 'Dentist', labelHindi: 'दांत का डॉक्टर' },
  clinic: { icon: '🩹', color: 'red', label: 'Clinic', labelHindi: 'क्लिनिक' },
  pharmacy: { icon: '💊', color: 'green', label: 'Pharmacy', labelHindi: 'दवा दुकान' },
  grocery: { icon: '🛒', color: 'orange', label: 'Grocery', labelHindi: 'किराना' },
  kirana: { icon: '🛍️', color: 'orange', label: 'Kirana', labelHindi: 'किराना' },
  supermarket: { icon: '🏬', color: 'orange', label: 'Supermarket', labelHindi: 'सुपरमार्केट' },
  food: { icon: '🍽️', color: 'blue', label: 'Food', labelHindi: 'भोजन' },
  restaurant: { icon: '🍜', color: 'blue', label: 'Restaurant', labelHindi: 'रेस्टोरेंट' },
  cafe: { icon: '☕', color: 'blue', label: 'Cafe', labelHindi: 'कैफे' },
  bakery: { icon: '🥐', color: 'blue', label: 'Bakery', labelHindi: 'बेकरी' },
  clothing: { icon: '👕', color: 'blue', label: 'Clothing', labelHindi: 'कपड़े' },
  footwear: { icon: '👟', color: 'blue', label: 'Footwear', labelHindi: 'जूते' },
  electronics: { icon: '📱', color: 'blue', label: 'Electronics', labelHindi: 'इलेक्ट्रॉनिक्स' },
  atm: { icon: '🏧', color: 'blue', label: 'ATM', labelHindi: 'ATM' },
  bank: { icon: '🏦', color: 'blue', label: 'Bank', labelHindi: 'बैंक' },
  petrol: { icon: '⛽', color: 'blue', label: 'Petrol', labelHindi: 'पेट्रोल' },
  salon: { icon: '💇', color: 'blue', label: 'Salon', labelHindi: 'सैलून' },
  laundry: { icon: '🧺', color: 'blue', label: 'Laundry', labelHindi: 'धुलाई' },
  stationery: { icon: '📚', color: 'blue', label: 'Stationery', labelHindi: 'स्टेशनरी' },
  school: { icon: '🏫', color: 'blue', label: 'School', labelHindi: 'स्कूल' },
};

// ── Helpers ─────────────────────────────────────────────────
function setStatus(text, tone = 'info') {
  statusMessage.textContent = text;
  statusMessage.style.color = tone === 'error' ? '#d63939' : '#62708a';
}

function toRad(v) { return (v * Math.PI) / 180; }

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(d) {
  return d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`;
}

function computeBBoxCenter(bbox) {
  if (!bbox || bbox.length !== 4) return null;
  const [minLat, maxLat, minLon, maxLon] = bbox;
  return {
    lat: (parseFloat(minLat) + parseFloat(maxLat)) / 2,
    lng: (parseFloat(minLon) + parseFloat(maxLon)) / 2
  };
}

function getPrecisionLabel(data) {
  if (data?.precision && data.precision !== 'fallback-area') return data.precision;
  if (data?.bbox) return 'bbox-centered';
  return 'area estimate';
}

function escapeHtml(text) {
  return String(text || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getCategoryTag(category) {
  return categoryConfig[category] || { icon: '📍', color: 'blue', label: category };
}

// ── Favorites ───────────────────────────────────────────────
function saveFavorites() {
  localStorage.setItem('familyNearbyFavorites', JSON.stringify(favorites));
}

function loadFavorites() {
  try { return JSON.parse(localStorage.getItem('familyNearbyFavorites') || '[]'); }
  catch { return []; }
}

// ── State persistence ────────────────────────────────────────
function saveSearchState() {
  const state = {
    query: pincodeInput.value.trim(),
    category: categorySelect.value,
    radius: radiusSelect.value,
    phoneOnly: phoneOnlyToggle.checked,
    homeDelivery: homeDeliveryToggle.checked,
    openNow: openNowToggle.checked,
    locationMode,
    gpsCoords,
  };
  localStorage.setItem('familyNearbyLastSearch', JSON.stringify(state));
}

function loadSearchState() {
  try { return JSON.parse(localStorage.getItem('familyNearbyLastSearch') || 'null'); }
  catch { return null; }
}

// ── Location Mode ────────────────────────────────────────────
const locModeBtns = document.querySelectorAll('.loc-mode-btn');

function setLocationMode(mode) {
  locationMode = mode;
  locModeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));

  if (mode === 'text') {
    textInputWrap.style.display = '';
    gpsInputWrap.style.display = 'none';
    gpsStatusBar.style.display = 'none';
  } else {
    textInputWrap.style.display = 'none';
    gpsInputWrap.style.display = '';
    gpsStatusBar.style.display = '';
  }
}

locModeBtns.forEach(btn => {
  btn.addEventListener('click', () => setLocationMode(btn.dataset.mode));
});

// ── GPS Detection ────────────────────────────────────────────
function setGpsStatus(icon, text, loading = false) {
  gpsStatusIcon.textContent = icon;
  gpsStatusText.textContent = text;
  detectLocationBtn.disabled = loading;
  detectLocationBtn.textContent = loading ? 'Detecting…' : 'Detect My Location';
}

async function reverseGeocode(lat, lng) {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await resp.json();
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

detectLocationBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    setGpsStatus('❌', 'Geolocation is not supported by your browser.');
    return;
  }
  setGpsStatus('⏳', 'Detecting your location…', true);

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      gpsCoords = { lat, lng };

      setGpsStatus('✅', 'Location detected! Fetching address…', true);
      const name = await reverseGeocode(lat, lng);
      gpsLocationName.textContent = name;
      setGpsStatus('✅', `Accuracy: ~${Math.round(accuracy)} m. Ready to search.`);

      // Auto-search
      await searchNearby();
    },
    (err) => {
      const msgs = {
        1: 'Permission denied. Please allow location access in your browser.',
        2: 'Position unavailable. Try typing your location instead.',
        3: 'Location request timed out. Please try again.',
      };
      setGpsStatus('❌', msgs[err.code] || 'Could not detect location.');
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  );
});

// ── Suggestions ──────────────────────────────────────────────
function showSuggestions(items) {
  suggestionsList.innerHTML = '';
  if (!items.length) { suggestionsList.style.display = 'none'; return; }

  items.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="sug-icon">📍</span>${escapeHtml(item.value)}`;
    li.addEventListener('click', () => {
      pincodeInput.value = item.value;
      suggestionsList.style.display = 'none';
      searchNearby();
    });
    suggestionsList.appendChild(li);
  });
  suggestionsList.style.display = 'block';
}

async function fetchSuggestions() {
  const query = pincodeInput.value.trim();
  if (!query || query.length < 3) { suggestionsList.style.display = 'none'; return; }

  // Try local Nominatim suggestions for Indian locations
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=6&addressdetails=0`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await resp.json();
    const suggestions = data.map(d => ({ value: d.display_name }));
    showSuggestions(suggestions);
  } catch {
    // Fallback to app API if available
    try {
      const resp2 = await fetch(`/api/suggest?query=${encodeURIComponent(query)}`);
      const data2 = await resp2.json();
      showSuggestions(data2.suggestions || []);
    } catch {
      suggestionsList.style.display = 'none';
    }
  }
}

pincodeInput.addEventListener('input', () => {
  clearTimeout(suggestionTimer);
  suggestionTimer = setTimeout(fetchSuggestions, 280);
});

pincodeInput.addEventListener('focus', fetchSuggestions);

document.addEventListener('click', e => {
  if (!e.target.closest('.suggestion-wrap')) {
    suggestionsList.style.display = 'none';
  }
});

// ── Filters & Rendering ──────────────────────────────────────
function applyFilters() {
  const phoneOnly = phoneOnlyToggle.checked;
  const deliveryOnly = homeDeliveryToggle.checked;
  const openOnly = openNowToggle.checked;
  const favSet = new Set(favorites);

  const radiusKm = Number(radiusSelect.value) / 1000;

  let filtered = currentResults.filter(p =>
    p.distanceKm <= radiusKm &&
    (!phoneOnly || !!p.phone) &&
    (!deliveryOnly || !!p.delivery) &&
    (!openOnly || p.openNow === true) &&
    (currentTab !== 'favorites' || favSet.has(p.placeId))
  );

  filtered.sort((a, b) => {
    if (a.openNow !== b.openNow) return Number(b.openNow) - Number(a.openNow);
    return a.distanceKm - b.distanceKm;
  });

  return filtered;
}

function renderResults() {
  const filtered = applyFilters();
  resultsContainer.innerHTML = '';

  if (!filtered.length) {
    setStatus('No matching places found. Try removing a filter.', 'error');
    resultCount.textContent = '0 found';
    downloadBtn.disabled = true;
    if (currentView === 'map') clearMap();
    return;
  }

  resultCount.textContent = `${filtered.length} found`;
  downloadBtn.disabled = false;
  setStatus(`Showing ${filtered.length} ${getCategoryTag(categorySelect.value).label} locations.`);

  filtered.forEach(place => {
    const tag = getCategoryTag(place.category || categorySelect.value);
    const isFav = favorites.includes(place.placeId);
    const rating = place.rating ? Number(place.rating) : 0;
    const rCls = rating >= 4.5 ? 'good' : rating >= 3.5 ? 'ok' : 'bad';
    const openCls = place.openNow === true ? 'green' : place.openNow === false ? 'red' : 'orange';
    const openLabel = place.openNow === true ? 'Open now' : place.openNow === false ? 'Closed' : 'Hours unavailable';

    const card = document.createElement('article');
    card.className = 'result-card';
    card.innerHTML = `
      <div class="result-card-header">
        <div>
          <span class="badge ${tag.color}">${tag.icon} ${tag.label}</span>
          <h3>${escapeHtml(place.name)}</h3>
        </div>
        <button class="favorite-btn" data-favorite="${escapeHtml(place.placeId)}">${isFav ? '★' : '☆'}</button>
      </div>
      <div class="result-card-body">
        <p class="result-address">${escapeHtml(place.address)}</p>
        <div class="result-meta">
          <span class="rating-pill ${rCls}">${place.rating ? `${place.rating} ★` : 'No rating'}</span>
          <span class="badge ${openCls}">${openLabel}</span>
        </div>
        <p class="distance-line"><strong>Distance:</strong> ${formatDistance(place.distanceKm)}</p>
      </div>
      <div class="card-actions">
        ${place.phone ? `<a class="primary" href="tel:${escapeHtml(place.phone)}">📞 Call</a>` : ''}
        ${place.website ? `<a href="${escapeHtml(place.website)}" target="_blank">🌐 Website</a>` : ''}
        ${place.phone ? `<a href="https://wa.me/${encodeURIComponent(place.phone.replace(/[^0-9]/g, ''))}" target="_blank">💬 WhatsApp</a>` : ''}
        ${place.lat && place.lng ? `<a href="https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}" target="_blank">🗺️ Maps</a>` : ''}
        <button type="button" data-copy="${escapeHtml(place.name)}">${translations[isHindi ? 'hi' : 'en'].copyName}</button>
        ${place.phone ? `<button type="button" data-copy-phone="${escapeHtml(place.phone)}">${translations[isHindi ? 'hi' : 'en'].copyPhone}</button>` : ''}
      </div>
    `;

    card.querySelector('[data-copy]').addEventListener('click', () => {
      navigator.clipboard.writeText(place.name).then(() => setStatus(`Copied: ${place.name}`));
    });

    const phBtn = card.querySelector('[data-copy-phone]');
    if (phBtn) {
      phBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(place.phone).then(() => setStatus(`Copied phone: ${place.phone}`));
      });
    }

    card.querySelector('[data-favorite]').addEventListener('click', () => {
      const id = place.placeId;
      favorites = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
      saveFavorites();
      renderResults();
    });

    resultsContainer.appendChild(card);
  });

  if (currentView === 'map') renderMap(filtered);
}

// ── Map View ─────────────────────────────────────────────────
function initMap(center) {
  if (leafletMap) { leafletMap.remove(); leafletMap = null; }

  leafletMap = L.map('mapContainer').setView([center.lat, center.lng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(leafletMap);

  // Center marker
  L.circleMarker([center.lat, center.lng], {
    radius: 8, color: '#0f6fff', fillColor: '#0f6fff', fillOpacity: 0.9, weight: 2
  }).addTo(leafletMap).bindPopup('<div class="map-popup-inner"><strong>📍 Search Center</strong></div>');
}

function clearMap() {
  mapMarkers.forEach(m => m.remove());
  mapMarkers = [];
}

function renderMap(places) {
  if (!leafletMap || !currentCenter) return;
  clearMap();

  // Reset sidebar
  mapPlaceDetail.style.display = 'none';
  mapPlaceDetail.innerHTML = '';
  mapSidebarHint.style.display = '';

  const bounds = [[currentCenter.lat, currentCenter.lng]];

  places.forEach((place) => {
    if (!place.lat || !place.lng) return;

    const tag = getCategoryTag(place.category || categorySelect.value);

    const icon = L.divIcon({
      className: '',
      html: `<div style="
        background:#0f6fff;color:#fff;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        width:32px;height:32px;
        display:flex;align-items:center;justify-content:center;
        font-size:14px;border:2px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
        cursor:pointer;
      "><span style="transform:rotate(45deg)">${tag.icon}</span></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -36],
    });

    // Snapshot the place data into a local const so closure is stable
    const placeData = { ...place };

    const marker = L.marker([placeData.lat, placeData.lng], { icon })
      .addTo(leafletMap);

    marker.bindPopup(`
      <div class="map-popup-inner">
        <strong>${escapeHtml(placeData.name)}</strong><br/>
        <span>${tag.icon} ${tag.label} &nbsp;·&nbsp; ${formatDistance(placeData.distanceKm)} away</span>
      </div>
    `);

    // Use both click and popupopen so detail shows reliably
    marker.on('click', function () {
      showMapPlaceDetail(placeData);
    });

    marker.on('popupopen', function () {
      showMapPlaceDetail(placeData);
    });

    mapMarkers.push(marker);
    bounds.push([placeData.lat, placeData.lng]);
  });

  if (bounds.length > 1) {
    leafletMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  } else {
    leafletMap.setView([currentCenter.lat, currentCenter.lng], 13);
  }

  // Force Leaflet to recalculate container size (fixes blank map on tab switch)
  setTimeout(() => leafletMap.invalidateSize(), 100);
}

function showMapPlaceDetail(place) {
  const tag = getCategoryTag(place.category || categorySelect.value);
  const openLabel = place.openNow === true
    ? '🟢 Open now'
    : place.openNow === false
      ? '🔴 Closed'
      : '🟡 Hours unknown';

  const phone = place.phone ? place.phone.replace(/[^0-9]/g, '') : '';

  mapPlaceDetail.innerHTML = `
    <span class="badge ${tag.color}" style="margin-bottom:10px;display:inline-flex;">
      ${tag.icon} ${tag.label}
    </span>
    <h3>${escapeHtml(place.name)}</h3>
    <p style="margin:6px 0 4px;">${escapeHtml(place.address || 'Address not available')}</p>
    <p>${openLabel} &nbsp;·&nbsp; <strong>${formatDistance(place.distanceKm)}</strong></p>
    ${place.rating ? `<p style="margin-top:4px;">⭐ ${place.rating} rating</p>` : ''}
    <div class="mpd-actions">
      ${place.phone
      ? `<a class="primary" href="tel:${escapeHtml(place.phone)}">📞 Call</a>`
      : ''}
      ${place.phone
      ? `<a href="https://wa.me/${encodeURIComponent(phone)}" target="_blank">💬 WhatsApp</a>`
      : ''}
      ${place.website
      ? `<a href="${escapeHtml(place.website)}" target="_blank">🌐 Website</a>`
      : ''}
      ${place.lat && place.lng
      ? `<a href="https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}" target="_blank">🗺️ Open in Maps</a>`
      : ''}
    </div>
  `;

  mapPlaceDetail.style.display = '';
  mapSidebarHint.style.display = 'none';
}
function switchView(view) {
  currentView = view;
  listViewBtn.classList.toggle('active', view === 'list');
  mapViewBtn.classList.toggle('active', view === 'map');
  listViewEl.style.display = view === 'list' ? '' : 'none';
  mapViewEl.style.display = view === 'map' ? '' : 'none';

  if (view === 'map' && currentResults.length > 0 && currentCenter) {
    // Small delay to let the container become visible before Leaflet measures it
    setTimeout(() => {
      if (!leafletMap) {
        initMap(currentCenter);
      } else {
        leafletMap.invalidateSize();
      }
      renderMap(applyFilters());
    }, 50);
  }
}

listViewBtn.addEventListener('click', () => switchView('list'));
mapViewBtn.addEventListener('click', () => switchView('map'));

// ── Main Search ──────────────────────────────────────────────
async function searchNearby() {
  const category = categorySelect.value;
  const radius = radiusSelect.value;

  setStatus('Searching for nearby places…');
  resultsContainer.innerHTML = '';
  downloadBtn.disabled = true;
  clearMap();

  try {
    let searchCenter, displayName, precisionLabel;

    if (locationMode === 'gps' && gpsCoords) {
      // Use GPS coordinates directly
      searchCenter = gpsCoords;
      displayName = gpsLocationName.textContent || 'Your location';
      precisionLabel = 'GPS (high accuracy)';
    } else {
      // Text / pincode geocoding
      const query = pincodeInput.value.trim() || '285123';

      // Try app API first, fallback to Nominatim
      let geocodeData;
      try {
        const geocodeResp = await fetch(`/api/geocode?query=${encodeURIComponent(query)}`);
        geocodeData = await geocodeResp.json();
      } catch {
        geocodeData = {};
      }

      if (!geocodeData.lat || !geocodeData.lng) {
        // Nominatim fallback
        const nomResp = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const nomData = await nomResp.json();
        if (!nomData.length) throw new Error('Unable to locate this area. Please try a different pincode or place name.');
        geocodeData = {
          lat: nomData[0].lat,
          lng: nomData[0].lon,
          displayName: nomData[0].display_name,
          bbox: nomData[0].boundingbox,
          precision: 'nominatim',
        };
      }

      const exact = { lat: Number(geocodeData.lat), lng: Number(geocodeData.lng) };
      searchCenter = (Number.isFinite(exact.lat) && Number.isFinite(exact.lng))
        ? exact
        : computeBBoxCenter(geocodeData.bbox) || exact;
      displayName = geocodeData.displayName || query;
      precisionLabel = getPrecisionLabel(geocodeData);
    }

    currentCenter = searchCenter;
    locationText.textContent = displayName;
    pageTitleLocation.textContent = displayName;
    precisionText.textContent = precisionLabel;

    // Fetch places
    let placesData;
    try {
      const placesResp = await fetch(
        `/api/places?lat=${searchCenter.lat}&lng=${searchCenter.lng}&category=${encodeURIComponent(category)}&radius=${radius}`
      );
      placesData = await placesResp.json();
    } catch {
      // If backend unavailable, provide empty results gracefully
      placesData = { results: [], source: 'unavailable' };
    }

    const results = (placesData.results || []).map(place => ({
      ...place,
      category: place.category || category,
      delivery: Boolean(place.delivery),
      distanceKm: calculateDistance(searchCenter.lat, searchCenter.lng, place.lat, place.lng),
    }));

    const radiusKm = Number(radiusSelect.value) / 1000;

    currentResults = results
      .filter(place => place.distanceKm <= radiusKm)
      .sort((a, b) => {
        if (a.openNow !== b.openNow) return Number(b.openNow) - Number(a.openNow);
        return a.distanceKm - b.distanceKm;
      });

    apiMode.textContent = placesData.source === 'google' ? 'Live API' : placesData.source === 'unavailable' ? 'Offline' : 'Fallback Demo';

    if (!currentResults.length) {
      setStatus('No places found. Try a different category or larger radius.', 'error');
      resultCount.textContent = '0 found';
      saveSearchState();
      return;
    }

    saveSearchState();
    renderResults();

    // If map view is already active, render map
    if (currentView === 'map') {
      setTimeout(() => {
        if (!leafletMap) initMap(currentCenter);
        else leafletMap.invalidateSize();
        renderMap(applyFilters());
      }, 80);
    }

  } catch (error) {
    setStatus(error.message, 'error');
    resultCount.textContent = '0 found';
  }
}

// ── CSV Download ─────────────────────────────────────────────
function downloadResultsAsCSV() {
  const filtered = applyFilters();
  if (!filtered.length) return;

  const rows = filtered.map(p => ({
    Name: p.name,
    Category: p.category || categorySelect.value,
    Address: p.address,
    Phone: p.phone || '',
    Rating: p.rating || '',
    OpenNow: p.openNow === true ? 'Open' : p.openNow === false ? 'Closed' : 'Unknown',
    Delivery: p.delivery ? 'Yes' : 'No',
    Distance: `${p.distanceKm.toFixed(2)} km`,
    Website: p.website || '',
  }));

  const header = Object.keys(rows[0]);
  const csv = [
    header.join(','),
    ...rows.map(r => header.map(k => `"${String(r[k] || '').replaceAll('"', '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${categorySelect.value}-results-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const translations = {
  en: {
    eyebrow: 'Family Nearby Finder',
    heroTitle: 'Find trusted services near ',
    modeText: '✏️ Type location',
    modeGps: '📡 Use my location',
    gpsDetectBtn: 'Detect My Location',
    gpsDefault: 'Click "Detect My Location" to begin',
    detectedLocation: 'Detected Location',
    labelLocation: 'Location / Pincode',
    labelCategory: 'Category',
    labelRadius: 'Search Radius',
    searchBtn: 'Search Nearby',
    tabAll: 'All',
    tabFav: '⭐ Favorites',
    listBtn: '☰ List',
    mapBtn: '🗺️ Map',
    phoneOnly: 'Only with phone',
    delivery: 'Home delivery',
    openNow: 'Open now',
    downloadBtn: '⬇ Download CSV',
    infoLocation: 'Location',
    infoResults: 'Results',
    infoPrecision: 'Precision',
    infoMode: 'Mode',
    defaultStatus: 'Enter a location or use GPS, then click Search.',
    mapHint: 'Click a pin to see details',
    copyName: '📋 Copy Name',
    copyPhone: '📋 Copy Phone',
    call: '📞 Call',
    whatsapp: '💬 WhatsApp',
    website: '🌐 Website',
    maps: '🗺️ Maps',
    openLabel: 'Open now',
    closedLabel: 'Closed',
    hoursLabel: 'Hours unavailable',
    noRating: 'No rating',
    distance: 'Distance',
    placeholderInput: 'e.g. Jalaun, Uttar Pradesh  or  285123',
    categories: {
      all: 'All Services', hospital: 'Hospital', medical: 'Medical',
      doctor: 'Doctor', dentist: 'Dentist', clinic: 'Clinic',
      pharmacy: 'Pharmacy', grocery: 'Grocery', kirana: 'Kirana Store',
      supermarket: 'Supermarket', restaurant: 'Restaurant', food: 'Food',
      cafe: 'Cafe', bakery: 'Bakery', clothing: 'Clothing',
      footwear: 'Footwear', electronics: 'Electronics', atm: 'ATM',
      bank: 'Bank', petrol: 'Petrol Pump', salon: 'Salon',
      laundry: 'Laundry', stationery: 'Stationery', school: 'School',
    },
    radii: { '5000': '5 km', '10000': '10 km', '25000': '25 km', '50000': '50 km' },
  },
  hi: {
    eyebrow: 'नज़दीकी सेवा खोजें',
    heroTitle: 'भरोसेमंद सेवाएं खोजें — ',
    modeText: '✏️ जगह टाइप करें',
    modeGps: '📡 मेरी लोकेशन',
    gpsDetectBtn: 'लोकेशन पता करें',
    gpsDefault: '"लोकेशन पता करें" पर क्लिक करें',
    detectedLocation: 'मिली हुई लोकेशन',
    labelLocation: 'जगह / पिनकोड',
    labelCategory: 'श्रेणी',
    labelRadius: 'खोज दायरा',
    searchBtn: 'खोजें',
    tabAll: 'सभी',
    tabFav: '⭐ पसंदीदा',
    listBtn: '☰ सूची',
    mapBtn: '🗺️ नक्शा',
    phoneOnly: 'सिर्फ फोन वाले',
    delivery: 'होम डिलीवरी',
    openNow: 'अभी खुला',
    downloadBtn: '⬇ CSV डाउनलोड',
    infoLocation: 'जगह',
    infoResults: 'परिणाम',
    infoPrecision: 'सटीकता',
    infoMode: 'मोड',
    defaultStatus: 'जगह डालें या GPS उपयोग करें, फिर खोजें।',
    mapHint: 'विवरण देखने के लिए पिन पर क्लिक करें',
    copyName: '📋 नाम कॉपी करें',
    copyPhone: '📋 फोन कॉपी करें',
    call: '📞 कॉल करें',
    whatsapp: '💬 WhatsApp',
    website: '🌐 वेबसाइट',
    maps: '🗺️ नक्शा खोलें',
    openLabel: 'अभी खुला',
    closedLabel: 'बंद',
    hoursLabel: 'समय उपलब्ध नहीं',
    noRating: 'रेटिंग नहीं',
    distance: 'दूरी',
    placeholderInput: 'जैसे: जालौन, उत्तर प्रदेश  या  285123',
    categories: {
      all: 'सभी सेवाएं', hospital: 'अस्पताल', medical: 'मेडिकल',
      doctor: 'डॉक्टर', dentist: 'दांत का डॉक्टर', clinic: 'क्लिनिक',
      pharmacy: 'दवा दुकान', grocery: 'किराना', kirana: 'किराना स्टोर',
      supermarket: 'सुपरमार्केट', restaurant: 'रेस्टोरेंट', food: 'भोजन',
      cafe: 'कैफे', bakery: 'बेकरी', clothing: 'कपड़े',
      footwear: 'जूते', electronics: 'इलेक्ट्रॉनिक्स', atm: 'ATM',
      bank: 'बैंक', petrol: 'पेट्रोल पंप', salon: 'सैलून',
      laundry: 'धुलाई', stationery: 'स्टेशनरी', school: 'स्कूल',
    },
    radii: { '5000': '5 किमी', '10000': '10 किमी', '25000': '25 किमी', '50000': '50 किमी' },
  },
};

function applyTranslations() {
  const T = translations[isHindi ? 'hi' : 'en'];

  // Eyebrow & hero
  document.querySelector('.eyebrow').textContent = T.eyebrow;

  // Location mode buttons
  const modeBtns = document.querySelectorAll('.loc-mode-btn');
  if (modeBtns[0]) modeBtns[0].innerHTML = T.modeText;
  if (modeBtns[1]) modeBtns[1].innerHTML = T.modeGps;

  // GPS bar
  const gpsDetect = document.getElementById('detectLocationBtn');
  if (gpsDetect) gpsDetect.textContent = T.gpsDetectBtn;
  const gpsStatusEl = document.getElementById('gpsStatusText');
  if (gpsStatusEl && gpsStatusEl.textContent === translations[isHindi ? 'en' : 'hi'].gpsDefault) {
    gpsStatusEl.textContent = T.gpsDefault;
  }

  // Labels
  const labels = document.querySelectorAll('.input-group label');
  labels.forEach(label => {
    if (label.htmlFor === 'pincodeInput') label.textContent = T.labelLocation;
    if (label.htmlFor === 'categorySelect') label.textContent = T.labelCategory;
    if (label.htmlFor === 'radiusSelect') label.textContent = T.labelRadius;
    if (label.textContent === translations[isHindi ? 'en' : 'hi'].detectedLocation ||
      label.textContent === T.detectedLocation) {
      label.textContent = T.detectedLocation;
    }
  });

  // Placeholder
  pincodeInput.placeholder = T.placeholderInput;

  // Search button
  const submitBtn = document.querySelector('#searchForm button[type="submit"]');
  if (submitBtn) submitBtn.textContent = T.searchBtn;

  // Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    if (btn.dataset.tab === 'all') btn.textContent = T.tabAll;
    if (btn.dataset.tab === 'favorites') btn.textContent = T.tabFav;
  });

  // View buttons
  if (listViewBtn) listViewBtn.textContent = T.listBtn;
  if (mapViewBtn) mapViewBtn.textContent = T.mapBtn;

  // Toggle chips
  document.querySelectorAll('.toggle-chip span').forEach(span => {
    const en = translations.en;
    const hi = translations.hi;
    if (span.textContent === en.phoneOnly || span.textContent === hi.phoneOnly) span.textContent = T.phoneOnly;
    if (span.textContent === en.delivery || span.textContent === hi.delivery) span.textContent = T.delivery;
    if (span.textContent === en.openNow || span.textContent === hi.openNow) span.textContent = T.openNow;
  });

  // Download button
  if (downloadBtn) downloadBtn.textContent = currentResults.length === 0
    ? T.downloadBtn
    : T.downloadBtn;

  // Info card labels
  const infoCards = document.querySelectorAll('.info-card small');
  const infoKeys = ['infoLocation', 'infoResults', 'infoPrecision', 'infoMode'];
  infoCards.forEach((el, i) => { if (infoKeys[i]) el.textContent = T[infoKeys[i]]; });

  // Category select options
  const catOptions = categorySelect.querySelectorAll('option');
  catOptions.forEach(opt => {
    const key = opt.value;
    if (T.categories[key]) opt.textContent = T.categories[key];
  });

  // Radius select options
  const radOptions = radiusSelect.querySelectorAll('option');
  radOptions.forEach(opt => {
    if (T.radii[opt.value]) opt.textContent = T.radii[opt.value];
  });

  // Map hint
  if (mapSidebarHint) mapSidebarHint.textContent = T.mapHint;

  // Status message (only if it's still the default)
  const enDefault = translations.en.defaultStatus;
  const hiDefault = translations.hi.defaultStatus;
  if (statusMessage.textContent === enDefault || statusMessage.textContent === hiDefault) {
    setStatus(T.defaultStatus);
  }

  // Re-render cards so action buttons translate too
  if (currentResults.length > 0) renderResults();
}

function activateLanguage() {
  isHindi = !isHindi;
  langToggleBtn.textContent = isHindi ? 'English' : 'हिंदी';
  document.documentElement.lang = isHindi ? 'hi' : 'en';
  applyTranslations();
}

// ── Large Text ───────────────────────────────────────────────
function toggleLargeText() {
  isLargeText = !isLargeText;
  document.body.classList.toggle('large-text', isLargeText);
}

// ── Voice Search ─────────────────────────────────────────────
function initVoiceSearch() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { setStatus('Voice search is not supported in this browser.', 'error'); return; }
  recognition = new SR();
  recognition.lang = isHindi ? 'hi-IN' : 'en-IN';
  recognition.onresult = e => {
    pincodeInput.value = e.results[0][0].transcript;
    setLocationMode('text');
    searchNearby();
  };
  recognition.onerror = () => setStatus('Voice search failed.', 'error');
}

// ── Event Listeners ──────────────────────────────────────────
form.addEventListener('submit', e => { e.preventDefault(); searchNearby(); });
phoneOnlyToggle.addEventListener('change', renderResults);
homeDeliveryToggle.addEventListener('change', renderResults);
openNowToggle.addEventListener('change', renderResults);
radiusSelect.addEventListener('change', renderResults);
downloadBtn.addEventListener('click', downloadResultsAsCSV);
largeTextBtn.addEventListener('click', toggleLargeText);
langToggleBtn.addEventListener('click', activateLanguage);
voiceSearchBtn.addEventListener('click', () => {
  if (!recognition) initVoiceSearch();
  if (recognition) recognition.start();
});

tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    currentTab = btn.dataset.tab;
    tabs.forEach(b => b.classList.toggle('active', b === btn));
    renderResults();
  });
});

// ── Init ─────────────────────────────────────────────────────
favorites = loadFavorites();
footerYear.textContent = new Date().getFullYear();

// Restore last search
const saved = loadSearchState();
if (saved) {
  pincodeInput.value = saved.query || '';
  categorySelect.value = saved.category || 'all';
  radiusSelect.value = saved.radius || '50000';
  phoneOnlyToggle.checked = Boolean(saved.phoneOnly);
  homeDeliveryToggle.checked = Boolean(saved.homeDelivery);
  openNowToggle.checked = Boolean(saved.openNow);
  if (saved.locationMode === 'gps' && saved.gpsCoords) {
    gpsCoords = saved.gpsCoords;
    setLocationMode('gps');
    gpsLocationName.textContent = 'Previously detected location';
    setGpsStatus('✅', 'Using previously detected location.');
  }
}

// Default UI state
locationText.textContent = 'Your area';
precisionText.textContent = 'Area estimate';
apiMode.textContent = 'Live API';
pageTitleLocation.textContent = 'your area';
resultCount.textContent = '0 found';
downloadBtn.disabled = true;
setStatus('Enter a location or use GPS, then click Search.');
setLocationMode('text');