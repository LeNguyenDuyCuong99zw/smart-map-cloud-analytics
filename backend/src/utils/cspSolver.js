/**
 * cspSolver.js — Bài toán Thỏa mãn Ràng buộc (CSP - Constraint Satisfaction Problem)
 * Áp dụng kiến thức: Chương 3 - CSP & Backtracking Search (Trí Tuệ Nhân Tạo - UTH)
 *
 * Bài toán: Sắp xếp lịch trình tham quan tối ưu cho N địa điểm
 *
 * Variables (Biến): Mỗi địa điểm là một biến, cần gán giá trị (khung giờ tham quan)
 * Domains (Miền giá trị): Các khung giờ có thể tham quan trong ngày
 * Constraints (Ràng buộc):
 *   - Tổng thời gian tham quan + di chuyển ≤ maxHours (mặc định 8 tiếng)
 *   - Địa điểm ăn trưa phải trong khung 11h-13h
 *   - Mỗi địa điểm có giờ mở/đóng cửa riêng
 *   - Không có 2 địa điểm được xếp cùng một khung giờ
 *
 * Giải thuật: Backtracking Search + Forward Checking
 */

const { haversineDistance } = require('./aStar');

// ─────────────────────────────────────────────
// Hằng số cấu hình CSP
// ─────────────────────────────────────────────
const DEFAULT_MAX_HOURS = 8;
const DEFAULT_START_HOUR = 8; // Bắt đầu lúc 8:00 AM
const DEFAULT_VISIT_DURATION = 60; // Mỗi điểm dừng mặc định 60 phút
const AVG_TRAVEL_SPEED_KMH = 30; // Tốc độ di chuyển trung bình (km/h) — trong nội thành

// Loại địa điểm và ràng buộc thời gian mặc định
const PLACE_TYPE_CONSTRAINTS = {
  restaurant: { openHour: 10, closeHour: 22, visitDuration: 60, mealTime: true },
  cafe: { openHour: 7, closeHour: 22, visitDuration: 45, mealTime: false },
  museum: { openHour: 8, closeHour: 17, visitDuration: 90, mealTime: false },
  park: { openHour: 6, closeHour: 21, visitDuration: 60, mealTime: false },
  shopping: { openHour: 9, closeHour: 22, visitDuration: 90, mealTime: false },
  hotel: { openHour: 0, closeHour: 24, visitDuration: 30, mealTime: false },
  default: { openHour: 8, closeHour: 20, visitDuration: 60, mealTime: false },
};

// ─────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────

/**
 * Tính thời gian di chuyển (phút) giữa 2 điểm dựa trên Haversine.
 */
function travelTimeMinutes(place1, place2) {
  const distKm = haversineDistance(place1.lat, place1.lng, place2.lat, place2.lng);
  return Math.round((distKm / AVG_TRAVEL_SPEED_KMH) * 60);
}

/**
 * Lấy ràng buộc cho một địa điểm dựa trên type.
 */
function getPlaceConstraints(place) {
  const type = (place.type || 'default').toLowerCase();
  return PLACE_TYPE_CONSTRAINTS[type] || PLACE_TYPE_CONSTRAINTS.default;
}

/**
 * Format số giờ (dạng float) thành chuỗi "HH:MM".
 */
