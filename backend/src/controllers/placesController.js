const axios = require('axios');

const { 
  LocationClient, 
  SearchPlaceIndexForTextCommand,
  CalculateRouteCommand 
} = require("@aws-sdk/client-location");

// AWS Location Client config
const client = new LocationClient({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const PLACE_INDEX_NAME = process.env.AWS_PLACE_INDEX_NAME || 'MapPlaceIndex';
const ROUTE_CALCULATOR_NAME = process.env.AWS_ROUTE_CALCULATOR_NAME || 'MapRouteCalculator';
const FOURSQUARE_API_KEY = process.env.FOURSQUARE_API_KEY;

async function searchPlaces(req, res, next) {
  try {
    const { query = '', lat, lng, radius = 5000 } = req.query;

    if (!query.trim()) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    let command;
    if (lat && lng) {
      // bias towards position
      command = new SearchPlaceIndexForTextCommand({
        IndexName: PLACE_INDEX_NAME,
        Text: query,
        BiasPosition: [Number(lng), Number(lat)],
        MaxResults: 20
      });
    } else {
      command = new SearchPlaceIndexForTextCommand({
        IndexName: PLACE_INDEX_NAME,
        Text: query,
        MaxResults: 20
      });
    }

    const data = await client.send(command);

    const places = (data.Results || []).map(r => {
    const p = r.Place;

    // Xác định category từ tên địa điểm
    let category = "other";
    const label = (p.Label || "").toLowerCase();

    if (label.includes("coffee") || label.includes("cafe")) {
        category = "coffee";
    } else if (label.includes("restaurant") || label.includes("nhà hàng")) {
        category = "restaurant";
    } else if (label.includes("hotel") || label.includes("khách sạn")) {
        category = "hotel";
    } else if (label.includes("hospital") || label.includes("bệnh viện")) {
        category = "hospital";
    } else if (label.includes("school") || label.includes("trường")) {
        category = "school";
    }

    return {
        placeId: p.PlaceId || Math.random().toString(),
        name: p.Label ? p.Label.split(",")[0] : "Unknown Place",
        address: p.Label,
        lat: p.Geometry.Point[1],
        lng: p.Geometry.Point[0],
        category,
        rating: 4.5,
        isOpen: true
    };
});

    res.json({ places, total: places.length });
  } catch (err) {
    next(err);
  }
}

async function getDirections(req, res, next) {
  try {
    const { origin, destination, mode = 'driving' } = req.query;

    if (!origin || !destination) {
      return res.status(400).json({ error: '"origin" and "destination" are required' });
    }

    // Convert "lat,lng" string to [lng, lat] array
    const parsePosition = (str) => {
      const parts = str.split(',');
      if (parts.length === 2) {
        return [Number(parts[1].trim()), Number(parts[0].trim())]; 
      }
      return null;
    };

    const depPos = parsePosition(origin);
    const destPos = parsePosition(destination);

    if (!depPos || !destPos) {
        return res.status(400).json({ error: 'origin and destination must be in "lat,lng" format' });
    }

    const command = new CalculateRouteCommand({
      CalculatorName: ROUTE_CALCULATOR_NAME,
      DeparturePosition: depPos,
      DestinationPosition: destPos,
      TravelMode: mode === 'walking' ? 'Walking' : 'Car', // Map to AWS modes
      IncludeLegGeometry: true
    });

    const data = await client.send(command);

    if (!data.Legs || data.Legs.length === 0) {
        return res.status(404).json({ error: 'No route found' });
    }

    const leg = data.Legs[0];
    
    res.json({
      distance: { text: `${leg.Distance.toFixed(2)} km`, value: leg.Distance * 1000 },
      duration: { text: `${Math.round(leg.DurationSeconds / 60)} phút`, value: leg.DurationSeconds },
      startAddress: "Departure",
      endAddress: "Destination",
      steps: leg.Steps.map(s => ({
        instruction: "Tiếp tục đi thẳng", 
        distance: { value: s.Distance * 1000 },
        duration: { value: s.DurationSeconds },
        mode: mode
      })),
      // Geometry for drawing
      geometry: leg.Geometry.LineString 
    });
  } catch (err) {
    next(err);
  }
}

async function getPlaceDetails(req, res, next) {
  try {
    const { name, lat, lng } = req.query;

    if (!name || !lat || !lng) {
      return res.status(400).json({ error: 'name, lat, and lng are required' });
    }

    // Call Foursquare Search to get enriched data
    const response = await axios.get('https://api.foursquare.com/v3/places/search', {
      params: {
        query: name,
        ll: `${lat},${lng}`,
        radius: 100,
        fields: 'fsq_id,name,location,photos,rating,popularity,price,stats,hours,description,website,tel',
        limit: 1
      },
      headers: {
        'Authorization': FOURSQUARE_API_KEY,
        'Accept': 'application/json'
      }
    });

    const fsqPlace = response.data.results?.[0];

    if (!fsqPlace) {
      return res.json({ 
        name, 
        address: 'N/A', 
        rating: 4.0, 
        photos: [],
        message: 'No matching place found on Foursquare'
      });
    }

    // Process photos to get full URLs
    const photos = (fsqPlace.photos || []).map(p => `${p.prefix}original${p.suffix}`);

    res.json({
      fsq_id: fsqPlace.fsq_id,
      name: fsqPlace.name,
      address: fsqPlace.location?.formatted_address || 'N/A',
      rating: fsqPlace.rating ? fsqPlace.rating / 2 : 4.2, // FS is out of 10, we want 5
      photos: photos,
      price: fsqPlace.price,
      tel: fsqPlace.tel,
      website: fsqPlace.website,
      hours: fsqPlace.hours,
      popularity: fsqPlace.popularity,
      stats: fsqPlace.stats,
      description: fsqPlace.description
    });
  } catch (err) {
    console.error('Foursquare Error:', err.response?.data || err.message);
    // Return basic info if Foursquare fails
    res.json({ 
      name: req.query.name, 
      rating: 4.0, 
      photos: [],
      error: 'Failed to enrich data from Foursquare' 
    });
  }
}

module.exports = { searchPlaces, getDirections, getPlaceDetails };
