const { GoogleGenerativeAI } = require('@google/generative-ai');
const { LocationClient, SearchPlaceIndexForTextCommand, CalculateRouteCommand } = require("@aws-sdk/client-location");

const client = new LocationClient({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});
const PLACE_INDEX_NAME = process.env.AWS_PLACE_INDEX_NAME || 'MapPlaceIndex';
const ROUTE_CALCULATOR_NAME = process.env.AWS_ROUTE_CALCULATOR_NAME || 'MapRouteCalculator';

// Cache đơn giản (In-memory) để tránh gọi lại API AI với các yêu cầu trùng lặp
const aiCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 phút

const getFromCache = (key) => {
  if (aiCache.has(key)) {
    const { data, timestamp } = aiCache.get(key);
    if (Date.now() - timestamp < CACHE_TTL) return data;
    aiCache.delete(key);
  }
  return null;
};

const setToCache = (key, data) => {
  if (aiCache.size > 100) aiCache.clear(); // Chống rò rỉ bộ nhớ
  aiCache.set(key, { data, timestamp: Date.now() });
};

// Khởi tạo Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.chat = async (req, res, next) => {
  try {
    const { message, locationContext } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
    }

    // Chọn model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Tạo system prompt có chứa context vị trí
    let promptContext = 'Bạn là MAPVIT, một trợ lý AI tư vấn địa điểm, du lịch, và đường đi thân thiện, chuyên nghiệp. Luôn trả lời bằng tiếng Việt. Nếu người dùng hỏi địa điểm, hãy tư vấn dựa trên vị trí hiện tại của họ nếu có.';
    
    if (locationContext && locationContext.lat && locationContext.lng) {
      promptContext += `\nVị trí hiện tại của người dùng là vĩ độ: ${locationContext.lat}, kinh độ: ${locationContext.lng}.`;
    }

    const fullPrompt = `${promptContext}\n\nNgười dùng nói: "${message}"\n\nAI MAPVIT:`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error('[AI Chat Error]', error);
    next(error);
  }
};

exports.suggestRoute = async (req, res, next) => {
  try {
    const { origin, prompt } = req.body;
    if (!origin || !prompt) return res.status(400).json({ error: 'Origin and prompt required' });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
    
    // Kiểm tra cache
    const cacheKey = `suggest_${origin.lat}_${origin.lng}_${prompt}`;
    const cachedResponse = getFromCache(cacheKey);
    if (cachedResponse) return res.json(cachedResponse);

    // 1. Call Gemini to parse
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const aiPrompt = `Người dùng đang ở tọa độ lat: ${origin.lat}, lng: ${origin.lng}.
Họ muốn: "${prompt}".
Nếu họ yêu cầu đến 1 địa điểm cụ thể (VD: "chỉ đường đến bến xe"), hãy trả về duy nhất 1 điểm dừng là địa điểm đó. Nếu họ muốn dạo quanh/khám phá, hãy gợi ý 2 đến 3 trạm dừng.
Trả về KẾT QUẢ DUY NHẤT LÀ ĐỊNH DẠNG JSON hợp lệ, không markdown, không backtick, với cấu trúc:
{
  "explanation": "Câu giải thích ngắn gọn về lộ trình này",
  "searchQueries": ["tên địa điểm 1", "tên địa điểm 2 (nếu có)"]
}`;
    const result = await model.generateContent(aiPrompt);
    let text = (await result.response).text().trim();
    
    // Cleanup markdown if present
    text = text.replace(/^```json/, '').replace(/```$/, '').trim();
    
    let aiResponse;
    try {
      aiResponse = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON:', text);
      return res.status(500).json({ error: 'AI trả về định dạng không hợp lệ.' });
    }

    // 2. Find coordinates for each stop
    const stops = [];
    let currentPos = [Number(origin.lng), Number(origin.lat)];
    
    for (const query of aiResponse.searchQueries) {
      const searchCmd = new SearchPlaceIndexForTextCommand({
        IndexName: PLACE_INDEX_NAME,
        Text: query,
        BiasPosition: currentPos,
        MaxResults: 1
      });
      const searchRes = await client.send(searchCmd);
      if (searchRes.Results && searchRes.Results.length > 0) {
        const place = searchRes.Results[0].Place;
        stops.push({
          placeId: place.PlaceId || Math.random().toString(),
          name: place.Label ? place.Label.split(',')[0] : query,
          address: place.Label,
          lng: place.Geometry.Point[0],
          lat: place.Geometry.Point[1]
        });
        currentPos = place.Geometry.Point; // update position bias
      }
    }

    if (stops.length === 0) {
      return res.status(404).json({ error: 'Không thể tìm thấy địa điểm nào phù hợp.' });
    }

    // 3. Calculate Route
    const departure = [Number(origin.lng), Number(origin.lat)];
    const destination = [stops[stops.length - 1].lng, stops[stops.length - 1].lat];
    const waypoints = stops.slice(0, -1).map(s => [s.lng, s.lat]);

    const routeCmd = new CalculateRouteCommand({
      CalculatorName: ROUTE_CALCULATOR_NAME,
      DeparturePosition: departure,
      DestinationPosition: destination,
      WaypointPositions: waypoints.length > 0 ? waypoints : undefined,
      TravelMode: 'Car',
      IncludeLegGeometry: true
    });

    const routeRes = await client.send(routeCmd);
    if (!routeRes.Legs || routeRes.Legs.length === 0) {
      return res.status(404).json({ error: 'Không thể vẽ đường đi.' });
    }

    let fullGeometry = [];
    let totalDistance = 0;
    let totalDuration = 0;

    routeRes.Legs.forEach(leg => {
      fullGeometry = fullGeometry.concat(leg.Geometry.LineString);
      totalDistance += leg.Distance;
      totalDuration += leg.DurationSeconds;
    });

    const responseData = {
      explanation: aiResponse.explanation,
      stops: stops,
      route: {
        distanceText: `${totalDistance.toFixed(2)} km`,
        durationText: `${Math.round(totalDuration / 60)} phút`,
        geometry: fullGeometry
      }
    };

    // Lưu kết quả vào cache
    setToCache(cacheKey, responseData);

    res.json(responseData);

  } catch (err) {
    console.error('[AI Route Error]', err);
    next(err);
  }
};

