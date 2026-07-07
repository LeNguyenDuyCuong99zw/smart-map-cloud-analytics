/**
 * aStar.js — Thuật toán Tìm đường A* (A-Star Search)
 * Áp dụng kiến thức: Chương 2 - Tìm kiếm Heuristic (Trí Tuệ Nhân Tạo - UTH)
 *
 * Heuristic được sử dụng: Công thức Haversine — tính khoảng cách thực tế
 * giữa 2 điểm trên bề mặt hình cầu Trái Đất dựa trên vĩ độ (lat) và kinh độ (lng).
 *
 * Kiến trúc:
 *   - Graph: Danh sách cạnh (edge list) giữa các node (tọa độ lat/lng)
 *   - Open Set: Min-Heap (Priority Queue) — luôn xử lý node có f(n) nhỏ nhất trước
 *   - f(n) = g(n) + h(n)
 *     - g(n): Chi phí thực tế từ điểm bắt đầu đến node n
 *     - h(n): Ước lượng chi phí từ node n đến đích (Haversine)
 */

// ─────────────────────────────────────────────
// Hàm Haversine — Tính khoảng cách địa lý (km)
// ─────────────────────────────────────────────
/**
 * Tính khoảng cách (km) giữa 2 điểm trên mặt cầu Trái Đất.
 * @param {number} lat1 - Vĩ độ điểm 1 (độ)
 * @param {number} lng1 - Kinh độ điểm 1 (độ)
 * @param {number} lat2 - Vĩ độ điểm 2 (độ)
 * @param {number} lng2 - Kinh độ điểm 2 (độ)
 * @returns {number} Khoảng cách tính bằng km
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Bán kính Trái Đất (km)
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Kết quả: km
}

// ─────────────────────────────────────────────
// Min-Heap (Priority Queue) — O(log n) insert/extract
// ─────────────────────────────────────────────
class MinHeap {
  constructor() {
    this.heap = [];
  }

  push(node) {
    this.heap.push(node);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  get size() {
    return this.heap.length;
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent].f <= this.heap[i].f) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  _sinkDown(i) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.heap[left].f < this.heap[smallest].f) smallest = left;
      if (right < n && this.heap[right].f < this.heap[smallest].f) smallest = right;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
}

// ─────────────────────────────────────────────
// Thuật toán A* (A-Star Search)
// ─────────────────────────────────────────────
/**
 * Tìm đường đi ngắn nhất từ start đến goal trong đồ thị địa lý.
 *
 * @param {Array} nodes - Mảng các node: [{ id, lat, lng }]
 * @param {Array} edges - Mảng các cạnh: [{ from, to, weight? }]
 *                        Nếu weight không có, tự tính bằng Haversine.
 * @param {string} startId - ID của node bắt đầu
 * @param {string} goalId  - ID của node đích
 * @returns {{ path: string[], distance: number, found: boolean }}
 *          path: Danh sách các node ID theo thứ tự đường đi tối ưu
 *          distance: Tổng khoảng cách (km)
 *          found: true nếu tìm được đường, false nếu không
 */
