/* ============================================================
   AasPaas — script.js  (v2)
   New features: photo carousel, rating counts, weighted sort,
   new categories (gym/juice/alcohol), advanced filters panel,
   dark mode, skeleton loaders, share button, back-to-top FAB,
   category quick-chips, in-result name search.
   ============================================================ */

// ── DOM refs ────────────────────────────────────────────────
const form                = document.getElementById('searchForm');
const pincodeInput        = document.getElementById('pincodeInput');
const suggestionsList     = document.getElementById('suggestionsList');
const categorySelect      = document.getElementById('categorySelect');
const radiusSelect        = document.getElementById('radiusSelect');
const phoneOnlyToggle     = document.getElementById('phoneOnlyToggle');
const homeDeliveryToggle  = document.getElementById('homeDeliveryToggle');
const openNowToggle       = document.getElementById('openNowToggle');
const downloadBtn         = document.getElementById('downloadBtn');
const resultsContainer    = document.getElementById('resultsContainer');
const statusMessage       = document.getElementById('statusMessage');
const locationText        = document.getElementById('locationText');
const precisionText       = document.getElementById('precisionText');
const resultCount         = document.getElementById('resultCount');
const apiMode             = document.getElementById('apiMode');
const largeTextBtn        = document.getElementById('largeTextBtn');
const langToggleBtn       = document.getElementById('langToggleBtn');
const voiceSearchBtn      = document.getElementById('voiceSearchBtn');
const darkModeBtn         = document.getElementById('darkModeBtn');
const pageTitleLocation   = document.getElementById('pageTitleLocation');
const tabs                = document.querySelectorAll('.tab-btn');
const listViewBtn         = document.getElementById('listViewBtn');
const mapViewBtn          = document.getElementById('mapViewBtn');
const listViewEl          = document.getElementById('listView');
const mapViewEl           = document.getElementById('mapView');
const gpsStatusBar        = document.getElementById('gpsStatusBar');
const gpsStatusIcon       = document.getElementById('gpsStatusIcon');
const gpsStatusText       = document.getElementById('gpsStatusText');
const detectLocationBtn   = document.getElementById('detectLocationBtn');
const textInputWrap       = document.getElementById('textInputWrap');
const gpsInputWrap        = document.getElementById('gpsInputWrap');
const gpsLocationName     = document.getElementById('gpsLocationName');
const mapSidebarHint      = document.querySelector('.map-sidebar-hint');
const mapPlaceDetail      = document.getElementById('mapPlaceDetail');
const footerYear          = document.getElementById('footerYear');
const filterToggleBtn     = document.getElementById('filterToggleBtn');
const filtersPanel        = document.getElementById('filtersPanel');
const ratingFilter        = document.getElementById('ratingFilter');
const ratingFilterLabel   = document.getElementById('ratingFilterLabel');
const nameFilterInput     = document.getElementById('nameFilterInput');
const clearNameFilter     = document.getElementById('clearNameFilter');
const sortSelect          = document.getElementById('sortSelect');
const clearAllFilters     = document.getElementById('clearAllFilters');
const activeFilterCount   = document.getElementById('activeFilterCount');
const backToTopBtn        = document.getElementById('backToTopBtn');
const categoryChips       = document.getElementById('categoryChips');

// ── State ───────────────────────────────────────────────────
let currentResults  = [];
let currentCenter   = null;
let suggestionTimer = null;
let currentTab      = 'all';
let currentView     = 'list';
let isLargeText     = false;
let isHindi         = false;
let isDark          = false;
let recognition;
let favorites       = [];
let locationMode    = 'text';
let gpsCoords       = null;
let leafletMap      = null;
let mapMarkers      = [];
// carousel state per card: { placeId: { idx, timer } }
let carouselState   = {};

