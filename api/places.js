const axios = require('axios');

const MAX_RESULTS = 50;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Map app category values → Google Places API keywords/types
const CATEGORY_KEYWORDS = {
  hospital:    { keyword: 'hospital',        type: 'hospital' },
  medical:     { keyword: 'medical store' },
  doctor:      { keyword: 'doctor clinic',   type: 'doctor' },
  dentist:     { keyword: 'dentist',         type: 'dentist' },
  clinic:      { keyword: 'clinic' },
  pharmacy:    { keyword: 'pharmacy',        type: 'pharmacy' },
  grocery:     { keyword: 'grocery store',   type: 'grocery_or_supermarket' },
  kirana:      { keyword: 'kirana store' },
  supermarket: { keyword: 'supermarket',     type: 'supermarket' },
  restaurant:  { keyword: 'restaurant',      type: 'restaurant' },
  food:        { keyword: 'food',            type: 'food' },
  cafe:        { keyword: 'cafe',            type: 'cafe' },
  bakery:      { keyword: 'bakery',          type: 'bakery' },
  juice:       { keyword: 'juice centre juice shop' },
  alcohol:     { keyword: 'wine shop liquor bar',    type: 'liquor_store' },
  gym:         { keyword: 'gym fitness centre',      type: 'gym' },
  clothing:    { keyword: 'clothing store',  type: 'clothing_store' },
  footwear:    { keyword: 'shoe store footwear' },
  electronics: { keyword: 'electronics store', type: 'electronics_store' },
  atm:         { keyword: 'ATM',             type: 'atm' },
  bank:        { keyword: 'bank',            type: 'bank' },
  petrol:      { keyword: 'petrol pump',     type: 'gas_station' },
  salon:       { keyword: 'salon hair',      type: 'hair_care' },
  laundry:     { keyword: 'laundry dry clean' },
  stationery:  { keyword: 'stationery book store' },
  school:      { keyword: 'school',          type: 'school' },
};

