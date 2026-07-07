/**
 * recommendController.js — Hệ thống gợi ý địa điểm nâng cao bằng Naive Bayes
 * Sử dụng NaiveBayesClassifier (bayesClassifier.js) thay cho NaiveBayes.js cũ
 */

const { db } = require("../config/firebase");
const NaiveBayesClassifier = require("../utils/bayesClassifier");
const { SearchPlaceIndexForTextCommand, LocationClient } = require("@aws-sdk/client-location");

const client = new LocationClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const PLACE_INDEX_NAME = process.env.AWS_PLACE_INDEX_NAME;

async function recommend(req, res) {
  try {
    const uid = req.user.uid;

    let history = [];
    try {
      const snapshot = await db
        .collection("users")
        .doc(uid)
        .collection("history")
        .orderBy("timestamp", "desc")
        .limit(100)
        .get();
      history = snapshot.docs.map((d) => d.data());
    } catch (dbErr) {
      console.warn("⚠️ [Recommend] Lỗi truy vấn Firestore (bảng chưa tạo hoặc lỗi kết nối), kích hoạt danh sách mặc định:", dbErr.message);
    }

    // 💡 GIẢI QUYẾT BÀI TOÁN COLD-START HOẶC LỖI KẾT NỐI DB
    // Nếu người dùng mới tinh chưa có lịch sử, trả về các gợi ý mặc định phổ biến quanh Quận 1
    if (history.length === 0) {
      const defaultPlaces = [
        { placeId: "df_1", name: "Cà phê Acoustic", address: "Ngô Thời Nhiệm, Quận 3", lat: 10.7811, lng: 106.6898, category: "coffee" },
        { placeId: "df_2", name: "Nhà Hàng Riverside Saigon", address: "Tôn Đức Thắng, Quận 1", lat: 10.7728, lng: 106.7062, category: "restaurant" },
        { placeId: "df_3", name: "Dinh Độc Lập", address: "Nam Kỳ Khởi Nghĩa, Quận 1", lat: 10.7769, lng: 106.6954, category: "museum" },
        { placeId: "df_4", name: "Công viên Tao Đàn", address: "Nguyễn Thị Minh Khai, Quận 1", lat: 10.7742, lng: 106.6908, category: "park" }
      ];
      return res.json({
        favoriteCategory: "Nơi phổ biến",
        topCategories: ["coffee", "restaurant", "museum", "park"],
        recommendations: defaultPlaces,
        modelStats: { totalSamples: 0, numCategories: 0, note: "Cold-start fallback activated due to empty history/db error" },
      });
    }

    // 2. Huấn luyện Naive Bayes
    const classifier = new NaiveBayesClassifier();
    classifier.train(history);

    // 3. Lấy ngữ cảnh hiện tại (giờ, ngày) để predict
    const now = new Date();
    const hour = now.getHours();
    let timeOfDay = 'unknown';
    if (hour >= 5 && hour < 11) timeOfDay = 'morning';
    else if (hour >= 11 && hour < 14) timeOfDay = 'midday';
    else if (hour >= 14 && hour < 18) timeOfDay = 'afternoon';
    else if (hour >= 18 && hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    const dayOfWeek = [0, 6].includes(now.getDay()) ? 'weekend' : 'weekday';

    // 4. Dự đoán top-3 danh mục
    const predictions = classifier.predict({ timeOfDay, dayOfWeek }, 3);
    const modelStats = classifier.getModelStats();

    // 5. Tìm địa điểm cho danh mục tốt nhất
    const bestCategory = predictions[0].category;
    const userLat = req.query.lat;
    const userLng = req.query.lng;

    const searchParams = {
      IndexName: PLACE_INDEX_NAME,
      Text: bestCategory,
      MaxResults: 5,
    };

    // Nếu có vị trí người dùng, tìm nearby
    if (userLat && userLng) {
      searchParams.BiasPosition = [parseFloat(userLng), parseFloat(userLat)];
    }

    const command = new SearchPlaceIndexForTextCommand(searchParams);
    const data = await client.send(command);

    const recommendations = (data.Results || []).map((r) => {
      const p = r.Place;
      return {
        placeId: p.PlaceId || Math.random().toString(),
        name: p.Label ? p.Label.split(",")[0] : "Unknown Place",
        address: p.Label,
        lat: p.Geometry.Point[1],
        lng: p.Geometry.Point[0],
      };
    });

    res.json({
      favoriteCategory: bestCategory,
      topCategories: predictions,
      recommendations,
      queryContext: { timeOfDay, dayOfWeek },
      modelStats,
    });
  } catch (err) {
    console.error("[RecommendController Error]", err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { recommend };