// ── Category config ─────────────────────────────────────────
const categoryConfig = {
  all:          { icon: '🗺️',  color: 'blue',   label: 'All',           labelHindi: 'सभी' },
  hospital:     { icon: '🏥',  color: 'red',    label: 'Hospital',      labelHindi: 'अस्पताल' },
  medical:      { icon: '🩺',  color: 'red',    label: 'Medical',       labelHindi: 'मेडिकल' },
  doctor:       { icon: '🩺',  color: 'red',    label: 'Doctor',        labelHindi: 'डॉक्टर' },
  dentist:      { icon: '🦷',  color: 'red',    label: 'Dentist',       labelHindi: 'दांत का डॉक्टर' },
  clinic:       { icon: '🩹',  color: 'red',    label: 'Clinic',        labelHindi: 'क्लिनिक' },
  pharmacy:     { icon: '💊',  color: 'green',  label: 'Pharmacy',      labelHindi: 'दवा दुकान' },
  grocery:      { icon: '🛒',  color: 'orange', label: 'Grocery',       labelHindi: 'किराना' },
  kirana:       { icon: '🛍️',  color: 'orange', label: 'Kirana',        labelHindi: 'किराना' },
  supermarket:  { icon: '🏬',  color: 'orange', label: 'Supermarket',   labelHindi: 'सुपरमार्केट' },
  food:         { icon: '🍽️',  color: 'blue',   label: 'Food',          labelHindi: 'भोजन' },
  restaurant:   { icon: '🍜',  color: 'blue',   label: 'Restaurant',    labelHindi: 'रेस्टोरेंट' },
  cafe:         { icon: '☕',  color: 'blue',   label: 'Cafe',          labelHindi: 'कैफे' },
  bakery:       { icon: '🥐',  color: 'blue',   label: 'Bakery',        labelHindi: 'बेकरी' },
  juice:        { icon: '🥤',  color: 'green',  label: 'Juice Centre',  labelHindi: 'जूस सेंटर' },
  alcohol:      { icon: '🍺',  color: 'orange', label: 'Bar / Alcohol', labelHindi: 'शराब / बार' },
  gym:          { icon: '💪',  color: 'purple', label: 'Gym / Fitness', labelHindi: 'जिम' },
  clothing:     { icon: '👕',  color: 'blue',   label: 'Clothing',      labelHindi: 'कपड़े' },
  footwear:     { icon: '👟',  color: 'blue',   label: 'Footwear',      labelHindi: 'जूते' },
  electronics:  { icon: '📱',  color: 'blue',   label: 'Electronics',   labelHindi: 'इलेक्ट्रॉनिक्स' },
  atm:          { icon: '🏧',  color: 'blue',   label: 'ATM',           labelHindi: 'ATM' },
  bank:         { icon: '🏦',  color: 'blue',   label: 'Bank',          labelHindi: 'बैंक' },
  petrol:       { icon: '⛽',  color: 'blue',   label: 'Petrol',        labelHindi: 'पेट्रोल' },
  salon:        { icon: '💇',  color: 'blue',   label: 'Salon',         labelHindi: 'सैलून' },
  laundry:      { icon: '🧺',  color: 'blue',   label: 'Laundry',       labelHindi: 'धुलाई' },
  stationery:   { icon: '📚',  color: 'blue',   label: 'Stationery',    labelHindi: 'स्टेशनरी' },
  school:       { icon: '🏫',  color: 'blue',   label: 'School',        labelHindi: 'स्कूल' },
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
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function getCategoryTag(category) {
  return categoryConfig[category] || { icon: '📍', color: 'blue', label: category };
}

// Weighted score: rating × log(reviewCount + 1)
function weightedScore(rating, reviewCount) {
  const r = Number(rating) || 0;
  const c = Number(reviewCount) || 0;
  return r * Math.log1p(c + 1);
}

// ── Dark Mode ────────────────────────────────────────────────
function toggleDarkMode() {
  isDark = !isDark;
  document.body.classList.toggle('dark', isDark);
  darkModeBtn.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('aaspaas_dark', isDark ? '1' : '0');
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
locModeBtns.forEach(btn => btn.addEventListener('click', () => setLocationMode(btn.dataset.mode)));

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
    setGpsStatus('❌', 'Geolocation not supported by your browser.');
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
      await searchNearby();
    },
    (err) => {
      const msgs = {
        1: 'Permission denied. Please allow location access.',
        2: 'Position unavailable. Try typing your location instead.',
        3: 'Request timed out. Please try again.',
      };
      setGpsStatus('❌', msgs[err.code] || 'Could not detect location.');
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  );
});

// ── Category Chips ───────────────────────────────────────────
document.querySelectorAll('.cat-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    categorySelect.value = chip.dataset.cat;
    if (currentResults.length > 0) searchNearby();
  });
});

