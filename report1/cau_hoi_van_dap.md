# DANH SÁCH CÂU HỎI VẤN ĐÁP BÀI TẬP LỚN (THEO CHƯƠNG TRÌNH HỌC AI - UTH)

Tài liệu này đối chiếu trực tiếp giữa **Đề cương môn học Trí tuệ Nhân tạo tại UTH** với dự án **Smart Map Cloud Analytics (MAPVIT)** của bạn để chuẩn bị trước các câu hỏi vấn đáp mà giảng viên có khả năng cao sẽ hỏi khi bảo vệ.

---

## CHƯƠNG 1: TỔNG QUAN VỀ TRÍ TUỆ NHÂN TẠO - TÁC TỬ (AGENT)

### Câu 1: Tác tử thông minh (Intelligent Agent) trong đồ án MapVit là gì? Hãy phân tích theo mô hình PEAS.
*   **Hướng trả lời:** Tác tử thông minh ở đây chính là **Hệ thống chỉ đường tránh kẹt xe** hoặc **Trợ lý ảo**. Phân tích PEAS:
    *   **P (Performance - Chỉ số đánh giá):** Thời gian di chuyển ngắn nhất, quãng đường tối ưu, mức độ tránh các vùng ùn tắc.
    *   **E (Environment - Môi trường):** Mạng lưới đường xá giao thông thực tế tại TP.HCM (Quận 1) và tình trạng kẹt xe thời gian thực.
    *   **A (Actuators - Bộ truyền động):** Giao diện bản đồ hiển thị đường đi (MapLibre GL), bộ phát giọng nói chỉ đường (TTS).
    *   **S (Sensors - Cảm biến):** Định vị GPS của thiết bị, dữ liệu kẹt xe nhập từ Admin hoặc API, giọng nói thu âm từ micro.

---

## CHƯƠNG 2: GIẢI QUYẾT VẤN ĐỀ BẰNG TÌM KIẾM & HEURISTIC ($A^*$)

### Câu 2: Tại sao nhóm không dùng tìm kiếm mù (BFS, DFS) mà lại dùng Tìm kiếm Heuristic ($A^*$) cho bài toán tìm đường?
*   **Hướng trả lời:** 
    *   BFS và DFS là tìm kiếm mù, duyệt không định hướng, sẽ mất rất nhiều thời gian và tài nguyên để duyệt qua hàng ngàn giao lộ trên thực tế vì chúng không có thông tin về đích.
    *   $A^*$ là tìm kiếm có định hướng (Informed Search), sử dụng hàm đánh giá $f(n) = g(n) + h(n)$ với hàm Heuristic $h(n)$ ước lượng khoảng cách tới đích (bằng công thức Haversine), giúp thuật toán chỉ tập trung tìm kiếm về phía đích, tối ưu hóa thời gian xử lý gần như tức thời.

### Câu 3: Hàm Heuristic khoảng cách Haversine của nhóm có "chấp nhận được" (Admissible) và "nhất quán" (Consistent) không?
*   **Hướng trả lời:** **Có**.
    *   *Admissible (Chấp nhận được):* Vì khoảng cách Haversine tính theo đường chim bay (đoạn thẳng ngắn nhất nối 2 điểm trên mặt cầu), nó luôn luôn nhỏ hơn hoặc bằng quãng đường đi thực tế dọc theo các con đường (uốn khúc). Do đó $h(n) \le h^*(n)$ (không bao giờ đánh giá vượt quá chi phí thực tế).
    *   *Consistent (Nhất quán):* Khoảng cách đường chim bay thỏa mãn bất đẳng thức tam giác, đảm bảo giá trị $f(n)$ không giảm dọc theo mọi đường đi.

### Câu 4: Việc gán hệ số phạt kẹt xe $W = L \times (1 + S)$ vào giờ cao điểm có làm mất tính tối ưu của giải thuật $A^*$ không?
*   **Hướng trả lời:** Không làm mất tính tối ưu mà giúp thuật toán **tìm đường tối ưu trong điều kiện thực tế (có kẹt xe)**. Nó biến đổi trọng số cạnh (chi phí đi qua cạnh kẹt xe tăng gấp nhiều lần), từ đó thuật toán $A^*$ tự động tìm các tuyến tránh (mặc dù chiều dài vật lý dài hơn nhưng có tổng chi phí $f(n)$ nhỏ hơn do không bị phạt kẹt xe).

---

## CHƯƠNG 3: BÀI TOÁN THỎA MÃN RÀNG BUỘC (CSP)

### Câu 5: Hãy mô tả bài toán lập lịch Smart Trip Planner dưới dạng bộ ba CSP $(X, D, C)$.
*   **Hướng trả lời:**
    *   **Tập biến số $X$:** Các địa điểm cần ghé thăm trong ngày $[X_1, X_2, \dots, X_n]$.
    *   **Miền giá trị $D$:** Các mốc thời gian bắt đầu tham quan địa điểm đó trong ngày.
    *   **Tập ràng buộc $C$:**
        *   Ràng buộc đơn (Unary): Thời gian tham quan phải nằm trong khung giờ mở/đóng cửa của địa điểm đó.
        *   Ràng buộc kép (Binary): Thời gian bắt đầu điểm tiếp theo phải lớn hơn thời gian kết thúc ở điểm trước cộng với thời gian di chuyển giữa hai điểm ($t_{next} \ge t_{prev} + stay\_time + travel\_time$).

