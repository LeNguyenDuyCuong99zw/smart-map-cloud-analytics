/**
 * services/api.js — Axios instance để gọi backend API
 * 
 * Tự động:
 * - Gắn Authorization header với Firebase token
 * - Refresh token nếu nhận được 401
 * - Xử lý lỗi mạng
 */

import axios from 'axios';
import { auth } from '../config/firebase';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});
/** Gợi ý địa điểm bằng Naive Bayes */
export const getRecommendations = () =>
  api.get('/recommend');

// ── Request interceptor: gắn token ─────────────────────
api.interceptors.request.use(async (config) => {
  // Chờ Firebase auth khởi tạo nếu cần (đảm bảo currentUser không bị null oan)
  const user = await new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });

  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (err) => Promise.reject(err));


// ── Response interceptor: xử lý lỗi ───────────────────
api.interceptors.response.use(
  (response) => response.data,  // Unwrap .data tự động
  async (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // Token hết hạn → force refresh rồi retry 1 lần
      const user = auth.currentUser;
      if (user) {
        const newToken = await user.getIdToken(true); // force refresh
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return axios(error.config).then(r => r.data);
      }
    }

    // Lấy error message từ backend
    const message = error.response?.data?.error
      || error.message
      || 'Lỗi kết nối đến server';

    return Promise.reject(new Error(message));
  }
);

// ── API Functions ───────────────────────────────────────

/** Tìm địa điểm */
export const searchPlaces = (query, lat, lng) =>
  api.get('/places', { params: { query, lat, lng } });

/** Lấy chi tiết địa điểm (làm giàu bằng Foursquare) */
export const getPlaceDetails = (name, lat, lng) =>
  api.get('/places/details', { params: { name, lat, lng } });

/** Lấy chỉ đường */
export const getDirections = (origin, destination, mode = 'driving') =>
  api.get('/places/route/directions', { params: { origin, destination, mode } });

/** Lấy danh sách yêu thích */
export const getFavorites = () =>
  api.get('/favorites');

/** Thêm yêu thích */
export const addFavorite = (place) =>
  api.post('/favorites', place);

/** Xóa yêu thích */
export const removeFavorite = (id) =>
  api.delete(`/favorites/${id}`);

/** Lưu lịch sử */
export const saveHistory = (entry) =>
  api.post('/history', entry);

/** Lấy lịch sử */
export const getHistory = (limit = 20) =>
  api.get('/history', { params: { limit } });

/** Xóa toàn bộ lịch sử */
export const clearHistory = () =>
  api.delete('/history');

/** Giao tiếp với AI Chatbot */
export const chatWithAI = (message, locationContext) =>
  api.post('/ai/chat', { message, locationContext });

/** Gợi ý lộ trình AI */
export const suggestRouteWithAI = (prompt, origin) =>
  api.post('/ai/suggest-route', { prompt, origin });

/** Sinh kịch bản giọng nói cho lộ trình */
export const narrateRouteWithAI = (originName, destinationName, distanceText, durationText) =>
  api.post('/ai/narrate-route', { originName, destinationName, distanceText, durationText });

export default api;