// Keep chips in sync when select changes
categorySelect.addEventListener('change', () => {
  document.querySelectorAll('.cat-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.cat === categorySelect.value);
  });
});

// ── Filters Panel ─────────────────────────────────────────────
filterToggleBtn.addEventListener('click', () => {
  const open = filtersPanel.style.display !== 'none';
  filtersPanel.style.display = open ? 'none' : '';
  filterToggleBtn.classList.toggle('active', !open);
});

ratingFilter.addEventListener('input', () => {
  const v = Number(ratingFilter.value);
  ratingFilterLabel.textContent = v === 0 ? 'Any' : `${v}★+`;
  updateActiveFilterCount();
  renderResults();
});

nameFilterInput.addEventListener('input', () => {
  clearNameFilter.style.display = nameFilterInput.value ? '' : 'none';
  updateActiveFilterCount();
  renderResults();
});

clearNameFilter.addEventListener('click', () => {
  nameFilterInput.value = '';
  clearNameFilter.style.display = 'none';
  updateActiveFilterCount();
  renderResults();
});

sortSelect.addEventListener('change', renderResults);

clearAllFilters.addEventListener('click', () => {
  phoneOnlyToggle.checked = false;
  homeDeliveryToggle.checked = false;
  openNowToggle.checked = false;
  ratingFilter.value = 0;
  ratingFilterLabel.textContent = 'Any';
  nameFilterInput.value = '';
  clearNameFilter.style.display = 'none';
  sortSelect.value = 'smart';
  updateActiveFilterCount();
  renderResults();
});

