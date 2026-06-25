# Kế hoạch Tích hợp Trí tuệ Nhân tạo - Giai đoạn 2 (Advanced AI)

## Tổng quan

Dựa trên nền tảng của **Task 1** (đã tích hợp các tính năng AI cơ bản như Chatbot, Route Suggestion, Route Narration qua Gemini), **Giai đoạn 2** tập trung vào việc áp dụng các **thuật toán và lý thuyết AI cốt lõi** từ môn học Trí Tuệ Nhân Tạo (UTH). 

Mục tiêu của giai đoạn này là giúp dự án có chiều sâu về mặt học thuật, đồng thời giải quyết các bài toán thực tế của ứng dụng bản đồ thông minh một cách tối ưu nhất mà không phụ thuộc hoàn toàn vào API của bên thứ 3.

Dưới đây là 4 tính năng nâng cao tiếp theo:

---

## 🚀 Tính năng 1: Nâng cấp Chatbot thành Goal-based Agent (Multi-turn Memory)
*(Áp dụng kiến thức: Chương 1 - Tác tử thông minh)*

**Mô tả:** Chatbot hiện tại (Task 1) đang hoạt động như một *Reflex Agent* (nhận 1 câu hỏi, trả lời 1 câu và quên ngay). Chúng ta sẽ nâng cấp nó thành *Goal-based Agent*, có khả năng lưu trữ ngữ cảnh hội thoại (memory), hiểu được mục tiêu dài hạn của người dùng trong suốt phiên chat.

**Công nghệ:** Node.js + Gemini `startChat()` API + In-memory Session / Redis.

**Kiến trúc:**
```
User gửi tin nhắn (kèm sessionId)
    → Backend: Lấy lịch sử hội thoại từ Cache dựa trên sessionId
    → Gọi Gemini với history (Multi-turn)
    → Gemini sinh câu trả lời dựa trên ngữ cảnh các câu trước đó
    → Backend cập nhật Cache & trả về cho frontend
```

**Thay đổi cần làm:**
- **[MODIFY]** `backend/src/controllers/aiController.js` — Cập nhật hàm `chat` để quản lý `history` và dùng `model.startChat()`.
- **[MODIFY]** `web/src/components/AIChatPanel.jsx` — Quản lý state của cả đoạn hội thoại (danh sách tin nhắn) thay vì chỉ hiện tin nhắn mới nhất.

**Ước tính:** 1-2 ngày

---

## 🗺️ Tính năng 2: Thuật toán tìm đường A* (A* Search Implementation)
*(Áp dụng kiến thức: Chương 2 - Tìm kiếm & Tìm kiếm Heuristic)*

**Mô tả:** AWS Location Service hiện đang đảm nhận việc tìm đường (Routing). Để minh họa rõ lý thuyết môn học, dự án sẽ tự cài đặt thuật toán A* (A-Star) với Heuristic là khoảng cách Haversine, cho phép tìm đường đi ngắn nhất giữa các điểm (stops) tự định nghĩa hoặc trên một đồ thị thu nhỏ.

**Công nghệ:** Thuật toán Đồ thị (Graph Algorithm) thuần túy bằng JavaScript.

**Kiến trúc:**
```
Client yêu cầu tìm đường giữa nhiều điểm gợi ý
    → Backend: Khởi tạo đồ thị (Graph) cục bộ từ các tọa độ
    → Chạy hàm aStar(start, goal, heuristic)
    → Trả về lộ trình tối ưu (chuỗi các nodes)
    → Frontend vẽ đường Polyline dựa trên danh sách nodes
```

**Thay đổi cần làm:**
- **[NEW]** `backend/src/utils/aStar.js` — Chứa logic thuật toán A* và hàm tính khoảng cách địa lý (Haversine).
- **[NEW]** `backend/src/routes/ai.js` — Thêm endpoint `/ai/local-route`.
- **[MODIFY]** `backend/src/controllers/aiController.js` — Thêm hàm xử lý gọi A* và trả về geometry.

**Ước tính:** 2-3 ngày

---