function buildPhotoUrl(photoReference, apiKey, maxWidth = 400) {
  if (!photoReference || !apiKey) return null;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${apiKey}`;
}

// Seeded pseudo-random so results are consistent per session but look natural
function seededRand(seed) {
  const x = Math.sin(seed + 1) * 43758.5453123;
  return x - Math.floor(x);
}

function getFallbackResults(category, centerLat, centerLng, count = MAX_RESULTS) {
  const categoryLabel = category || 'shop';
  const results = [];
  const baseLat = Number(centerLat) || 26.145;
  const baseLng = Number(centerLng) || 79.339;

  // Indian locality prefixes for natural-sounding addresses
  const localities = [
    'Civil Lines', 'Nehru Nagar', 'Gandhi Chowk', 'Subhash Nagar', 'Lal Bagh',
    'Station Road', 'Collectorganj', 'Sadar Bazar', 'New Colony', 'Old Town',
    'Raja Bazar', 'Adarsh Nagar', 'Indira Nagar', 'Shastri Nagar', 'Mahavir Colony',
    'Bhagat Singh Marg', 'MG Road', 'Patel Chowk', 'Tulsi Nagar', 'Ram Nagar',
  ];

  const categoryData = {
    hospital:    {
      names: ['City Hospital', 'General Hospital', 'Shree Ram Hospital', 'Govt District Hospital',
               'Lifeline Hospital', 'Apollo Clinic', 'Prakash Hospital', 'Jeevan Hospital',
               'Sanjivani Hospital', 'Dhanwantari Hospital', 'Saraswati Medical', 'Om Hospital',
               'Balaji Hospital', 'Krishna Hospital', 'Shivam Hospital', 'Janata Hospital',
               'Nav Jeevan Hospital', 'Central Hospital', 'Care Hospital', 'Sahara Hospital'],
    },
    pharmacy:    {
      names: ['Apollo Pharmacy', 'Jan Aushadhi Kendra', 'MedPlus', 'Dawai Ghar',
               'Shree Medical', 'Om Medicals', 'Vijay Medical Store', 'Jai Medicals',
               'Laxmi Medical Hall', 'Ram Medicals', 'Sanjay Drug House', 'New Medical Store',
               'Arora Medicals', 'Gupta Medical', 'Sharma Pharmacy', 'National Medical',
               'City Medicals', 'Vaishno Medicals', 'Ganesh Medical', 'Hanuman Medicals'],
    },
    restaurant:  {
      names: ['Shree Bhojanalaya', 'Hotel Annapurna', 'Punjabi Dhaba', 'South Indian Corner',
               'Hotel Sagar', 'Bombay Chowpati', 'Swad Restaurant', 'Gopal Bhojanalaya',
               'Udupi Restaurant', 'Haldiram Bhojanalaya', 'Hotel Natraj', 'Kwality Restaurant',
               'Moti Mahal', 'Surya Restaurant', 'Hotel Sangam', 'New Maharaja Hotel',
               'Vishwa Bharat', 'Ganga Dhaba', 'Shalimar Restaurant', 'Honest Restaurant'],
    },
    grocery:     {
      names: ['Fresh Mart', 'Daily Needs Store', 'Super Bazaar', 'Kiran General Store',
               'Reliance Smart', 'Big Bazaar', 'More Supermarket', 'D-Mart',
               'Gupta General Store', 'Sharma Provision', 'Laxmi Stores', 'Om Provision Store',
               'New India Store', 'Gauri Shankar Stores', 'Ramji Provision', 'Jai Bharat Stores',
               'City Mart', 'Annapurna Stores', 'National Provision', 'Popular Stores'],
    },
    kirana:      {
      names: ['Sharma Kirana', 'Gupta Kirana', 'Laxmi Kirana', 'Jai Kirana Store',
               'Om Namah Kirana', 'Ganesh Kirana', 'Shiv Kirana', 'Ram Kirana Store',
               'Popular Kirana', 'New Kirana', 'Vijay Kirana', 'Sonu Kirana',
               'Pappu General Store', 'Bablu Kirana', 'Raja Kirana', 'Raju Store',
               'Sanjay Kirana', 'Ramesh Store', 'Suresh Kirana', 'Ashok Store'],
    },
    gym:         {
      names: ['Fitness First', 'Iron Works Gym', 'Power Zone Gym', 'Gold Fitness',
               'Muscle Factory', 'Fit India Gym', 'Royal Gym', 'Champion Gym',
               'Body Shape Studio', 'Pro Fitness', 'Xtreme Fitness', 'Strong Man Gym',
               'Health Zone', 'Prime Fitness', 'Elite Gym', 'Power House',
               'Warrior Gym', 'Legend Fitness', 'Alpha Gym', 'Flex Studio'],
    },
    juice:       {
      names: ['Fresh Juice Corner', 'Vitamin Bar', 'Sugarcane King', 'Fruitful Drinks',
               'Green Leaf Juice', 'Nature Fresh', 'Cool Sip', 'Juice Junction',
               'Orange Tree', 'Fruity World', 'Fresh Fruitz', 'Healthy Sip',
               'Real Juice Bar', 'Tropical Drinks', 'Pappu Juice Centre', 'Shree Juice',
               'Ganna Juice Wala', 'Mango Heaven', 'Vitamin Hub', 'ABC Juices'],
    },
    alcohol:     {
      names: ['UP Wine Shop', 'Country Liquor Store', 'English Wine & Beer', 'Premium Wines',
               'Govt Wine Shop', 'City Bar', 'The Pub', 'Wine Palace',
               'Blue Label Store', 'Star Wines', 'Classic Liquors', 'Royal Bar',
               'UP Excise Shop', 'Beer Garden', 'Spirits Corner', 'Cheers Bar',
               'The Lounge', 'Desi Daru', 'Modern Bar', 'Silver Bar'],
    },
    atm:         {
      names: ['SBI ATM', 'HDFC Bank ATM', 'PNB ATM', 'Axis Bank ATM',
               'Bank of Baroda ATM', 'Canara Bank ATM', 'ICICI ATM', 'Union Bank ATM',
               'Yes Bank ATM', 'Kotak ATM', 'Bank of India ATM', 'Central Bank ATM',
               'Indian Bank ATM', 'UCO Bank ATM', 'IDBI Bank ATM', 'Punjab & Sind ATM'],
    },
    petrol:      {
      names: ['IOCL Petrol Pump', 'BPCL Fuel Station', 'HPCL Pump', 'HP Petrol Station',
               'Indian Oil Station', 'Bharat Petroleum', 'Hindustan Petroleum', 'Reliance Petrol',
               'Essar Fuel', 'Shell Station', 'Speed Fuels', 'Jio BP Station'],
    },
    bank:        {
      names: ['State Bank of India', 'HDFC Bank', 'Punjab National Bank', 'Bank of Baroda',
               'Canara Bank', 'ICICI Bank', 'Union Bank', 'Axis Bank',
               'Bank of India', 'Central Bank', 'Indian Bank', 'UCO Bank'],
    },
    cafe:        {
      names: ['Cafe Coffee Day', 'Barista', 'The Brew Room', 'Coffee House',
               'Chaai Sutta Bar', 'Kulhad Chai', 'MBA Chai Wala', 'Chai Point',
               'Teabox', 'Sip & Savour', 'The Coffee Shop', 'Irani Cafe',
               'Dolce Vita', 'Bean There', 'Roast & Toast', 'Chai Wala'],
    },
    salon:       {
      names: ['Lakme Salon', 'Naturals Salon', 'Style N Scissors', 'Hair Studio',
               'Jawed Habib', 'Green Trends', 'Enrich Salon', 'Affinity Salon',
               'Royal Cuts', 'Beauty Point', 'New Look Salon', 'Glamour Studio',
               'Scissors & Style', 'Star Salon', 'Smart Look', 'Fashion Studio'],
    },
    school:      {
      names: ['DAV Public School', 'Kendriya Vidyalaya', 'St. Xavier School', 'Delhi Public School',
               'Govt Inter College', 'Saraswati Shishu Mandir', 'Ryan International', 'Bal Bharati School',
               'Notre Dame Academy', 'Sacred Heart School', 'Jawahar Navodaya', 'Army Public School'],
    },
  };

  const cfg = categoryData[categoryLabel] || {
    names: Array.from({ length: 20 }, (_, i) => `${categoryLabel.charAt(0).toUpperCase() + categoryLabel.slice(1)} - ${localities[i % localities.length]}`),
  };

  // Use all unique names first, then stop (no repeating with numbers)
  const maxCount = Math.min(count, cfg.names.length);

  for (let i = 0; i < maxCount; i++) {
    const seed = i * 7 + categoryLabel.charCodeAt(0);

    // Scatter naturally: random angle + random distance up to ~8 km radius
    const angle    = seededRand(seed)       * 2 * Math.PI;
    const distance = seededRand(seed + 100) * 0.072 + 0.003; // ~0.3 km to ~8 km in degrees
    const lat = baseLat + Math.sin(angle) * distance;
    const lng = baseLng + Math.cos(angle) * distance * 1.2; // slight lng stretch for realism

    const locality = localities[i % localities.length];
    const reviewCount = Math.floor(seededRand(seed + 200) * 450) + 8;
    const rating = parseFloat((3.2 + seededRand(seed + 300) * 1.8).toFixed(1));

    results.push({
      name:        cfg.names[i],
      address:     `${locality}, ${categoryLabel === 'atm' || categoryLabel === 'bank' ? 'Near Main Branch, ' : ''}Jalaun, Uttar Pradesh`,
      phone:       i % 3 !== 0 ? `+91-${9000000000 + Math.floor(seededRand(seed + 400) * 999999999)}`.slice(0, 14) : '',
      rating,
      reviewCount,
      openNow:     seededRand(seed + 500) > 0.25,
      website:     i % 4 === 0 ? 'https://example.com' : '',
      photos:      [],
      lat,
      lng,
      placeId:     `fallback-${category}-${i}`,
      delivery:    seededRand(seed + 600) > 0.7,
    });
  }
  return results;
}

module.exports = async (req, res) => {
  const { lat, lng, category = 'hospital', radius: rawRadius } = req.query;
  const radius = Math.min(parseInt(rawRadius || 3000, 10), 50000);
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

  const catCfg = CATEGORY_KEYWORDS[category] || {};
  const keyword = catCfg.keyword || (category !== 'all' ? category : 'shop');
  const placeType = catCfg.type || undefined;

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
      const params = {
        location: `${lat},${lng}`,
        radius,
        keyword,
        key: googleApiKey,
        pagetoken: pageToken || undefined,
      };
      if (placeType) params.type = placeType;

      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
        { params }
      );

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
          const { data } = await axios.get(
            'https://maps.googleapis.com/maps/api/place/details/json',
            {
              params: {
                place_id: place.place_id,
                key: googleApiKey,
                fields: [
                  'formatted_phone_number',
                  'international_phone_number',
                  'website',
                  'opening_hours',
                  'formatted_address',
                  'user_ratings_total',
                  'photos',
                  'delivery',
                ].join(','),
              }
            }
          );
          const d = data.result || {};

          // Build photo URLs (max 3 photos)
          const photos = (d.photos || [])
            .slice(0, 3)
            .map(p => buildPhotoUrl(p.photo_reference, googleApiKey, 400))
            .filter(Boolean);

          return {
            name:        place.name,
            address:     d.formatted_address || place.vicinity || 'Address not available',
            phone:       d.formatted_phone_number || d.international_phone_number || '',
            rating:      place.rating || null,
            reviewCount: d.user_ratings_total || place.user_ratings_total || 0,
            openNow:     d.opening_hours?.open_now ?? place.opening_hours?.open_now ?? null,
            website:     d.website || '',
            photos,
            delivery:    Boolean(d.delivery),
            lat:         place.geometry?.location?.lat,
            lng:         place.geometry?.location?.lng,
            placeId:     place.place_id,
          };
        } catch {
          return {
            name:        place.name,
            address:     place.vicinity || 'Address not available',
            phone:       '',
            rating:      place.rating || null,
            reviewCount: place.user_ratings_total || 0,
            openNow:     place.opening_hours?.open_now || null,
            website:     '',
            photos:      [],
            delivery:    false,
            lat:         place.geometry?.location?.lat,
            lng:         place.geometry?.location?.lng,
            placeId:     place.place_id,
          };
        }
      })
    );

    return res.json({
      source: 'google',
      results: placeDetails.slice(0, MAX_RESULTS)
    });

  } catch (err) {
    console.error('Places API error:', err.message);
    return res.json({
      source: 'fallback',
      results: getFallbackResults(category, lat, lng, MAX_RESULTS)
    });
  }
};