function updateActiveFilterCount() {
  let count = 0;
  if (phoneOnlyToggle.checked)    count++;
  if (homeDeliveryToggle.checked) count++;
  if (openNowToggle.checked)      count++;
  if (Number(ratingFilter.value) > 0) count++;
  if (nameFilterInput.value.trim()) count++;
  activeFilterCount.textContent = count;
  activeFilterCount.style.display = count > 0 ? '' : 'none';
}

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
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=6&addressdetails=0`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await resp.json();
    showSuggestions(data.map(d => ({ value: d.display_name })));
  } catch {
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
  if (!e.target.closest('.suggestion-wrap')) suggestionsList.style.display = 'none';
});

// ── Photo Carousel ───────────────────────────────────────────
function buildPhotoCarousel(place, tag) {
  const photos = place.photos || [];
  const wrap = document.createElement('div');
  wrap.className = 'photo-carousel';

  if (photos.length === 0) {
    wrap.innerHTML = `<div class="no-photo">${tag.icon}</div>`;
  } else {
    photos.forEach((url, i) => {
      const img = document.createElement('img');
      img.src = url;
      img.alt = place.name;
      img.loading = 'lazy';
      if (i === 0) img.classList.add('active');
      img.onerror = () => { img.style.display = 'none'; };
      wrap.appendChild(img);
    });

    if (photos.length > 1) {
      const dotsWrap = document.createElement('div');
      dotsWrap.className = 'photo-dots';
      photos.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.className = 'photo-dot' + (i === 0 ? ' active' : '');
        dotsWrap.appendChild(dot);
      });
      wrap.appendChild(dotsWrap);

      let hoverTimer = null;
      const state = { idx: 0 };
      carouselState[place.placeId] = state;

      const imgs = wrap.querySelectorAll('img');
      const dots = wrap.querySelectorAll('.photo-dot');

      function advanceCarousel() {
        imgs[state.idx].classList.remove('active');
        dots[state.idx].classList.remove('active');
        state.idx = (state.idx + 1) % imgs.length;
        imgs[state.idx].classList.add('active');
        dots[state.idx].classList.add('active');
      }

      wrap.addEventListener('mouseenter', () => {
        hoverTimer = setInterval(advanceCarousel, 900);
      });
      wrap.addEventListener('mouseleave', () => {
        clearInterval(hoverTimer);
      });
    }
  }

  if (place.distanceKm < 1) {
    const badge = document.createElement('span');
    badge.className = 'near-me-badge';
    badge.textContent = '📍 Near me';
    wrap.appendChild(badge);
  }

  return wrap;
}

// ── Filters & Sort ───────────────────────────────────────────
function applyFilters() {
  const phoneOnly    = phoneOnlyToggle.checked;
  const deliveryOnly = homeDeliveryToggle.checked;
  const openOnly     = openNowToggle.checked;
  const minRating    = Number(ratingFilter.value);
  const nameQuery    = nameFilterInput.value.trim().toLowerCase();
  const favSet       = new Set(favorites);
  const radiusKm     = Number(radiusSelect.value) / 1000;
  const sort         = sortSelect.value;

  let filtered = currentResults.filter(p =>
    p.distanceKm <= radiusKm &&
    (!phoneOnly    || !!p.phone) &&
    (!deliveryOnly || !!p.delivery) &&
    (!openOnly     || p.openNow === true) &&
    (!minRating    || (Number(p.rating) || 0) >= minRating) &&
    (!nameQuery    || (p.name || '').toLowerCase().includes(nameQuery)) &&
    (currentTab !== 'favorites' || favSet.has(p.placeId))
  );

  filtered.sort((a, b) => {
    if (sort === 'distance') return a.distanceKm - b.distanceKm;
    if (sort === 'rating')   return (Number(b.rating) || 0) - (Number(a.rating) || 0);
    if (sort === 'reviews')  return (Number(b.reviewCount) || 0) - (Number(a.reviewCount) || 0);
    // smart: weighted score (default)
    const scoreB = weightedScore(b.rating, b.reviewCount);
    const scoreA = weightedScore(a.rating, a.reviewCount);
    if (Math.abs(scoreB - scoreA) > 0.5) return scoreB - scoreA;
    // tiebreak by open status then distance
    if (a.openNow !== b.openNow) return Number(b.openNow) - Number(a.openNow);
    return a.distanceKm - b.distanceKm;
  });

  return filtered;
}

// ── Render Skeletons ─────────────────────────────────────────
function renderSkeletons(count = 6) {
  resultsContainer.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'skeleton-card';
    card.innerHTML = `
      <div class="skeleton skeleton-photo"></div>
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-subtitle"></div>
      <div class="skeleton skeleton-meta"></div>
      <div class="skeleton skeleton-actions"></div>
    `;
    resultsContainer.appendChild(card);
  }
}

// ── Render Results ───────────────────────────────────────────
function renderResults() {
  const filtered = applyFilters();
  resultsContainer.innerHTML = '';
  updateActiveFilterCount();

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

  const T = translations[isHindi ? 'hi' : 'en'];

  filtered.forEach(place => {
    const tag    = getCategoryTag(place.category || categorySelect.value);
    const isFav  = favorites.includes(place.placeId);
    const rating = place.rating ? Number(place.rating) : 0;
    const rCls   = rating >= 4.5 ? 'good' : rating >= 3.5 ? 'ok' : 'bad';
    const openCls   = place.openNow === true ? 'green' : place.openNow === false ? 'red' : 'orange';
    const openLabel = place.openNow === true ? 'Open now' : place.openNow === false ? 'Closed' : 'Hours unavailable';
    const reviewCount = Number(place.reviewCount) || 0;
    const countStr = reviewCount > 0 ? ` (${reviewCount.toLocaleString()})` : '';
    const phone   = (place.phone || '').replace(/[^0-9]/g, '');

    const card = document.createElement('article');
    card.className = 'result-card';

    // Photo carousel
    const carousel = buildPhotoCarousel(place, tag);
    card.appendChild(carousel);

    // Card body
    const body = document.createElement('div');
    body.className = 'card-body';
    body.innerHTML = `
      <div class="result-card-header">
        <div>
          <span class="badge ${tag.color}">${tag.icon} ${escapeHtml(tag.label)}</span>
          <h3>${escapeHtml(place.name)}</h3>
        </div>
        <button class="favorite-btn" data-favorite="${escapeHtml(place.placeId)}" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">${isFav ? '★' : '☆'}</button>
      </div>
      <p class="result-address">${escapeHtml(place.address)}</p>
      <div class="result-meta">
        <span class="rating-pill ${rCls}">
          ${place.rating ? `${place.rating} ★` : 'No rating'}
          <span class="review-count">${countStr}</span>
        </span>
        <span class="badge ${openCls}">${openLabel}</span>
      </div>
      <p class="distance-line"><strong>${formatDistance(place.distanceKm)}</strong> away</p>
    `;
    card.appendChild(body);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    actions.innerHTML = `
      ${place.phone ? `<a class="primary" href="tel:${escapeHtml(place.phone)}">📞 Call</a>` : ''}
      ${place.phone ? `<a href="https://wa.me/${encodeURIComponent(phone)}" target="_blank">💬 WhatsApp</a>` : ''}
      ${place.website ? `<a href="${escapeHtml(place.website)}" target="_blank">🌐 Website</a>` : ''}
      ${place.lat && place.lng ? `<a href="https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}" target="_blank">🗺️ Maps</a>` : ''}
      <button type="button" data-copy="${escapeHtml(place.name)}">${T.copyName}</button>
      ${place.phone ? `<button type="button" data-copy-phone="${escapeHtml(place.phone)}">${T.copyPhone}</button>` : ''}
      <button type="button" data-share="${escapeHtml(place.placeId)}">📤 Share</button>
    `;
    card.appendChild(actions);

    // Listeners
    body.querySelector('[data-favorite]').addEventListener('click', () => {
      const id = place.placeId;
      favorites = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
      saveFavorites();
      renderResults();
    });

    actions.querySelector('[data-copy]').addEventListener('click', () => {
      navigator.clipboard.writeText(place.name).then(() => setStatus(`Copied: ${place.name}`));
    });

    const phBtn = actions.querySelector('[data-copy-phone]');
    if (phBtn) {
      phBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(place.phone).then(() => setStatus(`Copied phone: ${place.phone}`));
      });
    }

    const shareBtn = actions.querySelector('[data-share]');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        const mapsLink = place.lat && place.lng
          ? `https://www.google.com/maps?q=${place.lat},${place.lng}`
          : '';
        const text = `📍 *${place.name}*\n${place.address}\n${place.phone ? '📞 ' + place.phone + '\n' : ''}${mapsLink ? '🗺️ ' + mapsLink : ''}`;
        if (navigator.share) {
          navigator.share({ title: place.name, text });
        } else {
          navigator.clipboard.writeText(text).then(() => setStatus('Place details copied to clipboard!'));
        }
      });
    }

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
  mapPlaceDetail.style.display = 'none';
  mapSidebarHint.style.display = '';

  const bounds = [[currentCenter.lat, currentCenter.lng]];

  places.forEach(place => {
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
        box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;
      "><span style="transform:rotate(45deg)">${tag.icon}</span></div>`,
      iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -36],
    });

    const placeData = { ...place };
    const marker = L.marker([placeData.lat, placeData.lng], { icon }).addTo(leafletMap);
    marker.bindPopup(`
      <div class="map-popup-inner">
        <strong>${escapeHtml(placeData.name)}</strong><br/>
        <span>${tag.icon} ${tag.label} &nbsp;·&nbsp; ${formatDistance(placeData.distanceKm)} away</span>
      </div>
    `);
    marker.on('click',     () => showMapPlaceDetail(placeData));
    marker.on('popupopen', () => showMapPlaceDetail(placeData));
    mapMarkers.push(marker);
    bounds.push([placeData.lat, placeData.lng]);
  });

  if (bounds.length > 1) leafletMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  else leafletMap.setView([currentCenter.lat, currentCenter.lng], 13);
  setTimeout(() => leafletMap.invalidateSize(), 100);
}

