/**
 * routes/analytics.js — Proxy for AWS Analytics API
 */

const express = require('express');
const axios = require('axios');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const ANALYTICS_API_URL = process.env.AWS_ANALYTICS_URL;
const ADMIN_EMAIL = "admin@gmail.com";

/**
 * GET /api/analytics
 * Proxy request to AWS Lambda and return data
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    // 1. Kiểm tra quyền admin (optional, already checked in frontend but good for security)
    if (req.user.email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    if (!ANALYTICS_API_URL) {
      return res.status(500).json({ error: "AWS Analytics URL not configured" });
    }

    // 2. Fetch data from AWS Lambda
    const response = await axios.get(ANALYTICS_API_URL);
    
    // 3. Return data to frontend
    res.json(response.data);
  } catch (error) {
    console.error('[ANALYTICS PROXY ERROR]', error.message);
    res.status(500).json({ 
      error: "Error fetching data from analytics service",
      details: error.message 
    });
  }
});

module.exports = router;
