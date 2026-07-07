# Tổng hợp Tính năng AI và VietMap cho Smart Map Cloud Analytics

Dựa trên hai tài liệu `Task1.md` và `Task2_Advanced_AI.md`, dưới đây là bản tổng hợp chi tiết về **những công việc chưa thực hiện (To-Do)** và **cách kết hợp các tính năng AI với dịch vụ của VIETMAP** (thay thế cho AWS Location Service để tối ưu cho thị trường Việt Nam).

## 1. Trạng thái các tính năng AI (Tiến độ thực hiện)

Dưới đây là danh sách các tính năng được liệt kê trong 2 Task, đã được đánh dấu trạng thái (hoàn thành hoặc chưa làm) dựa trên mã nguồn thực tế:

### Giai đoạn 1: Tích hợp AI Cơ bản (Sử dụng API Gemini)
- [x] **AI Chatbot Tư vấn Địa điểm:** Viết controller xử lý chat với Gemini và tạo giao diện chat trên Web. ✔️ *Đã nâng cấp lên **Goal-based Agent** (Multi-turn Memory, quản lý session theo sessionId)*
- [x] **AI Phân tích Xu hướng (Dashboard):** Lấy dữ liệu thống kê từ DynamoDB/Firestore đưa cho AI tóm tắt, hiển thị Insight Card. ✔️ *đã code `analyticsAIController.js` + UI Insight Card gradient trên AnalyticsPage*
- [x] **Gợi ý Địa điểm Thông minh:** Đọc lịch sử tìm kiếm từ Firestore, dùng AI phân tích sở thích để gợi ý địa điểm. ✔️ *đã có API suggestRoute*
- [x] **Smart Route Narration (Chỉ đường bằng giọng nói):** Phân tích dữ liệu tuyến đường (geometry) và dùng AI dịch thành hướng dẫn tự nhiên bằng tiếng Việt. ✔️ *Sử dụng **NLP (Gemini LLM)** — không phải thuật toán cổ điển, xem giải thích bên dưới*
- [x] **Thuật toán Tìm đường A*:** Tự code thuật toán A* bằng JavaScript (tính khoảng cách Haversine) thay vì dùng API có sẵn. ✔️ *đã code `utils/aStar.js` với Min-Heap + Haversine heuristic + endpoint `/ai/local-route`*

### Giai đoạn 2: Trí tuệ Nhân tạo Nâng cao (Thuật toán Học thuật)
- [x] **Smart Trip Planner (Phần Thuật toán CSP) - [Phụ trách: Hưng]:** Xây dựng logic thuật toán (Backend) giải quyết bài toán ràng buộc thời gian/địa điểm để xếp lịch trình tự động. ✔️ *đã code `utils/cspSolver.js` + Backtracking Search + endpoint `/ai/plan-trip`*
- [x] **Gợi ý Địa điểm (Thuật toán Naive Bayes) - [Phụ trách: Sanh]:** Tự code class NaiveBayes tính toán xác suất dựa trên lịch sử tìm kiếm từ Firestore và dữ liệu vị trí. ✔️ *đã code `utils/bayesClassifier.js` đầy đủ với Prior + Likelihood + Laplace Smoothing, trả top-3 danh mục + xác suất*
- [x] **Smart Trip Planner (Giao diện) & Tích hợp Frontend - [Phụ trách: Khánh]:** Thiết kế UI Timeline hiển thị lịch trình cho Trip Planner và tích hợp các dữ liệu AI của Giai đoạn 2 lên trang MapPage. ✔️ *đã code `components/TripPlanner.jsx` (Timeline UI + AI summary bằng Gemini)*

---

## 2. Các tính năng nên kết hợp giữa AI và VIETMAP (Hay dùng thực tế)

VietMap cung cấp hệ sinh thái API rất mạnh và chi tiết cho địa lý Việt Nam. Để hệ thống đạt hiệu quả cao nhất, các tính năng AI ở trên nên được kết hợp với các API của VietMap như sau:

### 2.1. Tìm kiếm và Trợ lý ảo (AI + VietMap Search/Geocoding API)
* **Thực trạng:** AI có khả năng giao tiếp và hiểu ý định người dùng (VD: "Tìm quán cafe view đẹp ở Quận 1"), nhưng AI không có cơ sở dữ liệu địa điểm thực tế theo thời gian thực.
* **Giải pháp:** 
  1. AI trích xuất từ khóa "quán cafe", "Quận 1" từ câu nói của người dùng.
  2. Backend gọi **VietMap Search API / Places API** để lấy danh sách các quán cafe chính xác ở Quận 1.
  3. AI tóm tắt lại danh sách đó và trả lời người dùng một cách tự nhiên.

### 2.2. Chỉ đường bằng Giọng nói Tự nhiên (AI + VietMap Routing API)
* **Thực trạng:** Routing API trả về chỉ dẫn rất máy móc (VD: "Đi thẳng 200m, rẽ trái").
* **Giải pháp:**
  1. Gọi **VietMap Routing API** để lấy lộ trình (geometry) và các bước di chuyển (steps) chính xác nhất, tránh đường cấm, đường kẹt xe.
  2. Đưa dữ liệu json của VietMap vào Gemini AI để AI "biên dịch" thành giọng văn người Việt: _"Bạn cứ đi thẳng khoảng 200m nữa nhé, sau đó tới ngã tư thì rẽ trái..."_
  3. Dùng Text-to-Speech đọc lên cho tài xế.

### 2.3. Lên lịch trình Du lịch Thông minh (AI + VietMap Distance Matrix API)
* **Thực trạng:** Khi xếp lịch trình đi 5 điểm khác nhau, thuật toán (CSP) cần biết chính xác thời gian đi từ điểm A đến điểm B mất bao lâu.
* **Giải pháp:** 
  1. Gọi **VietMap Distance Matrix API** để tính thời gian di chuyển thực tế (có kẹt xe) giữa tất cả các điểm đến.
  2. Đưa ma trận thời gian này vào AI (hoặc thuật toán CSP tự viết ở Task 2).
  3. AI sẽ tính toán và sắp xếp lịch trình tối ưu nhất (VD: Sáng đi bảo tàng, trưa ăn gần đó, chiều đi cà phê) sao cho tiết kiệm thời gian nhất.

### 2.4. Gợi ý cá nhân hóa vị trí (AI + VietMap Reverse Geocoding)
* **Thực trạng:** Ứng dụng chỉ biết tọa độ (Lat, Lng) của người dùng hiện tại, nhưng AI cần biết tên đường, quận để phân tích.
* **Giải pháp:**
  1. Dùng **VietMap Reverse Geocoding** biến tọa độ GPS của điện thoại thành địa chỉ cụ thể (VD: "123 Lê Lợi, Q1").
  2. Thuật toán Naive Bayes (Task 2) phân tích thói quen để biết user thích "Ăn vặt".
  3. Dùng VietMap Nearby Search tìm các quán ăn vặt quanh vị trí đó và hiển thị lên màn hình.

### 2.5. Render Bản đồ Frontend (VietMap GL JS / Mobile SDK)
* **Giải pháp:** Thay vì sử dụng MapLibre gốc kết hợp với base map nước ngoài, sử dụng trực tiếp **VietMap SDK** ở Frontend (React / Android) để hiển thị bản đồ mượt mà, render các marker từ AI trả về, và vẽ polyline đường đi A* một cách trực quan với dữ liệu giao thông Việt Nam chuẩn xác.
