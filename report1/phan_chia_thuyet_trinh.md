# ĐỀ CƯƠNG PHÂN CHIA THUYẾT TRÌNH ĐỒ ÁN MAPVIT

Hệ thống bản đồ thông minh tích hợp AI đa tầng (MapVit) được phân chia nội dung thuyết trình cho nhóm 5 thành viên. Mỗi nội dung đều được làm nổi bật yếu tố ứng dụng Trí tuệ nhân tạo (AI/ML) tương ứng, trong đó Trưởng nhóm Lê Nguyễn Duy Cường phụ trách dẫn dắt và nói chính các phần cốt lõi.

---

## I. BẢNG TỔNG QUAN PHÂN CHIA THUYẾT TRÌNH

| STT | Người trình bày | Vai trò | Nội dung phụ trách chính | Mối liên hệ với Trí tuệ Nhân tạo (AI/ML) | Thời lượng |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Lê Nguyễn Duy Cường** | **Dẫn dắt & Lead AI** | - Tổng quan & Kiến trúc Multi-Cloud điều phối AI.<br>- Thuật toán đường đi tránh kẹt xe $A^*$ (`aStar.js`).<br>- Trợ lý giọng nói đa lượt Gemini NLP.<br>- Kết luận & Hướng phát triển. | **Search AI & Natural Language Processing (NLP):**<br>- Thiết lập đồ thị đường đi thực tế và thuật toán tìm kiếm Heuristic $A^*$ tránh kẹt xe.<br>- Tích hợp mô hình ngôn ngữ lớn Gemini AI phân tích intent/entities. | **35% - 40%** |
| 2 | **Nguyễn Tuấn Du** | Thành viên | - Lập lịch trình tối ưu đa chặng (Smart Trip Planner).<br>- Thuật toán CSP Backtracking (`cspSolver.js`). | **Symbolic AI (Trí tuệ nhân tạo cổ điển):**<br>- Giải quyết bài toán thỏa mãn ràng buộc (CSP) để sắp xếp lịch trình thông minh dựa trên các ràng buộc thời gian cứng. | **15%** |
| 3 | **Phạm Quốc Khánh** | Thành viên | - Gợi ý địa điểm cá nhân hóa dựa trên ngữ cảnh thời gian.<br>- Mô hình Naive Bayes (`bayesClassifier.js`).<br>- Giải quyết bài toán Khởi đầu lạnh (Cold-Start). | **Probabilistic Machine Learning:**<br>- Huấn luyện trực tuyến (Online Learning) tự động cập nhật xác suất có điều kiện kết hợp làm mịn Laplace.<br>- Giải quyết bài toán Cold-Start cho người dùng mới. | **15%** |
| 4 | **Phan Minh Hưng** | Thành viên | - Hệ thống Bản đồ nền tương tác & Chat UI.<br>- Xử lý âm thanh & Trực quan hóa kết quả AI.<br>- Phản hồi âm thanh hướng dẫn (TTS). | **Speech AI & Audio Processing:**<br>- Trích xuất đặc trưng âm tần MFCC và thuật toán giải mã Beam Search tích hợp sẵn trên nhân trình duyệt.<br>- Vẽ đường tránh kẹt xe và giả lập di chuyển thực tế. | **15%** |
| 5 | **Nguyễn Văn Sanh** | Thành viên | - Trang quản trị Admin Dashboard.<br>- Tính năng tự sinh Insight phân tích thông minh.<br>- Dữ liệu thực nghiệm đánh giá mô hình học máy. | **Generative AI & Data Analytics:**<br>- Kết nối API Gemini để tự động phân tích dữ liệu lịch sử trên DynamoDB, sinh tự động các Insight Cards cho quản trị viên. | **15%** |

---

## II. KỊCH BẢN CHI TIẾT TỪNG PHẦN (SLIDE-BY-SLIDE)

### PHẦN 1: TỔNG QUAN ĐỀ TÀI & HỆ THỐNG CHỈ ĐƯỜNG TRÁNH KẸT XE
**Người trình bày: Lê Nguyễn Duy Cường**

*   **Slide 1: Giới thiệu chung**
    *   Tên đề tài: MapVit - Hệ thống bản đồ thông minh tích hợp AI đa tầng.
    *   Giới thiệu các thành viên trong nhóm và phân công vai trò.
*   **Slide 2: Đặt vấn đề & Kiến trúc Multi-Cloud**
    *   *Thách thức:* Kẹt xe đô thị thời gian thực, sự hạn chế của bản đồ tĩnh truyền thống khi cập nhật mật độ giao thông.
    *   *Kiến trúc:* Mô hình Multi-Cloud Serverless kết hợp Firebase (Auth/Firestore) và AWS (Lambda/DynamoDB) giúp đồng bộ hóa dữ liệu thời gian thực và vận hành các dịch vụ AI mượt mà.
*   **Slide 3: Thuật toán định tuyến tránh kẹt xe $A^*$ (Search AI)**
    *   *Nguyên lý:* Thiết lập đồ thị mạng lưới giao lộ (Geographic Path Graph) giúp xe di chuyển bám sát lòng đường thực tế, không bị lỗi đi xuyên tường hay xuyên công trình.
    *   *Chi phí phạt ùn tắc:* Áp dụng trọng số phạt động $W = L \times (1 + S)$ (với hệ số phạt cao điểm $S=10$) để bẻ hướng tuyến đường tránh điểm kẹt xe hiệu quả.