### Câu 6: Thuật toán CSP Backtracking của bạn hoạt động như thế nào? Kỹ thuật cắt tỉa (Pruning) nằm ở đâu?
*   **Hướng trả lời:** Thuật toán duyệt đệ quy thử từng địa điểm chưa đi. Nếu tại một bước, thời gian đến địa điểm tiếp theo vượt quá giờ đóng cửa của địa điểm đó (vi phạm ràng buộc), thuật toán sẽ ngay lập tức **cắt tỉa nhánh** (không duyệt tiếp nhánh đó nữa) và **quay lui (backtrack)** để thử phương án hoán vị khác. Điều này giúp tối ưu hóa hiệu năng so với thuật toán vét cạn (Brute Force).

---

## CHƯƠNG 4 & PROLOG: BIỂU DIỄN TRI THỨC VÀ SUY DIỄN

### Câu 7: Nếu cần chuyển đổi thuật toán tìm đường hoặc lập lịch trình sang Prolog (như các bài thực hành elearning), bạn định nghĩa tri thức thế nào?
*   **Hướng trả lời:** 
    *   Định nghĩa các sự kiện (facts) về con đường: `road(nodeA, nodeB, distance).`
    *   Định nghĩa các sự kiện về kẹt xe: `congested(nodeA, nodeB).`
    *   Viết các luật (rules) đệ quy để tìm đường đi:
        ```prolog
        path(X, Y, [X, Y], D) :- road(X, Y, D).
        path(X, Y, [X | Path], TotalD) :- road(X, Z, D), path(Z, Y, Path, D2), TotalD is D + D2.
        ```

---

## CHƯƠNG 4 & 5: SUY LUẬN KHÔNG CHẮC CHẮN VÀ MÁY HỌC (BAYES)

### Câu 8: Tại sao lại gọi là "Naive" Bayes? Giả định ngây thơ ở đây là gì?
*   **Hướng trả lời:** Gọi là "Naive" (ngây thơ) vì mô hình giả định rằng **tất cả các đặc trưng đầu vào hoàn toàn độc lập với nhau** khi biết nhãn danh mục địa điểm. Cụ thể trong MapVit, mô hình giả định thứ trong tuần (`dayOfWeek`) và khung giờ trong ngày (`timeOfDay`) là độc lập khi dự đoán danh mục địa điểm người dùng muốn đến. Mặc dù thực tế hai đặc trưng này có thể có mối liên hệ nhất định, giả định ngây thơ này giúp tính toán cực nhanh mà vẫn đạt độ chính xác cao trong thực tế.

### Câu 9: Trong mô hình Naive Bayes, làm mịn Laplace (Laplace Smoothing) giải quyết vấn đề gì?
*   **Hướng trả lời:** Giải quyết bài toán xác suất bằng 0 (Zero-probability/Zero-frequency problem). Nếu trong lịch sử chưa bao giờ người dùng đi Cafe vào ngày cuối tuần, xác suất có điều kiện $P(weekend | Cafe) = 0$. Khi nhân các xác suất lại, nó sẽ xóa sạch toàn bộ các giá trị khác khiến kết quả bằng 0. Hệ số làm mịn Laplace ($\alpha=1$) cộng thêm 1 vào tử số và cộng kích thước từ vựng vào mẫu số để đảm bảo mọi khả năng đều có một xác suất nhỏ lớn hơn 0.

---

## CHƯƠNG 6: MẠNG NƠ-RON & HỌC SÂU (DEEP LEARNING)

### Câu 10: Trợ lý ảo đàm thoại NLP sử dụng mô hình ngôn ngữ lớn (Gemini). Hãy giải thích kiến trúc học sâu đứng sau mô hình này.
*   **Hướng trả lời:** Mô hình Gemini dựa trên kiến trúc **Transformer** – một mạng nơ-ron học sâu sử dụng **cơ chế tự chú ý (Self-Attention)**. Khác với RNN/LSTM xử lý tuần tự từng từ dễ mất dấu ngữ cảnh dài, Transformer xử lý song song toàn bộ câu lệnh, tự động gán trọng số chú ý để liên kết các thực thể quan trọng trong câu lệnh của người dùng tiếng Việt.

---

## CHƯƠNG 7: UNSUPERVISED LEARNING (HỌC KHÔNG GIÁM SÁT)

### Câu 11: Dataset của Naive Bayes gợi ý địa điểm là Labeled hay Unlabeled? Tại sao nhóm không dùng phân cụm (Clustering)?
*   **Hướng trả lời:** 
    *   Dataset là **Có nhãn (Labeled)** vì mỗi bản ghi click/tìm kiếm của người dùng đều gắn liền với 4 danh mục địa điểm xác định từ trước (`Cafe`, `Restaurant`, `Gas Station`, `Shopping`).
    *   Chúng em không dùng Phân cụm (Clustering) vì phân cụm là học không giám sát (Unsupervised Learning) dành cho dữ liệu không gán nhãn để tự phát hiện các nhóm tự nhiên. Trong khi bài toán gợi ý của chúng em cần phân loại chính xác nhu cầu người dùng vào các nhóm dịch vụ cụ thể đã biết trước, nên phương pháp Phân lớp (Classification) bằng Naive Bayes là phù hợp nhất.
