/**
 * bayesClassifier.js — Thuật toán Naive Bayes đầy đủ
 * Áp dụng kiến thức: Chương 5 - Suy luận không chắc chắn / Xác suất Bayes (UTH)
 *
 * Công thức Bayes:
 *   P(category | features) ∝ P(category) × ∏ P(feature_i | category)
 *
 * Trong đó:
 *   - P(category) : Prior Probability — Xác suất tiên nghiệm của danh mục
 *   - P(feature | category) : Likelihood — Xác suất đặc trưng xuất hiện trong danh mục
 *   - Laplace Smoothing (α=1) để tránh xác suất bằng 0 (Zero-frequency Problem)
 *
 * Features được sử dụng:
 *   - category: danh mục địa điểm (cafe, restaurant, park, museum...)
 *   - timeOfDay: khung giờ tìm kiếm (morning, afternoon, evening, night)
 *   - dayOfWeek: ngày trong tuần (weekday, weekend)
 */

class NaiveBayesClassifier {
  constructor() {
    // Bộ đếm: số lần xuất hiện category
    this.categoryCounts = {};
    // Bộ đếm feature: categoryCounts[cat][feature][value] = count
    this.featureCounts = {};
    // Tổng số mẫu huấn luyện
    this.totalSamples = 0;
    // Tập hợp tất cả các giá trị có thể của từng feature (để Laplace smoothing)
    this.featureVocabulary = {};
    // Tập hợp tất cả các danh mục đã học
    this.categories = new Set();
  }

  // ─────────────────────────────────────────────
  // TRAINING PHASE — Học từ lịch sử
  // ─────────────────────────────────────────────

  /**
   * Trích xuất các features từ một record lịch sử.
   * @param {Object} historyItem - { category, timestamp, ... }
   * @returns {Object} features - { category, timeOfDay, dayOfWeek }
   */
  _extractFeatures(historyItem) {
    const features = {
      category: (historyItem.category || 'other').toLowerCase(),
      timeOfDay: 'unknown',
      dayOfWeek: 'unknown',
    };

    // Phân tích thời gian nếu có timestamp
    if (historyItem.timestamp || historyItem.createdAt) {
      const ts = historyItem.timestamp || historyItem.createdAt;
      const date = ts.toDate ? ts.toDate() : new Date(ts);

      if (!isNaN(date.getTime())) {
        const hour = date.getHours();
        const day = date.getDay(); // 0 = CN, 6 = T7

        // Phân loại khung giờ
        if (hour >= 5 && hour < 11) features.timeOfDay = 'morning';
        else if (hour >= 11 && hour < 14) features.timeOfDay = 'midday';
        else if (hour >= 14 && hour < 18) features.timeOfDay = 'afternoon';
        else if (hour >= 18 && hour < 22) features.timeOfDay = 'evening';
        else features.timeOfDay = 'night';

        // Phân loại ngày
        features.dayOfWeek = day === 0 || day === 6 ? 'weekend' : 'weekday';
      }
    }

    return features;
  }

  /**
   * Huấn luyện mô hình từ lịch sử người dùng.
   * @param {Array} history - Mảng các record lịch sử từ Firestore
   */
  train(history) {
    // Reset model
    this.categoryCounts = {};
    this.featureCounts = {};
    this.featureVocabulary = {};
    this.categories = new Set();
    this.totalSamples = history.length;

    history.forEach((item) => {
      const features = this._extractFeatures(item);
      const cat = features.category;

      // Đếm category (Prior)
      this.categories.add(cat);
      this.categoryCounts[cat] = (this.categoryCounts[cat] || 0) + 1;

      // Khởi tạo bộ đếm feature nếu chưa có
      if (!this.featureCounts[cat]) this.featureCounts[cat] = {};

      // Đếm từng feature-value pair (Likelihood)
      const featureNames = Object.keys(features).filter((f) => f !== 'category');
      featureNames.forEach((featureName) => {
        const featureValue = features[featureName];

        if (!this.featureCounts[cat][featureName]) {
          this.featureCounts[cat][featureName] = {};
        }

        this.featureCounts[cat][featureName][featureValue] =
          (this.featureCounts[cat][featureName][featureValue] || 0) + 1;

        // Thu thập vocabulary cho Laplace smoothing
        if (!this.featureVocabulary[featureName]) {
          this.featureVocabulary[featureName] = new Set();
        }
        this.featureVocabulary[featureName].add(featureValue);
      });
    });

    return this;
  }

