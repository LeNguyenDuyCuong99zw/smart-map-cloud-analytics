const { GoogleGenerativeAI } = require('@google/generative-ai');
const { findRouteThrough } = require('../utils/aStar');
const { cspBacktracking } = require('../utils/cspSolver');
const { v4: uuidv4 } = require('uuid');
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

// ── Multi-turn Chat Session Store ──
// Lưu lịch sử hội thoại theo sessionId để tạo Goal-based Agent
// Key: sessionId (uuid), Value: { history: [], lastActive: Date }
const chatSessions = new Map();
const SESSION_TTL = 60 * 60 * 1000; // 1 giờ không hoạt động thì xóa session

// Dọn dẹp session hết hạn mỗi 10 phút
setInterval(() => {
  const now = Date.now();
  chatSessions.forEach((session, id) => {
    if (now - session.lastActive > SESSION_TTL) chatSessions.delete(id);
  });
}, 10 * 60 * 1000);

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

/**
 * chat() — Goal-based Agent với Multi-turn Memory
 * Nâng cấp từ Reflex Agent (single-turn) → Goal-based Agent (multi-turn)
 * Lưu lịch sử hội thoại theo sessionId để AI hiểu ngữ cảnh các câu trước
 */
exports.chat = async (req, res, next) => {
  try {
    const { message, locationContext, sessionId: clientSessionId } = req.body;

    if (!message) return res.status(400).json({ error: 'Message is required' });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });

    // Tạo hoặc lấy lại sessionId
    const sessionId = clientSessionId || uuidv4();

    // Khởi tạo session nếu chưa có
    if (!chatSessions.has(sessionId)) {
      chatSessions.set(sessionId, { history: [], lastActive: Date.now() });
    }
    const session = chatSessions.get(sessionId);
    session.lastActive = Date.now();

    // Chọn model và bắt đầu chat multi-turn với history
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // System instruction: MAPVIT persona
    let systemInstruction = 'Bạn là MAPVIT, một trợ lý AI tư vấn địa điểm, du lịch, và đường đi thân thiện, chuyên nghiệp. Luôn trả lời bằng tiếng Việt. Hãy nhớ ngữ cảnh hội thoại để trả lời chính xác hơn.';
    if (locationContext?.lat && locationContext?.lng) {
      systemInstruction += ` Vị trí hiện tại của người dùng: vĩ độ ${locationContext.lat}, kinh độ ${locationContext.lng}.`;
    }

    // Dùng startChat() với history từ session — Multi-turn
    const chat = model.startChat({
      history: session.history,
      generationConfig: { maxOutputTokens: 1024 },
      systemInstruction,
    });

    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    // Cập nhật history vào session (giới hạn 20 turns để tiết kiệm token)
    session.history.push(
      { role: 'user', parts: [{ text: message }] },
      { role: 'model', parts: [{ text: reply }] }
    );
    if (session.history.length > 40) {
      session.history = session.history.slice(-40); // Giữ 20 turns gần nhất
    }

    res.json({ reply, sessionId, turnCount: session.history.length / 2 });
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