function showMapPlaceDetail(place) {
  const tag = getCategoryTag(place.category || categorySelect.value);
  const openLabel = place.openNow === true ? '🟢 Open now' : place.openNow === false ? '🔴 Closed' : '🟡 Hours unknown';
  const phone = (place.phone || '').replace(/[^0-9]/g, '');
  const reviewCount = Number(place.reviewCount) || 0;
  const countStr = reviewCount > 0 ? ` (${reviewCount.toLocaleString()})` : '';

  mapPlaceDetail.innerHTML = `
    <span class="badge ${tag.color}" style="margin-bottom:10px;display:inline-flex;">${tag.icon} ${tag.label}</span>
    <h3>${escapeHtml(place.name)}</h3>
    <p>${escapeHtml(place.address || 'Address not available')}</p>
    <p>${openLabel} &nbsp;·&nbsp; <strong>${formatDistance(place.distanceKm)}</strong></p>
    ${place.rating ? `<p>⭐ ${place.rating} ★${countStr}</p>` : ''}
    <div class="mpd-actions">
      ${place.phone  ? `<a class="primary" href="tel:${escapeHtml(place.phone)}">📞 Call</a>` : ''}
      ${place.phone  ? `<a href="https://wa.me/${encodeURIComponent(phone)}" target="_blank">💬 WhatsApp</a>` : ''}
      ${place.website ? `<a href="${escapeHtml(place.website)}" target="_blank">🌐 Website</a>` : ''}
      ${place.lat && place.lng ? `<a href="https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}" target="_blank">🗺️ Open in Maps</a>` : ''}
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
  mapViewEl.style.display  = view === 'map'  ? '' : 'none';
  if (view === 'map' && currentResults.length > 0 && currentCenter) {
    setTimeout(() => {
      if (!leafletMap) initMap(currentCenter);
      else leafletMap.invalidateSize();
      renderMap(applyFilters());
    }, 50);
  }
}
listViewBtn.addEventListener('click', () => switchView('list'));
mapViewBtn.addEventListener('click',  () => switchView('map'));

// ── Main Search ──────────────────────────────────────────────
async function searchNearby() {
  const category = categorySelect.value;
  const radius   = radiusSelect.value;

  setStatus('Searching for nearby places…');
  renderSkeletons(6);
  downloadBtn.disabled = true;
  clearMap();

  try {
    let searchCenter, displayName, precisionLabel;

    if (locationMode === 'gps' && gpsCoords) {
      searchCenter   = gpsCoords;
      displayName    = gpsLocationName.textContent || 'Your location';
      precisionLabel = 'GPS (high accuracy)';
    } else {
      const query = pincodeInput.value.trim() || '285123';
      let geocodeData;
      try {
        const geocodeResp = await fetch(`/api/geocode?query=${encodeURIComponent(query)}`);
        geocodeData = await geocodeResp.json();
      } catch { geocodeData = {}; }

      if (!geocodeData.lat || !geocodeData.lng) {
        const nomResp = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const nomData = await nomResp.json();
        if (!nomData.length) throw new Error('Unable to locate this area. Try a different pincode or place name.');
        geocodeData = {
          lat: nomData[0].lat, lng: nomData[0].lon,
          displayName: nomData[0].display_name,
          bbox: nomData[0].boundingbox,
          precision: 'nominatim',
        };
      }

      const exact = { lat: Number(geocodeData.lat), lng: Number(geocodeData.lng) };
      searchCenter = (Number.isFinite(exact.lat) && Number.isFinite(exact.lng))
        ? exact
        : computeBBoxCenter(geocodeData.bbox) || exact;
      displayName   = geocodeData.displayName || query;
      precisionLabel = getPrecisionLabel(geocodeData);
    }

    currentCenter = searchCenter;
    locationText.textContent = displayName;
    pageTitleLocation.textContent = displayName;
    precisionText.textContent = precisionLabel;

    let placesData;
    try {
      const placesResp = await fetch(
        `/api/places?lat=${searchCenter.lat}&lng=${searchCenter.lng}&category=${encodeURIComponent(category)}&radius=${radius}`
      );
      placesData = await placesResp.json();
    } catch {
      placesData = { results: [], source: 'unavailable' };
    }

    const radiusKm = Number(radiusSelect.value) / 1000;
    currentResults = (placesData.results || [])
      .map(place => ({
        ...place,
        category:     place.category || category,
        delivery:     Boolean(place.delivery),
        reviewCount:  Number(place.reviewCount || place.user_ratings_total || 0),
        distanceKm:   calculateDistance(searchCenter.lat, searchCenter.lng, place.lat, place.lng),
      }))
      .filter(place => place.distanceKm <= radiusKm);

    apiMode.textContent = placesData.source === 'google'
      ? 'Live API'
      : placesData.source === 'unavailable'
        ? 'Offline'
        : 'Fallback Demo';

    if (!currentResults.length) {
      resultsContainer.innerHTML = '';
      setStatus('No places found. Try a different category or larger radius.', 'error');
      resultCount.textContent = '0 found';
      saveSearchState();
      return;
    }

    saveSearchState();
    renderResults();

    if (currentView === 'map') {
      setTimeout(() => {
        if (!leafletMap) initMap(currentCenter);
        else leafletMap.invalidateSize();
        renderMap(applyFilters());
      }, 80);
    }

  } catch (error) {
    resultsContainer.innerHTML = '';
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
    ReviewCount: p.reviewCount || '',
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
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `${categorySelect.value}-results-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Translations ─────────────────────────────────────────────
const translations = {
  en: {
    eyebrow: 'Family Nearby Finder',
    heroTitle: 'Find trusted services near ',
    modeText: '✏️ Type location', modeGps: '📡 Use my location',
    gpsDetectBtn: 'Detect My Location',
    gpsDefault: 'Click "Detect My Location" to begin',
    detectedLocation: 'Detected Location',
    labelLocation: 'Location / Pincode', labelCategory: 'Category', labelRadius: 'Search Radius',
    searchBtn: 'Search Nearby',
    tabAll: 'All', tabFav: '⭐ Favorites',
    listBtn: '☰ List', mapBtn: '🗺️ Map',
    phoneOnly: '📞 Has phone', delivery: '🚚 Home delivery', openNow: '🟢 Open now',
    downloadBtn: '⬇ Download CSV',
    infoLocation: 'Location', infoResults: 'Results', infoPrecision: 'Precision', infoMode: 'Mode',
    defaultStatus: 'Enter a location or use GPS, then click Search.',
    mapHint: 'Click a pin to see details',
    copyName: '📋 Copy Name', copyPhone: '📋 Copy Phone',
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
      gym: 'Gym / Fitness', juice: 'Juice Centre', alcohol: 'Bar / Alcohol',
    },
    radii: { '5000': '5 km', '10000': '10 km', '25000': '25 km', '50000': '50 km' },
  },
  hi: {
    eyebrow: 'नज़दीकी सेवा खोजें',
    heroTitle: 'भरोसेमंद सेवाएं खोजें — ',
    modeText: '✏️ जगह टाइप करें', modeGps: '📡 मेरी लोकेशन',
    gpsDetectBtn: 'लोकेशन पता करें',
    gpsDefault: '"लोकेशन पता करें" पर क्लिक करें',
    detectedLocation: 'मिली हुई लोकेशन',
    labelLocation: 'जगह / पिनकोड', labelCategory: 'श्रेणी', labelRadius: 'खोज दायरा',
    searchBtn: 'खोजें',
    tabAll: 'सभी', tabFav: '⭐ पसंदीदा',
    listBtn: '☰ सूची', mapBtn: '🗺️ नक्शा',
    phoneOnly: '📞 फोन वाले', delivery: '🚚 होम डिलीवरी', openNow: '🟢 अभी खुला',
    downloadBtn: '⬇ CSV डाउनलोड',
    infoLocation: 'जगह', infoResults: 'परिणाम', infoPrecision: 'सटीकता', infoMode: 'मोड',
    defaultStatus: 'जगह डालें या GPS उपयोग करें, फिर खोजें।',
    mapHint: 'विवरण देखने के लिए पिन पर क्लिक करें',
    copyName: '📋 नाम कॉपी करें', copyPhone: '📋 फोन कॉपी करें',
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
      gym: 'जिम / फिटनेस', juice: 'जूस सेंटर', alcohol: 'शराब / बार',
    },
    radii: { '5000': '5 किमी', '10000': '10 किमी', '25000': '25 किमी', '50000': '50 किमी' },
  },
};

