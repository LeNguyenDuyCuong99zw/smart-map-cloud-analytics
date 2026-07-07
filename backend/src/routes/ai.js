const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const rateLimit = require('express-rate-limit');

// Áp dụng Rate Limiting để tránh spam API làm cạn kiệt Quota/Chi phí
const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 phút
  max: 15, // Mỗi IP chỉ được gọi AI tối đa 15 lần/phút
  message: { error: 'Bạn đã gọi AI quá nhiều lần. Vui lòng đợi 1 phút để tiếp tục.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Áp dụng middleware giới hạn cho tất cả route AI
router.use(aiLimiter);

// POST /ai/chat
router.post('/chat', aiController.chat);

// POST /ai/suggest-route
router.post('/suggest-route', aiController.suggestRoute);

// POST /ai/narrate-route
router.post('/narrate-route', aiController.narrateRoute);

// POST /ai/local-route — Thuật toán A* tìm đường (tự cài đặt)
router.post('/local-route', aiController.localRoute);

// POST /ai/plan-trip — CSP Smart Trip Planner (Lên lịch trình thông minh)
router.post('/plan-trip', aiController.planTrip);

module.exports = router;