function aStar(nodes, edges, startId, goalId) {
  // Map nodeId → node object để tra cứu nhanh O(1)
  const nodeMap = {};
  nodes.forEach((n) => (nodeMap[n.id] = n));

  // Xây dựng danh sách kề (adjacency list)
  const adjacency = {};
  nodes.forEach((n) => (adjacency[n.id] = []));

  edges.forEach((edge) => {
    const fromNode = nodeMap[edge.from];
    const toNode = nodeMap[edge.to];
    if (!fromNode || !toNode) return;

    // Tính trọng số cạnh bằng Haversine nếu không được cung cấp
    const weight =
      edge.weight !== undefined
        ? edge.weight
        : haversineDistance(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng);

    adjacency[edge.from].push({ to: edge.to, weight });
    // Đồ thị vô hướng: thêm cạnh ngược
    adjacency[edge.to].push({ to: edge.from, weight });
  });

  const goalNode = nodeMap[goalId];
  if (!goalNode) return { path: [], distance: 0, found: false };

  // Hàm Heuristic h(n): Haversine từ node n đến đích
  const heuristic = (nodeId) => {
    const node = nodeMap[nodeId];
    if (!node) return Infinity;
    return haversineDistance(node.lat, node.lng, goalNode.lat, goalNode.lng);
  };

  // g(n): Chi phí thực tế từ start đến n (khởi tạo = Infinity)
  const gScore = {};
  nodes.forEach((n) => (gScore[n.id] = Infinity));
  gScore[startId] = 0;

  // Lưu vết đường đi: cameFrom[n] = node đến trước n
  const cameFrom = {};

  // Open Set: Min-Heap theo f(n) = g(n) + h(n)
  const openSet = new MinHeap();
  openSet.push({ id: startId, f: heuristic(startId) });

  // Closed Set: Các node đã được xử lý xong
  const closedSet = new Set();

  while (openSet.size > 0) {
    const current = openSet.pop();

    // ✅ Đến đích — Truy vết lại đường đi
    if (current.id === goalId) {
      const path = [];
      let curr = goalId;
      while (curr !== undefined) {
        path.unshift(curr);
        curr = cameFrom[curr];
      }
      return { path, distance: gScore[goalId], found: true };
    }

    if (closedSet.has(current.id)) continue;
    closedSet.add(current.id);

    // Duyệt các node láng giềng
    const neighbors = adjacency[current.id] || [];
    for (const neighbor of neighbors) {
      if (closedSet.has(neighbor.to)) continue;

      const tentativeG = gScore[current.id] + neighbor.weight;

      if (tentativeG < gScore[neighbor.to]) {
        cameFrom[neighbor.to] = current.id;
        gScore[neighbor.to] = tentativeG;
        const f = tentativeG + heuristic(neighbor.to);
        openSet.push({ id: neighbor.to, f });
      }
    }
  }

  // Không tìm được đường
  return { path: [], distance: 0, found: false };
}

// ─────────────────────────────────────────────
// Helper: Tạo đồ thị đầy đủ từ danh sách điểm
// (Kết nối tất cả các điểm với nhau — fully connected graph)
// ─────────────────────────────────────────────
/**
 * Từ danh sách các waypoints (điểm dừng), tạo đồ thị đầy đủ
 * với mọi cặp điểm được kết nối.
 * @param {Array} waypoints - [{ id, lat, lng, name }]
 * @returns {{ nodes, edges }}
 */
function buildFullGraph(waypoints) {
  const nodes = waypoints.map((wp) => ({
    id: wp.id,
    lat: wp.lat,
    lng: wp.lng,
  }));

  const edges = [];
  for (let i = 0; i < waypoints.length; i++) {
    for (let j = i + 1; j < waypoints.length; j++) {
      edges.push({
        from: waypoints[i].id,
        to: waypoints[j].id,
      });
    }
  }

  return { nodes, edges };
}

/**
 * Tìm đường đi tối ưu qua TẤT CẢ các waypoints theo thứ tự (A→B→C→D).
 * @param {Array} waypoints - [{ id, lat, lng, name }] theo thứ tự muốn đi
 * @returns {{ fullPath, totalDistance, segments, found }}
 */
function findRouteThrough(waypoints) {
  if (waypoints.length < 2) {
    return { fullPath: waypoints.map((w) => w.id), totalDistance: 0, segments: [], found: true };
  }

  const { nodes, edges } = buildFullGraph(waypoints);
  const segments = [];
  let fullPath = [waypoints[0].id];
  let totalDistance = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const result = aStar(nodes, edges, waypoints[i].id, waypoints[i + 1].id);
    if (!result.found) {
      return { fullPath: [], totalDistance: 0, segments: [], found: false };
    }
    // Bỏ điểm đầu của segment (đã có trong fullPath)
    fullPath = fullPath.concat(result.path.slice(1));
    totalDistance += result.distance;
    segments.push({
      from: waypoints[i].id,
      to: waypoints[i + 1].id,
      distance: result.distance,
      path: result.path,
    });
  }

  return { fullPath, totalDistance, segments, found: true };
}

module.exports = { aStar, haversineDistance, buildFullGraph, findRouteThrough };
