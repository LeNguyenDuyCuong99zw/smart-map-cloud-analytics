/**
 * analyticsAIController.js — AI Phân tích Xu hướng Dashboard
 * Lấy dữ liệu thống kê từ AWS Lambda, đưa vào Gemini để tóm tắt thành Insight Card
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Cache insight để tránh gọi Gemini quá nhiều (TTL: 15 phút)
const insightCache = new Map();
const INSIGHT_CACHE_TTL = 15 * 60 * 1000;

/**
 * GET /api/analytics/ai-insight
 * Tạo AI Insight Card dựa trên dữ liệu thống kê từ AWS Lambda
 */
exports.getAIInsight = async (req, res, next) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY chưa được cấu hình.' });
    }
    if (!process.env.AWS_ANALYTICS_URL) {
      return res.status(500).json({ error: 'AWS_ANALYTICS_URL chưa được cấu hình.' });
    }

    // ✅ FIX: Kiểm tra quyền admin (giống analytics route chính)
    const ADMIN_EMAILS = ['admin@gmail.com', 'dc1@gmail.com'];
    if (!ADMIN_EMAILS.includes(req.user?.email)) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }


    const cached = insightCache.get('main');
    if (cached && Date.now() - cached.timestamp < INSIGHT_CACHE_TTL) {
      return res.json({ ...cached.data, fromCache: true });
    }

    // 1. Lấy dữ liệu thống kê từ AWS Lambda
    const analyticsResponse = await axios.get(process.env.AWS_ANALYTICS_URL);
    const analyticsData = analyticsResponse.data;

    const { totalRequests = 0, topPlaces = [] } = analyticsData;

    if (totalRequests === 0) {
      return res.json({
        insight: 'Hệ thống chưa có đủ dữ liệu để phân tích. Hãy khuyến khích người dùng sử dụng ứng dụng nhiều hơn! 🚀',
        stats: { totalRequests: 0, topKeyword: null, topPlace: null },
        generatedAt: new Date().toISOString(),
        fromCache: false,
      });
    }

    // 2. Chuẩn bị dữ liệu cho Gemini
    const topKeywords = topPlaces
      .filter((p) => !p.name.startsWith('Place: '))
      .slice(0, 5)
      .map((p) => `"${p.name.replace('Search: ', '')}" (${p.count} lần)`);

    const topPlacesList = topPlaces
      .filter((p) => p.name.startsWith('Place: '))
      .slice(0, 5)
      .map((p) => `"${p.name.replace('Place: ', '')}" (${p.count} lần)`);

    const prompt = `Bạn là chuyên gia phân tích dữ liệu người dùng ứng dụng bản đồ. 
Dưới đây là dữ liệu thống kê từ hệ thống Smart Map:
- Tổng số lượt tương tác: ${totalRequests}
- Từ khóa tìm kiếm phổ biến nhất: ${topKeywords.join(', ') || 'Chưa có'}
- Địa điểm được xem nhiều nhất: ${topPlacesList.join(', ') || 'Chưa có'}

Hãy viết một đoạn phân tích ngắn (3-4 câu) bằng tiếng Việt, thân thiện và chuyên nghiệp, 
nêu ra xu hướng nổi bật, insight thú vị, và gợi ý cải thiện nếu có. 
Sử dụng emoji phù hợp để tạo cảm giác sinh động.`;

    // 3. Gọi Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const insight = result.response.text();

    const responseData = {
      insight,
      stats: {
        totalRequests,
        topKeyword: topKeywords[0] || null,
        topPlace: topPlacesList[0] || null,
        totalKeywords: topKeywords.length,
        totalTrackedPlaces: topPlacesList.length,
      },
      generatedAt: new Date().toISOString(),
      fromCache: false,
    };

    // Lưu cache
    insightCache.set('main', { data: responseData, timestamp: Date.now() });

    res.json(responseData);
  } catch (err) {
    console.error('[Analytics AI Insight Error]', err.message);
    next(err);
  }
};
