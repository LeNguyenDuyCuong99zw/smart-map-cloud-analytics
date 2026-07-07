# Các Khái niệm AI/ML và Hướng dẫn Báo cáo Đồ án MAPVIT (UTH)

> Tài liệu này đối chiếu chi tiết giữa đồ án tham khảo "Phát hiện ổ gà" với dự án **Smart Map Cloud Analytics (MAPVIT)** của bạn nhằm phục vụ viết báo cáo và bảo vệ đồ án Trí tuệ nhân tạo tại UTH.

---

## I. BẢNG SO SÁNH CHIỀU SÂU HỌC THUẬT (AI/ML)

| Tiêu chí | Đồ án tham khảo (Phát hiện ổ gà) | Dự án MAPVIT của bạn | Đánh giá học thuật |
| :--- | :--- | :--- | :--- |
| **Số lượng giải thuật AI** | Chỉ dùng **1** học sâu YOLO11s để nhận diện hình ảnh. | Dùng **4** giải thuật: **Naive Bayes** (Gợi ý), **A\*** (Tìm đường tránh kẹt xe), **CSP Backtracking** (Lập lịch), **NLP** (Gemini AI). | **Vượt trội:** Phủ rộng từ AI cổ điển (Search, CSP), Học máy truyền thống (Naive Bayes) đến AI hiện đại (LLM). |
| **Độ tự tay phát triển (Custom Code)** | Sử dụng thư viện đóng gói sẵn (`Ultralytics` của YOLO), chỉ viết mã wrapper để chạy. | Tự lập trình lõi thuật toán **A\*** ([aStar.js](file:///c:/cloud/smart-map-cloud-analytics/backend/src/utils/aStar.js)), **CSP** ([cspSolver.js](file:///c:/cloud/smart-map-cloud-analytics/backend/src/utils/cspSolver.js)) và **Naive Bayes** ([bayesClassifier.js](file:///c:/cloud/smart-map-cloud-analytics/backend/src/utils/bayesClassifier.js)) từ số 0. | **Tốt hơn:** Được giảng viên đánh giá rất cao về khả năng làm chủ thuật toán nền tảng. |
| **Đồ thị Tìm đường thực tế** | Không có (chỉ hiển thị vị trí đơn lẻ trên bản đồ). | Xây dựng đồ thị mạng lưới đường giao cắt phức tạp (**Road Network Graph**). Tích hợp cơ chế **tự động tránh kẹt xe bằng A\***. | **Vượt trội:** A* không chạy trên một đường đơn lẻ mà tự giải quyết tìm nhánh rẽ/đường vòng khi gặp tắc nghẽn. |
| **Đề xuất cá nhân hóa** | Không có. | Mô hình học máy Bayes tự thích ứng theo hành vi tìm kiếm. Giải quyết bài toán **Cold-Start** thông minh khi không có dữ liệu lịch sử. | **Ứng dụng thực tế cao:** Tránh lỗi hệ thống khi người dùng mới đăng nhập. |

---

## II. SO SÁNH TÍNH NĂNG HỆ THỐNG (WEB & GIAO DIỆN)

| Trang chức năng | Đồ án tham khảo (Ổ gà) | Dự án MAPVIT của bạn |
| :--- | :--- | :--- |
| **Đăng nhập (Auth)** | Đăng nhập Django cơ bản. | Đăng nhập bảo mật tích hợp **Firebase Authentication** thực tế. |
| **Trang Bản đồ (Map)** | Chỉ hiển thị các marker tĩnh (vị trí ổ gà) lên bản đồ. | Tích hợp **AWS Location Service**, vẽ đường đi thực tế, định vị GPS người dùng, giả lập xe chạy thời gian thực. |
| **Dẫn đường & Lập lịch** | Không có. | **Smart Trip Planner (CSP)** tự xếp lịch trình tối ưu + Tự vẽ đường đi bằng A* tránh xuyên nhà. |
| **Tương tác thông minh** | Không có. | **Trợ lý giọng nói đa lượt (NLP Gemini)** + Phát giọng nói chỉ dẫn tiếng Việt tự nhiên (**Web Speech API** - giống VietMap). |
| **Dashboard quản trị** | Thống kê số lượng ổ gà, vẽ biểu đồ Django đơn giản. | **Admin Dashboard** kết nối trực tiếp **AWS Lambda/DynamoDB**, hiển thị biểu đồ tương tác, tự động phân tích và sinh thẻ gợi ý bằng AI Gemini (**AI Insight Card**). |

---

## III. HƯỚNG DẪN ÁNH XẠ DỰ ÁN VÀO KHUNG BÁO CÁO UTH

Bạn nên viết cuốn báo cáo của mình bám sát theo các mục lục khoa học sau:

### CHƯƠNG 1: PHÂN TÍCH BÀI TOÁN
*   **1.1. Tổng quan bài toán giao thông thông minh:** Nhu cầu di chuyển, lập lịch trình tối ưu và đề xuất địa điểm theo ngữ cảnh của người tham gia giao thông.
*   **1.2. Giới thiệu lý thuyết các thuật toán:**
    *   *Thuật toán tìm kiếm Heuristic A\*:* Khái niệm hàm đánh giá $f(n) = g(n) + h(n)$ và định lý Heuristic chấp nhận được (Admissible Heuristic).
    *   *Bài toán thỏa mãn ràng buộc (CSP):* Định nghĩa bộ ba trạng thái $(X, D, C)$ ứng dụng trong việc xếp lịch trình.
    *   *Học máy phân lớp Naive Bayes:* Lý thuyết Bayes và tầm quan trọng của hệ số làm mịn Laplace (Laplace Smoothing) để giải quyết xác suất bằng 0.
*   **1.3. Mục đích đồ án:** Xây dựng ứng dụng bản đồ thông minh **MAPVIT** tích hợp AI đa tầng hỗ trợ tối ưu lộ trình và cá nhân hóa trải nghiệm.

### CHƯƠNG 2: PHƯƠNG PHÁP VÀ KẾT QUẢ THỰC NGHIỆM
*   **2.1. Quy trình tổng thể của hệ thống:** Sơ đồ luồng hoạt động giữa Frontend (React Vite) ➔ Backend (Node.js) ➔ AWS Cloud (Đám mây lưu trữ) & Gemini AI.
*   **2.2. Chi tiết cài đặt thuật toán A\* tránh kẹt xe thực tế:**
    *   *Cơ sở dữ liệu đồ thị:* Kết hợp toạ độ thực tế để xây dựng đồ thị mạng lưới đường có hướng (Road Network Graph) gồm 2 ngả đường (Tuyến thẳng và Tuyến tránh đi vòng).
    *   *Mô hình hóa kẹt xe:* Gán hệ số phạt kẹt xe gấp 10 lần ($10 \times S$) cho các cạnh thuộc tuyến thẳng chính trong giờ cao điểm.
    *   *Tìm kiếm tối ưu:* A* tự động tính toán tổng chi phí $f(n)$, đưa ra tuyến đường tránh đi vòng màu **Xanh Lá Cây 🟢** khác hoàn toàn đường đi thẳng màu **Tím** của AWS.
*   **2.3. Cài đặt thuật toán Lập lịch CSP (Smart Trip Planner):**
    *   Ràng buộc thời gian đóng/mở cửa của địa điểm (Unary) và ràng buộc thời gian di chuyển giữa các điểm (Binary).
    *   Ứng dụng thuật toán **Backtracking** đệ quy tìm kiếm thứ tự địa điểm tối ưu.
*   **2.4. Cài đặt thuật toán Gợi ý Naive Bayes & Giải quyết Khởi đầu lạnh (Cold-Start):**
    *   Huấn luyện bộ phân lớp Naive Bayes trên dữ liệu lịch sử Firestore dựa trên hai đặc trưng: Thứ trong tuần (`dayOfWeek`) và Khung giờ (`timeOfDay`).
    *   *Thuật toán Cold-Start:* Nếu dữ liệu trống (người dùng mới), hệ thống tự động kích hoạt danh sách địa điểm nổi bật mặc định tại Quận 1 để giao diện luôn đầy đủ thông tin, sau đó tự học dần khi có tương tác.
*   **2.5. Tiền xử lý dữ liệu và tích hợp đám mây AWS:**
    *   Lưu lịch sử tìm kiếm song song lên Firebase (cá nhân hóa) và AWS DynamoDB (phân tích hệ thống).
    *   *Chuẩn hóa dữ liệu:* Backend tự động gộp các từ khóa trùng lặp, lọc sạch các tiền tố kỹ thuật (`Search: `, `Place: `) trước khi đưa lên biểu đồ Admin.
*   **2.6. Giao diện chương trình:** (Chụp ảnh màn hình thực tế)
    *   Giao diện Bản đồ chính và Dẫn đường (AWS Route vs A* Route rẽ hướng khác nhau).
    *   Giao diện Autocomplete Trip Planner (Đã ẩn Lat/Lng, gõ từ khóa tự động gợi ý và phân loại Cafe, Nhà hàng).
    *   Giao diện Trợ lý giọng nói đa lượt NLP và đọc giọng nói chỉ đường chỉ bằng Web Speech API.
    *   Trang Admin Dashboard hiển thị biểu đồ phân tích và card phân tích AI sinh từ Gemini.

### CHƯƠNG 3: TỔNG KẾT
*   **3.1. Kết luận:** Đồ án đã giải quyết thành công bài toán tìm đường bám lòng đường, tự tính tuyến tránh kẹt xe và lập lịch trình CSP hiệu quả.
*   **3.2. Hạn chế của hệ thống:** Đồ thị mạng lưới đường phụ thuộc vào kết nối API lấy tọa độ nền từ AWS Location Service.
*   **3.3. Hướng phát triển trong tương lai:** Tích hợp mạng nơ-ron đồ thị (GNN) để dự báo mật độ giao thông thời gian thực và tự cập nhật bản đồ từ camera hành trình.
