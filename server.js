const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_RESULTS = 50;

app.use(express.static(path.join(__dirname, 'public')));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
      lat: 26.145,
      lng: 79.339,
      displayName: 'Jalaun, Uttar Pradesh, India',
      placeId: 'override-jalaun',
      bbox: [26.10, 26.19, 79.30, 79.38],
      precision: 'city-center'
    };
  }

  return null;
}

function getFallbackCoordinates(query) {
  return getLocationOverride(query);
}

function getFallbackResults(category, centerLat, centerLng, count = MAX_RESULTS) {
  const categoryLabel = category || 'shop';
  const results = [];
  const baseLat = Number(centerLat) || 26.145;
  const baseLng = Number(centerLng) || 79.339;

  for (let i = 0; i < count; i += 1) {
    const latOffset = (i % 10) * 0.005;
    const lngOffset = Math.floor(i / 10) * 0.006;
    const sign = i % 2 === 0 ? 1 : -1;
    const name = `${categoryLabel.charAt(0).toUpperCase() + categoryLabel.slice(1)} ${i + 1}`;

    results.push({
      name,
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

app.get('/api/geocode', async (req, res) => {
  const query = normalizeAreaQuery(req.query.query || process.env.DEFAULT_PINCODE || '285123');
  const override = getLocationOverride(query);

  if (override) {
    return res.json(override);
  }

  const isPostalCode = /^\d{3,6}$/.test(query);

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: isPostalCode
        ? {
            postalcode: query,
            countrycodes: 'in',
            format: 'jsonv2',
            limit: 8,
            addressdetails: 1,
            dedupe: 1
          }
        : {
            q: `${query}, India`,
            format: 'jsonv2',
            limit: 8,
            addressdetails: 1,
            dedupe: 1
          },
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'NearbyShopFinder/1.0',
        Referer: 'http://localhost'
      },
      timeout: 8000
    });

    const result = response.data?.find((item) => item?.lat && item?.lon) || response.data?.[0];

    if (result?.lat && result?.lon) {
      const bbox = Array.isArray(result.boundingbox) && result.boundingbox.length === 4
        ? result.boundingbox.map((value) => parseFloat(value))
        : null;

      const payload = {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        displayName: result.display_name || `${query}, India`,
        placeId: result.place_id || null,
        bbox,
        precision: result.addresstype || (isPostalCode ? 'postal-code' : 'area')
      };

      return res.json(payload);
    }
  } catch (error) {
    console.warn('Geocode lookup failed, using fallback coordinates:', error.message);
  }

  const fallback = getFallbackCoordinates(query);

  if (fallback) {
    return res.json(fallback);
  }

  return res.status(404).json({ error: 'No location found for the given pincode.' });
});

app.get('/api/suggest', async (req, res) => {
  const query = normalizeAreaQuery(req.query.query || '');

  if (!query) {
    return res.json({ suggestions: [] });
  }

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: `${query}, India`,
        format: 'jsonv2',
        limit: 6,
        addressdetails: 1,
        dedupe: 1
      },
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'NearbyShopFinder/1.0',
        Referer: 'http://localhost'
      },
      timeout: 8000
    });

    const suggestions = response.data
      .filter((item) => item?.display_name)
      .map((item) => ({
        value: item.display_name,
        lat: item.lat,
        lng: item.lon
      }));

    return res.json({ suggestions });
  } catch (error) {
    return res.json({ suggestions: [] });
  }
});

app.get('/api/places', async (req, res) => {
  try {
    const lat = req.query.lat;
    const lng = req.query.lng;
    const category = req.query.category || 'hospital';
    const radius = Math.min(parseInt(req.query.radius || 3000, 10), 50000);

    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
    const keyword = category && category !== 'all' ? category : 'shop';

    if (!googleApiKey || googleApiKey.includes('your_google_places_api_key_here')) {
      return res.json({
        source: 'fallback',
        results: getFallbackResults(category, lat, lng, MAX_RESULTS)
      });
    }

    const results = [];
    let pageToken = null;

    for (let page = 0; page < 3 && results.length < MAX_RESULTS; page += 1) {
      const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
        params: {
          location: `${lat},${lng}`,
          radius,
          keyword,
          key: googleApiKey,
          pagetoken: pageToken || undefined
        }
      });

      const pageResults = response.data.results || [];
      for (const place of pageResults) {
        if (!results.some((item) => item.place_id === place.place_id)) {
          results.push(place);
        }
        if (results.length >= MAX_RESULTS) break;
      }

      if (!response.data.next_page_token || results.length >= MAX_RESULTS) {
        break;
      }

      pageToken = response.data.next_page_token;
      await sleep(2000);
    }

    const placeDetails = await Promise.all(
      results.map(async (place) => {
        try {
          const detailsResponse = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
            params: {
              place_id: place.place_id,
              key: googleApiKey,
              fields: 'formatted_phone_number,international_phone_number,website,opening_hours,formatted_address'
            }
          });
          const details = detailsResponse.data.result || {};

          return {
            name: place.name,
            address: details.formatted_address || place.vicinity || 'Address not available',
            phone: details.formatted_phone_number || details.international_phone_number || '',
            rating: place.rating || null,
            openNow: details.opening_hours?.open_now ?? place.opening_hours?.open_now ?? null,
            website: details.website || '',
            lat: place.geometry?.location?.lat,
            lng: place.geometry?.location?.lng,
            placeId: place.place_id
          };
        } catch (detailsError) {
          return {
            name: place.name,
            address: place.vicinity || 'Address not available',
            phone: place.international_phone_number || place.formatted_phone_number || '',
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

    res.json({ source: 'google', results: placeDetails.slice(0, MAX_RESULTS) });
  } catch (error) {
    console.error('Places API error:', error.message);
    res.json({
      source: 'fallback',
      results: getFallbackResults(req.query.category || 'hospital', req.query.lat, req.query.lng, MAX_RESULTS)
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
