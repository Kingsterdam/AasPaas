const axios = require('axios');

module.exports = async (req, res) => {
  const query = String(req.query.query || '').trim();
  if (!query) return res.json({ suggestions: [] });

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: `${query}, India`, format: 'jsonv2', limit: 6, addressdetails: 1, dedupe: 1 },
      headers: { 'Accept-Language': 'en', 'User-Agent': 'AasPaas/1.0', Referer: 'https://aaspaas.vercel.app' },
      timeout: 8000
    });

    const suggestions = response.data
      .filter(item => item?.display_name)
      .map(item => ({ value: item.display_name, lat: item.lat, lng: item.lon }));

    return res.json({ suggestions });
  } catch {
    return res.json({ suggestions: [] });
  }
};