  // ─────────────────────────────────────────────
  // PREDICTION PHASE — Dự đoán với Bayes
  // ─────────────────────────────────────────────

  /**
   * Tính log P(category | features) để tránh underflow số học.
   * Dùng Laplace Smoothing (alpha = 1) để tránh xác suất = 0.
   *
   * @param {string} category
   * @param {Object} queryFeatures - { timeOfDay, dayOfWeek }
   * @returns {number} Log-probability
   */
  _logProbability(category, queryFeatures) {
    if (!this.categoryCounts[category]) return -Infinity;

    const totalSamples = this.totalSamples || 1;
    const numCategories = this.categories.size;

    // Log Prior: log P(category) với Laplace smoothing
    const categoryCount = this.categoryCounts[category] || 0;
    let logProb = Math.log(
      (categoryCount + 1) / (totalSamples + numCategories)
    );

    // Log Likelihood: log P(feature_i | category) với Laplace smoothing
    const featureNames = Object.keys(queryFeatures);
    featureNames.forEach((featureName) => {
      const featureValue = queryFeatures[featureName];
      const vocabSize = this.featureVocabulary[featureName]
        ? this.featureVocabulary[featureName].size
        : 1;

      const featureCount =
        this.featureCounts[category]?.[featureName]?.[featureValue] || 0;
      const denominator = (this.categoryCounts[category] || 0) + vocabSize;

      logProb += Math.log((featureCount + 1) / denominator);
    });

    return logProb;
  }

  /**
   * Dự đoán top-N danh mục địa điểm phù hợp nhất cho user hiện tại.
   *
   * @param {Object} queryFeatures - { timeOfDay?, dayOfWeek? } — Ngữ cảnh hiện tại
   * @param {number} topN - Số danh mục muốn trả về (mặc định 3)
   * @returns {Array} [{ category, probability, logScore }] — Sắp xếp giảm dần theo xác suất
   */
  predict(queryFeatures = {}, topN = 3) {
    if (this.categories.size === 0) {
      return [{ category: 'other', probability: 1.0, logScore: 0 }];
    }

    // Tính log-probability cho từng category
    const scores = [];
    this.categories.forEach((cat) => {
      const logScore = this._logProbability(cat, queryFeatures);
      scores.push({ category: cat, logScore });
    });

    // Sắp xếp theo logScore giảm dần
    scores.sort((a, b) => b.logScore - a.logScore);

    // Chuyển log-score sang xác suất tương đối (softmax-like)
    const maxLog = scores[0].logScore;
    const expScores = scores.map((s) => ({
      ...s,
      exp: Math.exp(s.logScore - maxLog), // Trừ max để tránh overflow
    }));
    const totalExp = expScores.reduce((sum, s) => sum + s.exp, 0);

    return expScores.slice(0, topN).map((s) => ({
      category: s.category,
      probability: parseFloat((s.exp / totalExp).toFixed(4)),
      logScore: parseFloat(s.logScore.toFixed(4)),
    }));
  }

  /**
   * Dự đoán danh mục tốt nhất (đơn giản — tương thích ngược với NaiveBayes.js cũ).
   * @param {Array} history - Mảng lịch sử
   * @returns {string} Tên danh mục tốt nhất
   */
  predictBest(history) {
    this.train(history);
    const results = this.predict({}, 1);
    return results[0]?.category || 'other';
  }

  /**
   * Lấy thống kê đầy đủ về model đã học được.
   * @returns {Object} Thống kê
   */
  getModelStats() {
    const totalSamples = this.totalSamples;
    const numCategories = this.categories.size;

    const categoryStats = {};
    this.categories.forEach((cat) => {
      const count = this.categoryCounts[cat] || 0;
      categoryStats[cat] = {
        count,
        priorProbability: parseFloat((count / totalSamples).toFixed(4)),
      };
    });

    return {
      totalSamples,
      numCategories,
      categories: Array.from(this.categories),
      categoryStats,
    };
  }
}

module.exports = NaiveBayesClassifier;