function formatHour(decimalHour) {
  const h = Math.floor(decimalHour);
  const m = Math.round((decimalHour - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────
// CSP Backtracking Solver
// ─────────────────────────────────────────────

/**
 * Kiểm tra xem một assignment (thứ tự + thời gian) có thỏa mãn các ràng buộc không.
 *
 * @param {Array} assignment - Mảng các địa điểm đã được sắp xếp theo thứ tự
 *                             [{ place, startHour, endHour, travelFromPrev }]
 * @param {Object} options - { maxHours, startHour }
 * @returns {{ valid: boolean, reason: string }}
 */
function checkConstraints(assignment, options) {
  const { maxHours = DEFAULT_MAX_HOURS, startHour = DEFAULT_START_HOUR } = options;
  const endLimit = startHour + maxHours;

  let currentTime = startHour;

  for (let i = 0; i < assignment.length; i++) {
    const { place, constraints } = assignment[i];

    // Tính thời gian di chuyển từ điểm trước
    const travelMins =
      i === 0 ? 0 : travelTimeMinutes(assignment[i - 1].place, place);
    const travelHours = travelMins / 60;

    currentTime += travelHours;

    // Ràng buộc 1: Địa điểm chưa mở cửa → Chờ đến giờ mở
    if (currentTime < constraints.openHour) {
      currentTime = constraints.openHour;
    }

    // Ràng buộc 2: Địa điểm đã đóng cửa
    if (currentTime >= constraints.closeHour) {
      return {
        valid: false,
        reason: `${place.name} đã đóng cửa lúc ${formatHour(constraints.closeHour)}`,
      };
    }

    const visitDurationHours = constraints.visitDuration / 60;
    const departTime = currentTime + visitDurationHours;

    // Ràng buộc 3: Quán ăn phải trong khung 11h-14h
    if (constraints.mealTime) {
      if (currentTime < 10.5 || currentTime > 14) {
        return {
          valid: false,
          reason: `${place.name} (ăn uống) nên được xếp vào khung 11h-14h`,
        };
      }
    }

    // Ràng buộc 4: Phải hoàn thành trước giờ kết thúc
    if (departTime > endLimit) {
      return {
        valid: false,
        reason: `Lịch trình vượt quá ${maxHours} tiếng`,
      };
    }

    // Ghi nhận thời gian thực tế
    assignment[i].startHour = currentTime;
    assignment[i].endHour = departTime;
    assignment[i].travelFromPrev = travelMins;
    assignment[i].travelHours = travelHours;

    currentTime = departTime;
  }

  return { valid: true, reason: 'OK', totalEndHour: currentTime };
}

/**
 * Thuật toán Backtracking Search cho CSP.
 * Thử tất cả các hoán vị thứ tự và tìm ra lịch trình thỏa mãn ràng buộc.
 *
 * Tối ưu: Dùng heuristic "Ưu tiên xếp nhà hàng vào giữa ngày" (MRV-like)
 *
 * @param {Array} places - Mảng địa điểm: [{ id, name, lat, lng, type }]
 * @param {Object} options - { maxHours, startHour }
 * @returns {{ success: boolean, schedule: Array, totalTime: number }}
 */
function cspBacktracking(places, options = {}) {
  const { maxHours = DEFAULT_MAX_HOURS, startHour = DEFAULT_START_HOUR } = options;

  // Bước 1: Chuẩn bị — gắn ràng buộc vào từng địa điểm
  const placesWithConstraints = places.map((p) => ({
    place: p,
    constraints: getPlaceConstraints(p),
    startHour: null,
    endHour: null,
    travelFromPrev: 0,
    travelHours: 0,
  }));

  // Bước 2: Heuristic — Tách nhà hàng/quán ăn ra, đặt vào giữa
  const mealPlaces = placesWithConstraints.filter((p) => p.constraints.mealTime);
  const nonMealPlaces = placesWithConstraints.filter((p) => !p.constraints.mealTime);

  // Bước 3: Tạo thứ tự ưu tiên ban đầu (Greedy nearest-neighbor)
  const orderedNonMeal = greedyOrder(nonMealPlaces);

  // Bước 4: Chèn nhà hàng vào giữa lịch trình (tại vị trí hợp lý nhất)
  const bestSchedule = insertMealPlaces(orderedNonMeal, mealPlaces, options);

  // Bước 5: Nếu greedy thất bại, thử backtracking đầy đủ (tối đa 24 hoán vị)
  if (!bestSchedule.success && places.length <= 7) {
    const permutations = getPermutations(placesWithConstraints).slice(0, 5040); // 7! = 5040
    for (const perm of permutations) {
      const testPerm = perm.map((p) => ({ ...p }));
      const result = checkConstraints(testPerm, { maxHours, startHour });
      if (result.valid) {
        return buildScheduleResult(testPerm, result, startHour);
      }
    }
    // Vẫn không tìm được → trả về lịch trình tốt nhất có thể (relaxed)
    return buildScheduleResult(orderedNonMeal.concat(mealPlaces), { valid: false, reason: 'Relaxed' }, startHour);
  }

  return bestSchedule;
}

/**
 * Sắp xếp tham lam: Luôn đi đến điểm gần nhất tiếp theo (Nearest Neighbor heuristic).
 */
function greedyOrder(placesWithConstraints) {
  if (placesWithConstraints.length === 0) return [];

  const ordered = [placesWithConstraints[0]];
  const remaining = placesWithConstraints.slice(1);

  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];
    let minDist = Infinity;
    let closestIdx = 0;

    remaining.forEach((p, idx) => {
      const dist = haversineDistance(
        last.place.lat, last.place.lng,
        p.place.lat, p.place.lng
      );
      if (dist < minDist) {
        minDist = dist;
        closestIdx = idx;
      }
    });

    ordered.push(remaining[closestIdx]);
    remaining.splice(closestIdx, 1);
  }

  return ordered;
}

/**
 * Chèn các địa điểm ăn uống vào vị trí hợp lý nhất trong lịch trình.
 */
function insertMealPlaces(orderedPlaces, mealPlaces, options) {
  if (mealPlaces.length === 0) {
    const test = orderedPlaces.map((p) => ({ ...p }));
    const result = checkConstraints(test, options);
    return buildScheduleResult(test, result, options.startHour || DEFAULT_START_HOUR);
  }

  // Thử chèn nhà hàng vào giữa (vị trí lý tưởng)
  const midPoint = Math.floor(orderedPlaces.length / 2);
  const combined = [
    ...orderedPlaces.slice(0, midPoint),
    ...mealPlaces,
    ...orderedPlaces.slice(midPoint),
  ];

  const test = combined.map((p) => ({ ...p }));
  const result = checkConstraints(test, options);
  return buildScheduleResult(test, result, options.startHour || DEFAULT_START_HOUR);
}

/**
 * Sinh tất cả hoán vị của một mảng (Backtracking).
 */
function getPermutations(arr) {
  if (arr.length <= 1) return [arr];
  const result = [];
  arr.forEach((item, i) => {
    const rest = arr.filter((_, idx) => idx !== i);
    getPermutations(rest).forEach((perm) => result.push([item, ...perm]));
  });
  return result;
}

/**
 * Xây dựng object kết quả từ lịch trình đã tính toán.
 */
function buildScheduleResult(assignment, constraintResult, startHour) {
  const schedule = assignment.map((item, index) => ({
    order: index + 1,
    id: item.place.id,
    name: item.place.name,
    lat: item.place.lat,
    lng: item.place.lng,
    type: item.place.type || 'default',
    arrivalTime: item.startHour !== null ? formatHour(item.startHour) : null,
    departureTime: item.endHour !== null ? formatHour(item.endHour) : null,
    visitDuration: item.constraints.visitDuration,
    travelFromPrev: item.travelFromPrev,
    travelTimeText: item.travelFromPrev > 0 ? `${item.travelFromPrev} phút di chuyển` : 'Điểm xuất phát',
  }));

  const totalDuration = assignment.reduce(
    (sum, item) => sum + item.constraints.visitDuration / 60 + (item.travelHours || 0),
    0
  );

  return {
    success: constraintResult.valid,
    reason: constraintResult.reason,
    schedule,
    summary: {
      totalPlaces: schedule.length,
      startTime: formatHour(startHour),
      endTime: constraintResult.totalEndHour ? formatHour(constraintResult.totalEndHour) : null,
      totalDurationHours: parseFloat(totalDuration.toFixed(2)),
    },
  };
}

module.exports = { cspBacktracking, haversineDistance, travelTimeMinutes };
