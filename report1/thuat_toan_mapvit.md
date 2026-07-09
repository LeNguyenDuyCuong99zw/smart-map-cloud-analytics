# BÁO CÁO HỒ SƠ THUẬT TOÁN AI & MACHINE LEARNING - DỰ ÁN MAPVIT

Báo cáo này chuẩn hóa toàn bộ các giải thuật Trí tuệ Nhân tạo (AI), Học máy (Machine Learning) được nghiên cứu và tự phát triển trong hệ thống bản đồ thông minh **MAPVIT** theo chuẩn học thuật chuyên ngành.

---

## 1. Thuật Toán Tìm Đường Tránh Kẹt Xe $A^*$ (Heuristic Search AI)

### 1.1. Phân loại Học thuật
*   **Lĩnh vực:** Trí tuệ nhân tạo tìm kiếm (Search-based AI) / Tìm kiếm có định hướng (Informed Search).
*   **Cơ chế cốt lõi:** Hàm đánh giá tối ưu hóa trạng thái:
    $$f(n) = g(n) + h(n)$$
    Trong đó, hàm Heuristic $h(n)$ được tính bằng **Công thức khoảng cách mặt cầu Haversine** để đảm bảo tính chấp nhận được (Admissible Heuristic), tức là ước lượng không bao giờ vượt quá khoảng cách thực tế. Trọng số cạnh được phạt động theo mật độ giao thông thực tế: $W = L \times (1 + S)$.

> **Tóm lại bản chất vận hành:**
> *   **Đồ thị đường thực tế** đóng vai trò là **"khung đường đi"** (ngăn chặn việc đi xuyên tường/xuyên nhà).
> *   **Thuật toán $A^*$** đóng vai trò là **"người dò đường"** đi trong khung đường đó.
> *   **Haversine** chỉ là **"cái thước đo"** giúp $A^*$ ước lượng xem ngã rẽ tiếp theo cách đích bao xa để chọn hướng đi ngắn nhất.


### 1.2. Đặc tả dữ liệu đầu vào & đầu ra (Input/Output)
*   **Dữ liệu đầu vào (Input):**
    *   **Start Node ($n_{start}$):** Tọa độ GPS điểm bắt đầu `[Latitude, Longitude]`.
    *   **Goal Node ($n_{goal}$):** Tọa độ GPS điểm đích `[Latitude, Longitude]`.
    *   **Road Network Graph ($G = (V, E)$):** Đồ thị mạng lưới đường giao thông với $V$ là tập các giao lộ và $E$ là tập các đoạn đường nối giữa chúng.
    *   **Congestion State ($S$):** Hệ số ùn tắc giao thông thời gian thực trên từng cạnh ($S = 0$: đường thông thoáng; $S = 10$: kẹt xe nghiêm trọng).
*   **Dữ liệu đầu ra (Output):**
    *   **Optimal Path ($P$):** Một danh sách tọa độ các nút giao thứ tự liên tiếp tạo thành tuyến đường đi tối ưu nhất giúp bẻ hướng tránh các cung đường bị tắc nghẽn (màu Xanh Lá).

---

## 2. Bài Toán Lập Lịch Trình Tối Ưu Đa Điểm (Constraint Satisfaction Problem - CSP)

### 2.1. Phân loại Học thuật
*   **Lĩnh vực:** Trí tuệ nhân tạo cổ điển / Biểu diễn tri thức và Lập lịch (Symbolic AI / Constraint Satisfaction).
*   **Cơ chế cốt lõi:** Định nghĩa bài toán dưới dạng bộ ba biến số, miền giá trị và ràng buộc $(X, D, C)$:
    *   $X$: Các điểm dừng cần ghé thăm.
    *   $D$: Các mốc thời gian có thể bắt đầu tại mỗi điểm dừng.
    *   $C$: Các ràng buộc thời gian đóng/mở cửa của điểm đến (Unary Constraint) và thời gian di chuyển giữa các điểm (Binary Constraint).
    *   **Thuật toán giải:** Tìm kiếm quay lui đệ quy (**Backtracking Search**) kết hợp kỹ thuật cắt tỉa nhánh (Pruning) để loại bỏ sớm các nhánh lịch trình vi phạm ràng buộc thời gian.