function applyTranslations() {
  const T = translations[isHindi ? 'hi' : 'en'];
  document.querySelector('.eyebrow').textContent = T.eyebrow;
  const modeBtns = document.querySelectorAll('.loc-mode-btn');
  if (modeBtns[0]) modeBtns[0].innerHTML = T.modeText;
  if (modeBtns[1]) modeBtns[1].innerHTML = T.modeGps;
  const gpsDetect = document.getElementById('detectLocationBtn');
  if (gpsDetect) gpsDetect.textContent = T.gpsDetectBtn;
  pincodeInput.placeholder = T.placeholderInput;
  const submitBtn = document.querySelector('#searchForm button[type="submit"]');
  if (submitBtn) submitBtn.textContent = T.searchBtn;
  tabs.forEach(btn => {
    if (btn.dataset.tab === 'all') btn.textContent = T.tabAll;
    if (btn.dataset.tab === 'favorites') btn.textContent = T.tabFav;
  });
  if (listViewBtn) listViewBtn.textContent = T.listBtn;
  if (mapViewBtn)  mapViewBtn.textContent  = T.mapBtn;
  if (downloadBtn) downloadBtn.textContent = T.downloadBtn;
  const infoCards = document.querySelectorAll('.info-card small');
  const infoKeys  = ['infoLocation', 'infoResults', 'infoPrecision', 'infoMode'];
  infoCards.forEach((el, i) => { if (infoKeys[i]) el.textContent = T[infoKeys[i]]; });
  categorySelect.querySelectorAll('option').forEach(opt => {
    const key = opt.value;
    if (T.categories[key]) opt.textContent = T.categories[key];
  });
  radiusSelect.querySelectorAll('option').forEach(opt => {
    if (T.radii[opt.value]) opt.textContent = T.radii[opt.value];
  });
  if (mapSidebarHint) mapSidebarHint.textContent = T.mapHint;
  document.documentElement.lang = isHindi ? 'hi' : 'en';
  if (currentResults.length > 0) renderResults();
}

