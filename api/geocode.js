const axios = require('axios');

function normalizeAreaQuery(query) {
  return String(query || '').trim();
}

function getLocationOverride(query) {
  const normalized = normalizeAreaQuery(query).toLowerCase();
  const isJalaunExactMatch =
    normalized === '285123' ||
    /^2851\d{2}$/.test(normalized) ||
    normalized === 'jalaun' ||
    normalized === 'jalaun district' ||
    normalized === 'jalaun, uttar pradesh' ||
    normalized === 'jalaun uttar pradesh' ||
    normalized === 'jalaun up' ||
    normalized === 'jalaun, india';

  if (isJalaunExactMatch) {
    return {
      lat: 26.145, lng: 79.339,
      displayName: 'Jalaun, Uttar Pradesh, India',
      placeId: 'override-jalaun',
      bbox: [26.10, 26.19, 79.30, 79.38],
      precision: 'city-center'
    };
  }
  return null;
}

module.exports = async (req, res) => {
  const query = normalizeAreaQuery(req.query.query || process.env.DEFAULT_PINCODE || '285123');
  const override = getLocationOverride(query);
  if (override) return res.json(override);

  const isPostalCode = /^\d{3,6}$/.test(query);

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: isPostalCode
        ? { postalcode: query, countrycodes: 'in', format: 'jsonv2', limit: 8, addressdetails: 1, dedupe: 1 }
        : { q: `${query}, India`, format: 'jsonv2', limit: 8, addressdetails: 1, dedupe: 1 },
      headers: { 'Accept-Language': 'en', 'User-Agent': 'AasPaas/1.0', Referer: 'https://aaspaas.vercel.app' },
      timeout: 8000
    });

    const result = response.data?.find(item => item?.lat && item?.lon) || response.data?.[0];

    if (result?.lat && result?.lon) {
      const bbox = Array.isArray(result.boundingbox) && result.boundingbox.length === 4
        ? result.boundingbox.map(v => parseFloat(v)) : null;
      return res.json({
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        displayName: result.display_name || `${query}, India`,
        placeId: result.place_id || null,
        bbox,
        precision: result.addresstype || (isPostalCode ? 'postal-code' : 'area')
      });
    }
  } catch (err) {
    console.warn('Geocode lookup failed:', err.message);
  }

  return res.status(404).json({ error: 'No location found for the given query.' });
};