*   **Slide 4: Trợ lý đàm thoại giọng nói Gemini NLP (NLP/Transformer AI)**
    *   *Mô hình:* Kết nối mô hình ngôn ngữ lớn Gemini AI ở Backend hoạt động trên kiến trúc Transformer với cơ chế Self-Attention.
    *   *Xử lý ý định:* Sử dụng kỹ thuật Slot Filling để phân loại intent (ví dụ: tìm quán ăn, trạm xăng) và trích xuất thực thể (NER) phục vụ điều hướng tức thời.

---

### PHẦN 2: LẬP LỊCH TRÌNH THÔNG MINH ĐA ĐIỂM (CSP)
**Người trình bày: Nguyễn Tuấn Du**

*   **Slide 5: Bài toán Thỏa mãn ràng buộc CSP (Symbolic AI)**
    *   *Bài toán:* Sắp xếp thứ tự tham quan nhiều địa điểm trong ngày một cách tối ưu nhất.
    *   *Các ràng buộc:* Khung giờ mở/đóng cửa của địa điểm, thời gian di chuyển dự kiến giữa các chặng hành trình và thời gian lưu trú dự kiến tại mỗi điểm.
*   **Slide 6: Giải thuật CSP Backtracking (`cspSolver.js`)**
    *   *Giải thuật:* Sử dụng thuật toán quay lui đệ quy tìm kiếm trong không gian trạng thái, kết hợp kỹ thuật cắt tỉa nhánh (Pruning) từ sớm nếu vi phạm ràng buộc thời gian nhằm tối ưu hiệu năng.
    *   *Trực quan hóa:* Demo chức năng Smart Trip Planner trên giao diện ReactJS hiển thị lộ trình đa điểm sau khi được tối ưu.

---

### PHẦN 3: GỢI Ý ĐỊA ĐIỂM CÁ NHÂN HÓA (Naive Bayes ML)
**Người trình bày: Phạm Quốc Khánh**

*   **Slide 7: Học máy gợi ý địa điểm cá nhân hóa (Probabilistic ML)**
    *   *Phương pháp:* Áp dụng bộ phân lớp xác suất Naive Bayes kết hợp làm mịn Laplace ($\alpha=1$) để dự đoán loại địa điểm (Cafe, Nhà hàng, Mua sắm...) người dùng muốn đi dựa trên đặc trưng thời gian (`timeOfDay`, `dayOfWeek`).
    *   *Học trực tuyến (Online Learning):* Hệ thống tự động cập nhật lại bảng tần số và tính toán xác suất khi có hành vi tương tác mới, tốc độ xử lý tức thời ($<2\text{ ms}$) giúp hệ thống tự thích ứng nhanh chóng.
*   **Slide 8: Xử lý bài toán Khởi đầu lạnh (Cold-Start Fallback)**
    *   *Thách thức:* Gợi ý địa điểm cho người dùng mới hoàn toàn khi hệ thống chưa có dữ liệu lịch sử di chuyển.
    *   *Giải pháp:* Kích hoạt chế độ Fallback, tự động truy vấn và đề xuất các địa điểm nổi tiếng tại khu vực trung tâm Quận 1.

---

### PHẦN 4: THU HÀNH GIỌNG NÓI CLIENT & TRỰC QUAN HÓA BẢN ĐỒ
**Người trình bày: Phan Minh Hưng**

*   **Slide 9: Nhận diện giọng nói phía Client (Speech AI)**
    *   *Speech-to-Text:* Thiết lập Web Speech API trên Frontend, ứng dụng thuật toán trích xuất đặc trưng âm tần MFCC và giải mã Beam Search tích hợp để chuyển giọng nói tiếng Việt thành văn bản.
    *   *Text-to-Speech:* Bộ tổng hợp tiếng nói (Vocoder TTS) đọc to kết quả phản hồi chỉ đường của trợ lý ảo giúp người dùng lái xe an toàn.
*   **Slide 10: Trực quan hóa tuyến đường song song**
    *   Render bản đồ vector mượt mà bằng MapLibre GL kết hợp AWS Location Service.
    *   Vẽ so sánh song song: Tuyến màu tím (đường mặc định của AWS) và Tuyến màu xanh lá (đường đi tối ưu tránh kẹt xe của thuật toán $A^*$), tích hợp marker xe di chuyển giả lập theo GPS.

---

### PHẦN 5: DASHBOARD QUẢN TRỊ VÀ TỰ SINH INSIGHTS
**Người trình bày: Nguyễn Văn Sanh**

*   **Slide 11: Admin Dashboard & AI Insight Cards (Generative AI)**
    *   *Dashboard:* Giao diện hiển thị các biểu đồ thống kê tương tác giao thông trực quan.
    *   *AI Insights:* Tích hợp Gemini AI ở Backend tự động truy vấn dữ liệu logs thô từ DynamoDB, phân tích hành vi và tự động sinh ra các thẻ phân tích gợi ý thông minh (AI Insight Cards) giúp nhà quản trị tối ưu hóa hệ thống.
*   **Slide 12: Đánh giá chất lượng thực nghiệm**
    *   Trình bày quá trình chạy thử nghiệm và kiểm thử hệ thống với tập dữ liệu 500 mẫu lịch sử tương tác giả lập để kiểm chứng độ chính xác của mô hình học máy gợi ý địa điểm.

---

### PHẦN 6: KẾT LUẬN & HỎI ĐÁP
**Người trình bày: Lê Nguyễn Duy Cường**

*   **Slide 13: Kết luận đồ án**
    *   Tóm tắt các đóng góp chính: Tự code thành công các lõi thuật toán chính ($A^*$, CSP, Naive Bayes), tích hợp thành công trợ lý đàm thoại Gemini NLP và hệ thống AI Insight.
*   **Slide 14: Phiên hỏi đáp (Q&A)**
    *   Lắng nghe ý kiến đóng góp và trả lời các câu hỏi từ Hội đồng phản biện.
