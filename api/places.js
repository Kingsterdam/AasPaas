const axios = require('axios');

const MAX_RESULTS = 50;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getFallbackResults(category, centerLat, centerLng, count = MAX_RESULTS) {
  const categoryLabel = category || 'shop';
  const results = [];
  const baseLat = Number(centerLat) || 26.145;
  const baseLng = Number(centerLng) || 79.339;

  for (let i = 0; i < count; i++) {
    const latOffset = (i % 10) * 0.005;
    const lngOffset = Math.floor(i / 10) * 0.006;
    const sign = i % 2 === 0 ? 1 : -1;
    results.push({
      name: `${categoryLabel.charAt(0).toUpperCase() + categoryLabel.slice(1)} ${i + 1}`,
      address: `Nearby area ${i + 1}, Jalaun, Uttar Pradesh`,
      phone: i % 3 === 0 ? `+91-9${String(100000000 + i).slice(1)}` : '',
      rating: (4.0 + (i % 5) * 0.2).toFixed(1),
      openNow: i % 4 !== 0,
      website: i % 2 === 0 ? 'https://example.com' : '',
      lat: baseLat + sign * latOffset,
      lng: baseLng + (i % 2 === 0 ? 1 : -1) * lngOffset,
      placeId: `fallback-${i + 1}`
    });
  }
  return results;
}

module.exports = async (req, res) => {
  const { lat, lng, category = 'hospital', radius: rawRadius } = req.query;
  const radius = Math.min(parseInt(rawRadius || 3000, 10), 50000);
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
  const keyword = category && category !== 'all' ? category : 'shop';

  // No API key → fallback demo data
  if (!googleApiKey || googleApiKey.includes('your_google_places_api_key_here')) {
    return res.json({
      source: 'fallback',
      results: getFallbackResults(category, lat, lng, MAX_RESULTS)
    });
  }

  try {
    const results = [];
    let pageToken = null;

    for (let page = 0; page < 3 && results.length < MAX_RESULTS; page++) {
      const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
        params: {
          location: `${lat},${lng}`,
          radius, keyword,
          key: googleApiKey,
          pagetoken: pageToken || undefined
        }
      });

      for (const place of (response.data.results || [])) {
        if (!results.some(r => r.place_id === place.place_id)) results.push(place);
        if (results.length >= MAX_RESULTS) break;
      }

      if (!response.data.next_page_token || results.length >= MAX_RESULTS) break;
      pageToken = response.data.next_page_token;
      await sleep(2000);
    }

    const placeDetails = await Promise.all(
      results.map(async place => {
        try {
          const { data } = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
            params: {
              place_id: place.place_id, key: googleApiKey,
              fields: 'formatted_phone_number,international_phone_number,website,opening_hours,formatted_address'
            }
          });
          const d = data.result || {};
          return {
            name: place.name,
            address: d.formatted_address || place.vicinity || 'Address not available',
            phone: d.formatted_phone_number || d.international_phone_number || '',
            rating: place.rating || null,
            openNow: d.opening_hours?.open_now ?? place.opening_hours?.open_now ?? null,
            website: d.website || '',
            lat: place.geometry?.location?.lat,
            lng: place.geometry?.location?.lng,
            placeId: place.place_id
          };
        } catch {
          return {
            name: place.name,
            address: place.vicinity || 'Address not available',
            phone: '',
            rating: place.rating || null,
            openNow: place.opening_hours?.open_now || null,
            website: '',
            lat: place.geometry?.location?.lat,
            lng: place.geometry?.location?.lng,
            placeId: place.place_id
          };
        }
      })
    );

    return res.json({ source: 'google', results: placeDetails.slice(0, MAX_RESULTS) });
  } catch (err) {
    console.error('Places API error:', err.message);
    return res.json({
      source: 'fallback',
      results: getFallbackResults(category, lat, lng, MAX_RESULTS)
    });
  }
};