## 📅 Tính năng 3: Smart Trip Planner (Bài toán Thỏa mãn Ràng buộc - CSP)
*(Áp dụng kiến thức: Chương 3 - Bài toán CSP & Backtracking)*

**Mô tả:** Tính năng "Lên lịch trình du lịch thông minh". Người dùng chọn 5-7 địa điểm muốn đi, hệ thống sẽ tự động sắp xếp thứ tự tham quan sao cho thỏa mãn các ràng buộc thực tế:
- Tổng thời gian tham quan ≤ 8 tiếng.
- Quán ăn trưa phải được xếp vào khung giờ 11h-13h.
- Bảo tàng đóng cửa lúc 17h.
- Tối ưu quãng đường di chuyển giữa các điểm.

**Công nghệ:** Giải thuật Constraint Satisfaction Problem (CSP) / Prompt Engineering nâng cao với Gemini.

**Kiến trúc:**
```
User chọn danh sách địa điểm + ràng buộc thời gian
    → POST /ai/plan-trip
    → Backend đóng gói Input + Constraints vào prompt hoặc chạy CSP Solver cục bộ
    → AI / Solver phân tích và tìm ra lời giải (Lịch trình) thỏa mãn
    → Trả về JSON Timeline (thời gian đến, thời gian đi cho từng điểm)
```

**Thay đổi cần làm:**
- **[NEW]** `backend/src/utils/cspSolver.js` (Tuỳ chọn nếu tự code logic) HOẶC dùng Gemini xử lý CSP.
- **[MODIFY]** `backend/src/controllers/aiController.js` — Thêm hàm `planTrip`.
- **[NEW]** `web/src/components/TripPlanner.jsx` — Giao diện hiển thị lịch trình dạng Timeline.

**Ước tính:** 3-4 ngày

---

## 🧠 Tính năng 4: Hệ thống Gợi ý Địa điểm bằng Naive Bayes
*(Áp dụng kiến thức: Chương 5 - Suy luận không chắc chắn / Xác suất Bayes)*

**Mô tả:** Xây dựng hệ thống gợi ý (Recommendation Engine) dựa trên thuật toán Naive Bayes. Mô hình sẽ học từ lịch sử tìm kiếm/yêu thích của người dùng để dự đoán xác suất họ sẽ thích một địa điểm cụ thể nào đó xung quanh vị trí hiện tại.

**Công nghệ:** Machine Learning (Naive Bayes) tự code bằng JavaScript (không dùng API ngoài).

**Kiến trúc:**
```
Dữ liệu: Lịch sử History của User trên Firestore (danh mục: cafe, nhà hàng, công viên...)
    → Backend lấy History → Train mô hình Naive Bayes đơn giản (đếm tần suất category)
    → Fetch các địa điểm xung quanh vị trí hiện tại từ AWS Location
    → Chạy hàm predict() của Naive Bayes để chấm điểm (score) từng địa điểm
    → Trả về danh sách Top 3 địa điểm có xác suất user thích cao nhất
```

**Thay đổi cần làm:**
- **[NEW]** `backend/src/utils/bayesClassifier.js` — Class NaiveBayes cài đặt logic huấn luyện và dự đoán.
- **[MODIFY]** `backend/src/controllers/aiController.js` — Thêm hàm `getRecommendations`.
- **[MODIFY]** `web/src/pages/MapPage.jsx` — Hiển thị panel "Gợi ý dành cho bạn" (Dựa trên thói quen).

**Ước tính:** 2-3 ngày

---

## Lộ trình Thực hiện Giai đoạn 2

```text
Tuần 1: Agent & Search
├── [Chương 1] Nâng cấp Multi-turn Chatbot
└── [Chương 2] Cài đặt và demo thuật toán A* (vẽ polyline đơn giản)

Tuần 2: Constraint & Probability
├── [Chương 3] Xây dựng Smart Trip Planner (Giao diện Timeline)
└── [Chương 5] Code Naive Bayes Classifier và tích hợp Recommend

Tuần 3: Testing & Báo cáo
├── Tích hợp toàn bộ lên Web Dashboard
└── Viết báo cáo: Map các tính năng với các chương của môn Trí Tuệ Nhân Tạo
```