function activateLanguage() {
  isHindi = !isHindi;
  langToggleBtn.textContent = isHindi ? 'English' : 'हिंदी';
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
  if (!SR) { setStatus('Voice search not supported in this browser.', 'error'); return; }
  recognition = new SR();
  recognition.lang = isHindi ? 'hi-IN' : 'en-IN';
  recognition.onresult = e => {
    pincodeInput.value = e.results[0][0].transcript;
    setLocationMode('text');
    searchNearby();
  };
  recognition.onerror = () => setStatus('Voice search failed.', 'error');
}

// ── Back to Top ──────────────────────────────────────────────
window.addEventListener('scroll', () => {
  backToTopBtn.style.display = window.scrollY > 400 ? '' : 'none';
});
backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ── Event Listeners ──────────────────────────────────────────
form.addEventListener('submit', e => { e.preventDefault(); searchNearby(); });
phoneOnlyToggle.addEventListener('change', () => { updateActiveFilterCount(); renderResults(); });
homeDeliveryToggle.addEventListener('change', () => { updateActiveFilterCount(); renderResults(); });
openNowToggle.addEventListener('change', () => { updateActiveFilterCount(); renderResults(); });
radiusSelect.addEventListener('change', renderResults);
downloadBtn.addEventListener('click', downloadResultsAsCSV);
largeTextBtn.addEventListener('click', toggleLargeText);
langToggleBtn.addEventListener('click', activateLanguage);
darkModeBtn.addEventListener('click', toggleDarkMode);
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
favorites    = loadFavorites();
footerYear.textContent = new Date().getFullYear();