exports.narrateRoute = async (req, res, next) => {
  try {
    const { originName, destinationName, distanceText, durationText } = req.body;
    if (!originName || !destinationName) return res.status(400).json({ error: 'Missing route info' });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });

    // Kiểm tra cache
    const cacheKey = `narrate_${originName}_${destinationName}_${distanceText}`;
    const cachedResponse = getFromCache(cacheKey);
    if (cachedResponse) return res.json(cachedResponse);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const aiPrompt = `Tạo một kịch bản dẫn đường bằng giọng nói (giống ứng dụng bản đồ như VietMap hay Google Maps) bằng tiếng Việt.
Thông tin lộ trình:
- Từ: ${originName}
- Đến: ${destinationName}
- Khoảng cách: ${distanceText}
- Thời gian dự kiến: ${durationText}

Bạn phải trả về KẾT QUẢ LÀ JSON hợp lệ chứa 4 câu nói tương ứng với 4 mốc thời gian của hành trình:
{
  "start": "Câu giới thiệu khi vừa bắt đầu đi (VD: Bắt đầu lộ trình đến..., khoảng cách..., đi cẩn thận...)",
  "mid1": "Câu hướng dẫn ở 1/3 quãng đường (VD: Tiếp tục đi thẳng, chú ý tốc độ...)",
  "mid2": "Câu hướng dẫn ở 2/3 quãng đường (VD: Sắp tới điểm đến, đường có thể đông...)",
  "end": "Câu thông báo khi đã tới nơi (VD: Bạn đã đến nơi, chúc một ngày tốt lành...)"
}`;

    const result = await model.generateContent(aiPrompt);
    let text = (await result.response).text().trim();
    text = text.replace(/^```json/, '').replace(/```$/, '').trim();

    try {
      const aiResponse = JSON.parse(text);
      setToCache(cacheKey, aiResponse);
      res.json(aiResponse);
    } catch (e) {
      console.error('Failed to parse JSON:', text);
      return res.status(500).json({ error: 'AI trả về định dạng không hợp lệ.' });
    }
  } catch (err) {
    console.error('[AI Narration Error]', err);
    next(err);
  }
};