### 2.2. Đặc tả dữ liệu đầu vào & đầu ra (Input/Output)
*   **Dữ liệu đầu vào (Input):**
    *   **List of Locations ($L$):** Danh sách $n$ địa điểm người dùng muốn đi qua trong ngày.
    *   **Time Windows ($W_i$):** Khung giờ hoạt động `[OpenTime, CloseTime]` và thời gian lưu trú dự kiến `stayTime` của từng địa điểm.
    *   **Departure Time ($t_{start}$):** Giờ xuất phát mong muốn của người dùng.
    *   **Travel Time Matrix ($T$):** Ma trận thời gian di chuyển giữa tất cả các cặp điểm trong danh sách (được ước tính qua khoảng cách Haversine).
*   **Dữ liệu đầu ra (Output):**
    *   **Optimized Schedule ($S$):** Chuỗi thứ tự thời gian ghé thăm các điểm tối ưu nhất không bị trùng lặp hay trễ giờ (Ví dụ: `Điểm A (8h-9h) -> Điểm B (9h30-11h)...`), hoặc thông báo không khả thi nếu các ràng buộc xung đột.

---

## 3. Mô Hình Gợi Ý Cá Nhân Hóa (Naive Bayes Classification ML)

### 3.1. Phân loại Học thuật
*   **Lĩnh vực:** Học máy có giám sát (Supervised Machine Learning) / Mô hình phân loại xác suất (Probabilistic Classifier).
*   **Cơ chế cốt lõi:** Định lý xác suất Bayes kết hợp kỹ thuật làm mịn Laplace (Laplace Smoothing với $\alpha = 1$) để loại bỏ lỗi xác suất bằng 0:
    $$P(c|x) = \frac{P(c) \prod P(x_i|c)}{P(x)}$$
    Thuật toán tự thích ứng thông qua học trực tuyến (Online Learning) bằng cách cập nhật các tần suất xuất hiện ngay khi có hành vi tương tác mới từ người dùng.

### 3.2. Đặc tả dữ liệu đầu vào & đầu ra (Input/Output)
*   **Dữ liệu đầu vào (Input):**
    *   **User Context ($X$):** Bộ đặc trưng ngữ cảnh hiện tại gồm thứ trong tuần (`dayOfWeek`) và khung giờ trong ngày (`timeOfDay`).
    *   **Interaction History Dataset ($D$):** Tập dữ liệu lịch sử tìm kiếm/click đã được gán nhãn của người dùng phục vụ đếm tần số.
    *   **Laplace Alpha ($\alpha$):** Tham số làm mịn (mặc định = 1).
*   **Dữ liệu đầu ra (Output):**
    *   **Category Probabilities ($P$):** Danh sách top-3 danh mục địa điểm gợi ý (Ví dụ: `Cafe: 65%`, `Restaurant: 20%`, `Shopping: 15%`) kèm xác suất dự đoán tương ứng.

---

## 4. Trợ Lý Giọng Nói Đa Lượt & Trích Xuất Ý Định (Gemini NLP / Transformer AI)

### 4.1. Phân loại Học thuật
*   **Lĩnh vực:** Xử lý ngôn ngữ tự nhiên (NLP) / Trí tuệ nhân tạo tạo sinh (Generative AI) / Hệ thống hội thoại (Dialogue Systems).
*   **Cơ chế cốt lõi:** Kiến trúc **Transformer với cơ chế tự chú ý (Self-Attention)** của mô hình ngôn ngữ lớn (Gemini LLM). 
    *   Nhóm áp dụng kỹ thuật **Học theo ngữ cảnh (In-Context Learning)** và **Căn chỉnh Prompt (Prompt Tuning)** để ép mô hình trích xuất thực thể theo dạng JSON có cấu trúc (Slot Filling) và duy trì ngữ cảnh hội thoại đa lượt (Conversation Memory).

### 4.2. Đặc tả dữ liệu đầu vào & đầu ra (Input/Output)
*   **Dữ liệu đầu vào (Input):**
    *   **Vietnamese Voice Query ($Q_{raw}$):** Văn bản thô được dịch từ giọng nói người dùng (Speech-to-Text).
    *   **Conversation Context ($H$):** Lịch sử các câu thoại trước đó trong phiên làm việc của người dùng để nhận diện thực thể ẩn dụ (ví dụ: từ "quán đó" liên kết với "quán phở" ở câu trước).
    *   **System Prompt instruction ($P_{sys}$):** Chỉ thị định dạng đầu ra bắt buộc.
*   **Dữ liệu đầu ra (Output):**
    *   **Structured Intent JSON:** Dữ liệu JSON chứa Intent (Ý định) và Entity (Thực thể địa điểm) được phân tích sạch sẽ để điều phối chạy thuật toán.
    *   **Natural Language Response ($R_{text}$):** Văn bản phản hồi tự nhiên bằng tiếng Việt để hệ thống đọc ra loa.