// Restore dark mode pref
if (localStorage.getItem('aaspaas_dark') === '1') {
  isDark = true;
  document.body.classList.add('dark');
  darkModeBtn.textContent = '☀️';
}

// Restore last search
const saved = loadSearchState();
if (saved) {
  pincodeInput.value              = saved.query    || '';
  categorySelect.value            = saved.category || 'all';
  radiusSelect.value              = saved.radius   || '50000';
  phoneOnlyToggle.checked         = Boolean(saved.phoneOnly);
  homeDeliveryToggle.checked      = Boolean(saved.homeDelivery);
  openNowToggle.checked           = Boolean(saved.openNow);
  if (saved.locationMode === 'gps' && saved.gpsCoords) {
    gpsCoords = saved.gpsCoords;
    setLocationMode('gps');
    gpsLocationName.textContent = 'Previously detected location';
    setGpsStatus('✅', 'Using previously detected location.');
  }
  // Sync chips with restored category
  document.querySelectorAll('.cat-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.cat === categorySelect.value);
  });
}

// Default UI state
locationText.textContent  = 'Your area';
precisionText.textContent = 'Area estimate';
apiMode.textContent       = 'Live API';
pageTitleLocation.textContent = 'your area';
resultCount.textContent   = '0 found';
downloadBtn.disabled      = true;
setStatus('Enter a location or use GPS, then click Search.');
setLocationMode('text');