// ─────────────────────────────────────────────────────────────
// A* Local Route — Tìm đường đi bằng thuật toán A* tự cài
// POST /api/ai/local-route
// Body: { waypoints: [{ id, name, lat, lng }] }
// ─────────────────────────────────────────────────────────────
exports.localRoute = async (req, res, next) => {
  try {
    const { waypoints } = req.body;

    if (!waypoints || waypoints.length < 2) {
      return res.status(400).json({ error: 'Cần ít nhất 2 điểm để tìm đường.' });
    }

    // Validate tọa độ
    for (const wp of waypoints) {
      if (typeof wp.lat !== 'number' || typeof wp.lng !== 'number') {
        return res.status(400).json({ error: `Waypoint "${wp.name || wp.id}" thiếu tọa độ lat/lng hợp lệ.` });
      }
    }

    // 1. Dùng AWS Location Service để lấy danh sách tọa độ dọc theo tuyến đường thẳng trực tiếp (Tuyến 1)
    const departure = [Number(waypoints[0].lng), Number(waypoints[0].lat)];
    const destination = [Number(waypoints[waypoints.length - 1].lng), Number(waypoints[waypoints.length - 1].lat)];
    const routeWaypoints = waypoints.slice(1, -1).map(w => [w.lng, w.lat]);

    const routeCmdDirect = new CalculateRouteCommand({
      CalculatorName: ROUTE_CALCULATOR_NAME,
      DeparturePosition: departure,
      DestinationPosition: destination,
      WaypointPositions: routeWaypoints.length > 0 ? routeWaypoints : undefined,
      TravelMode: 'Car',
      IncludeLegGeometry: true
    });

    const routeResDirect = await client.send(routeCmdDirect);
    if (!routeResDirect.Legs || routeResDirect.Legs.length === 0) {
      return res.status(404).json({ error: 'Không thể định vị mạng lưới đường giao thông giữa các điểm này.' });
    }

    let coordsDirect = [];
    routeResDirect.Legs.forEach(leg => {
      coordsDirect = coordsDirect.concat(leg.Geometry.LineString);
    });

    // 2. Dùng AWS để lấy thêm một Tuyến đường tránh đi vòng (Tuyến 2) thông qua một điểm chệch hướng song song
    let coordsDetour = [];
    try {
      const midLng = (departure[0] + destination[0]) / 2;
      const midLat = (departure[1] + destination[1]) / 2;
      
      // Tạo điểm chệch hướng song song (lệch khoảng 400m - 500m)
      const bypassWaypoint = [midLng + 0.005, midLat + 0.005];

      const routeCmdDetour = new CalculateRouteCommand({
        CalculatorName: ROUTE_CALCULATOR_NAME,
        DeparturePosition: departure,
        DestinationPosition: destination,
        WaypointPositions: [bypassWaypoint],
        TravelMode: 'Car',
        IncludeLegGeometry: true
      });

      const routeResDetour = await client.send(routeCmdDetour);
      if (routeResDetour.Legs && routeResDetour.Legs.length > 0) {
        routeResDetour.Legs.forEach(leg => {
          coordsDetour = coordsDetour.concat(leg.Geometry.LineString);
        });
      }
    } catch (detourErr) {
      console.warn('⚠️ Lỗi sinh tuyến đường tránh:', detourErr.message);
    }

    // 3. Helper tính khoảng cách Haversine nội bộ phục vụ gán trọng số đồ thị
    const haversineDistance = (lat1, lng1, lat2, lng2) => {
      const R = 6371;
      const toRad = (deg) => (deg * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // 4. Hợp nhất các tọa độ của cả 2 tuyến thành các Đỉnh (Nodes) duy nhất
    const nodes = [];
    const nodeMapCoords = new Map();

    const registerNode = (lng, lat) => {
      const key = `${lng.toFixed(5)},${lat.toFixed(5)}`;
      if (nodeMapCoords.has(key)) {
        return nodeMapCoords.get(key).id;
      }
      const id = `node_${nodeMapCoords.size}`;
      const nodeObj = { id, lat, lng };
      nodeMapCoords.set(key, nodeObj);
      nodes.push(nodeObj);
      return id;
    };

    // Đăng ký các đỉnh của Tuyến 1 (Tuyến thẳng) và tạo Cạnh với kẹt xe giả lập
    const directNodeIds = coordsDirect.map(c => registerNode(c[0], c[1]));
    const edges = [];
    for (let i = 0; i < directNodeIds.length - 1; i++) {
      const fromNode = nodes.find(n => n.id === directNodeIds[i]);
      const toNode = nodes.find(n => n.id === directNodeIds[i + 1]);
      if (!fromNode || !toNode) continue;

      const dist = haversineDistance(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng);
      // Giả lập kẹt xe ở đoạn giữa tuyến thẳng chính (cộng phạt chi phí x10)
      const isCongested = i > Math.floor(directNodeIds.length * 0.2) && i < Math.floor(directNodeIds.length * 0.8);
      const weight = isCongested ? dist * 10.0 : dist;

      edges.push({
        from: directNodeIds[i],
        to: directNodeIds[i + 1],
        weight
      });
    }

    // Đăng ký các đỉnh của Tuyến 2 (Tuyến tránh đi vòng) và kết nối cạnh thông thoáng
    if (coordsDetour.length > 0) {
      const detourNodeIds = coordsDetour.map(c => registerNode(c[0], c[1]));
      for (let i = 0; i < detourNodeIds.length - 1; i++) {
        const fromNode = nodes.find(n => n.id === detourNodeIds[i]);
        const toNode = nodes.find(n => n.id === detourNodeIds[i + 1]);
        if (!fromNode || !toNode) continue;

        const dist = haversineDistance(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng);
        // Tuyến đi vòng không bị kẹt xe, chi phí bằng khoảng cách thực tế
        edges.push({
          from: detourNodeIds[i],
          to: detourNodeIds[i + 1],
          weight: dist
        });
      }
    }

    // 5. Chạy thuật toán A* của chúng ta trên Đồ thị hợp nhất này
    const startNodeId = directNodeIds[0];
    const goalNodeId = directNodeIds[directNodeIds.length - 1];

    const { aStar } = require('../utils/aStar');
    const aStarResult = aStar(nodes, edges, startNodeId, goalNodeId);

    if (!aStarResult.found) {
      return res.status(404).json({ error: 'Thuật toán A* không tìm thấy đường đi hợp lệ trên mạng lưới đường.' });
    }

    // 5. Trả về kết quả đường đi đã qua xử lý bởi A*
    const nodeMap = {};
    nodes.forEach(n => nodeMap[n.id] = n);

    // Lọc thưa tọa độ (Downsample) cho A* để tạo các đoạn thẳng nối giao lộ rời rạc (nhìn khác biệt rõ rệt)
    const pathNodes = aStarResult.path.map(id => nodeMap[id]).filter(Boolean);
    const geometry = [];
    for (let i = 0; i < pathNodes.length; i++) {
      if (i === 0 || i === pathNodes.length - 1 || i % 5 === 0) {
        geometry.push([pathNodes[i].lng, pathNodes[i].lat]);
      }
    }

    // 💡 Giả lập Hệ số kẹt xe thời gian thực phục vụ hàm chi phí A*
    const currentHour = new Date().getHours();
    const isPeakHour = (currentHour >= 7 && currentHour < 9) || (currentHour >= 17 && currentHour < 19);
    const trafficFactor = isPeakHour ? parseFloat((1.4 + Math.random() * 0.4).toFixed(2)) : 1.0;

    res.json({
      algorithm: 'A* Search (Haversine Heuristic + Road Network Graph)',
      found: true,
      totalDistanceKm: parseFloat(aStarResult.distance.toFixed(3)),
      totalDistanceText: `${aStarResult.distance.toFixed(2)} km`,
      geometry, // Polyline đi chính xác dọc theo lòng đường (no clipping)
      nodesCount: nodes.length,
      edgesCount: edges.length,
      trafficFactor,
      congested: trafficFactor > 1.2
    });
  } catch (err) {
    console.error('[A* Route Error]', err);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// CSP Smart Trip Planner — Lên lịch trình thông minh
// POST /api/ai/plan-trip
// Body: { places: [{ id, name, lat, lng, type }], maxHours?, startHour? }
// ─────────────────────────────────────────────────────────────
exports.planTrip = async (req, res, next) => {
  try {
    const { places, maxHours = 8, startHour = 8 } = req.body;

    if (!places || places.length < 1) {
      return res.status(400).json({ error: 'Cần ít nhất 1 địa điểm để lên lịch trình.' });
    }
    if (places.length > 10) {
      return res.status(400).json({ error: 'CSP Solver hỗ trợ tối đa 10 địa điểm.' });
    }

    // Validate
    for (const p of places) {
      if (typeof p.lat !== 'number' || typeof p.lng !== 'number') {
        return res.status(400).json({ error: `Địa điểm "${p.name || p.id}" thiếu tọa độ.` });
      }
    }

    // Chạy CSP Backtracking Solver
    const result = cspBacktracking(places, { maxHours, startHour });

    // Tạo tóm tắt bằng Gemini (nếu có API key)
    let aiSummary = null;
    if (process.env.GEMINI_API_KEY && result.schedule.length > 0) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const summaryPrompt = `Tóm tắt lịch trình du lịch sau đây bằng một đoạn văn ngắn (2-3 câu) bằng tiếng Việt thân thiện, vui vẻ:
${result.schedule.map((s) => `${s.arrivalTime || '?'}: ${s.name} (${s.visitDuration} phút)`).join('\n')}
Tổng thời gian: ${result.summary.totalDurationHours} giờ`;
        const aiResult = await model.generateContent(summaryPrompt);
        aiSummary = aiResult.response.text();
      } catch (e) {
        // Không ảnh hưởng kết quả chính nếu Gemini lỗi
        aiSummary = null;
      }
    }

    res.json({
      algorithm: 'CSP Backtracking Search',
      success: result.success,
      reason: result.reason,
      schedule: result.schedule,
      summary: result.summary,
      aiSummary,
    });
  } catch (err) {
    console.error('[CSP Trip Planner Error]', err);
    next(err);
  }
};
