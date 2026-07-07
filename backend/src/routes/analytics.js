/**
 * routes/analytics.js — Proxy for AWS Analytics API
 */

const express = require('express');
const axios = require('axios');
const { verifyToken } = require('../middleware/auth');
const { getAIInsight } = require('../controllers/analyticsAIController');

const router = express.Router();

const ANALYTICS_API_URL = process.env.AWS_ANALYTICS_URL;
const ADMIN_EMAILS = ["admin@gmail.com", "dc1@gmail.com"];

/**
 * GET /api/analytics
 * Proxy request to AWS Lambda and return data
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    // 1. Kiểm tra quyền admin
    if (!ADMIN_EMAILS.includes(req.user?.email)) {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    if (!ANALYTICS_API_URL) {
      return res.status(500).json({ error: "AWS Analytics URL not configured" });
    }

    // 2. Fetch data from AWS Lambda
    const response = await axios.get(ANALYTICS_API_URL);
    const analyticsData = response.data;

    // Lọc bỏ tiền tố "Search: ", "Place: " và gộp các từ khóa trùng lặp
    if (analyticsData && Array.isArray(analyticsData.topPlaces)) {
      const mergedMap = new Map();
      analyticsData.topPlaces.forEach(item => {
        const cleanName = item.name 
          ? item.name.replace(/^Search:\s*/i, '').replace(/^Place:\s*/i, '').trim() 
          : '';
        if (cleanName) {
          const currentCount = mergedMap.get(cleanName) || 0;
          mergedMap.set(cleanName, currentCount + item.count);
        }
      });

      // Chuyển ngược lại thành mảng và sắp xếp lại theo lượt đếm giảm dần
      analyticsData.topPlaces = Array.from(mergedMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    }
    
    // 3. Return data to frontend
    res.json(analyticsData);
  } catch (error) {
    console.error('[ANALYTICS PROXY ERROR]', error.message);
    res.status(500).json({ 
      error: "Error fetching data from analytics service",
      details: error.message 
    });
  }
});

/**
 * GET /api/analytics/ai-insight
 * Tạo AI Insight Card từ dữ liệu thống kê (Admin only)
 */
router.get('/ai-insight', verifyToken, getAIInsight);

module.exports = router;
