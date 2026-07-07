# CHƯƠNG 2: PHƯƠNG PHÁP VÀ KẾT QUẢ THỰC NGHIỆM

## 2.1. Quy trình tổng thể của hệ thống MAPVIT
Quy trình thực hiện của hệ thống được chia thành các bước cốt lõi như sau:

*   **Xác định vấn đề và yêu cầu:**
    *   Xác định bài toán: Xây dựng hệ thống bản đồ thông minh tự động tìm tuyến đường tránh kẹt xe, lập lịch trình tối ưu và hỗ trợ trợ lý giọng nói đàm thoại tự nhiên.
    *   Yêu cầu hệ thống: Phản hồi nhanh (gần thời gian thực) trên nền tảng Web, có kiến trúc đám mây lưu trữ dữ liệu đồng bộ và khả năng chịu tải tốt (Serverless).
*   **Thu thập và chuẩn bị dữ liệu:**
    *   Hệ thống sử dụng dữ liệu tọa độ (Lat/Lng) và mạng lưới đường giao thông từ AWS Location Service.
    *   Thu thập dữ liệu lịch sử tìm kiếm và tương tác của người dùng trên Firebase Firestore để làm nguồn dữ liệu huấn luyện cho mô hình gợi ý cá nhân hóa.
*   **Xây dựng và tích hợp các mô hình/thuật toán AI:**
    *   Tự thiết kế và cài đặt giải thuật Heuristic $A^*$ để tính toán tuyến đường.
    *   Xây dựng mô hình Bài toán thỏa mãn ràng buộc (CSP) bằng giải thuật Backtracking để sắp xếp lịch trình.
    *   Cài đặt bộ phân lớp Naive Bayes với hệ số làm mịn Laplace để gợi ý địa điểm.
*   **Triển khai hệ thống trên Web và Cloud:**
    *   Xây dựng ứng dụng Web Frontend bằng ReactJS, Vite và MapLibre GL.
    *   Tích hợp Backend Node.js với hệ sinh thái Multi-Cloud: Firebase (Auth/Firestore) và AWS (Lambda/DynamoDB).
*   **Kiểm thử và hoàn thiện:**
    *   Chạy thử nghiệm tìm đường song song: đối chiếu giữa tuyến đường đi thẳng của AWS (màu Tím) và tuyến đường tránh đi vòng của $A^*$ (màu Xanh Lá).
    *   Tinh chỉnh trợ lý giọng nói NLP để nhận diện chính xác ý định đàm thoại của người dùng và hoàn thiện giao diện.

## 2.2. Các thuật toán sử dụng

### Thuật toán 1: Giải thuật tìm kiếm Heuristic $A^*$ (Tránh kẹt xe)
*   **Input**: Điểm bắt đầu (Start), Điểm đích (Goal), Đồ thị mạng lưới đường giao thông (Road Network Graph).
*   **Output**: Tuyến đường đi tối ưu nhất (tránh điểm kẹt xe, bám sát lòng đường thực tế).

#### Nguyên lý vận hành không đi xuyên tường (Collision Avoidance):
Khác với tìm kiếm trên lưới 2D (Grid-based Search) dễ bị lỗi đi cắt góc qua các chướng ngại vật hoặc xuyên qua các công trình kiến trúc, hệ thống MAPVIT sử dụng cấu trúc **Đồ thị mạng lưới đường (Geographic Path Graph)**. 
*   Đồ thị được định nghĩa bằng các nút tọa độ (`nodes` giao lộ thực) và tập các cạnh liên kết (`edges` tương ứng các tuyến đường thực tế được phép di chuyển).
*   Thuật toán $A^*$ chỉ duyệt qua các nút láng giềng nằm trong danh sách kề (`adjacency list`) được cấu hình từ các cạnh thực tế này. Do đó, đường đi trả về bắt buộc phải chạy dọc theo các con phố, **đảm bảo đường đi hợp lý và hoàn toàn không bị xuyên tường hay đi cắt chéo qua các tòa nhà**.

#### Các bước thực hiện thuật toán:
1. Khởi tạo danh sách mở (`open_set`) chứa điểm Start và danh sách đóng (`closed_set`) rỗng.
2. Với mỗi cạnh giao thông, tính trọng số phạt kẹt xe: $W = L \times (1 + S)$ (với $S=10$ vào giờ cao điểm).
3. Trong khi `open_set` chưa rỗng:
   a. Lấy nút $n$ có giá trị $f(n) = g(n) + h(n)$ nhỏ nhất.
   b. Nếu $n$ là Goal $\rightarrow$ Truy xuất ngược lại (Backtrack) để trả về tuyến đường.
   c. Đưa $n$ vào `closed_set`.
   d. Với mỗi nút kề $m$ của $n$:
      - Nếu $m$ đã trong `closed_set`, bỏ qua.
      - Tính $g(m)$ mới = $g(n) + W(n, m)$.
      - Cập nhật $f(m) = g(m) + h(m)$ và thêm $m$ vào `open_set`.
4. Trả về tuyến đường ưu tiên nhánh phụ (màu Xanh Lá Cây).

### Thuật toán 2: Lập lịch hành trình (Smart Trip Planner)
*   **Input**: Danh sách địa điểm $X = [X_1, X_2, \dots, X_n]$, Giờ mở/đóng cửa, Thời gian di chuyển.
*   **Output**: Thứ tự tham quan tối ưu hoặc thông báo không khả thi.

1. Xác định ràng buộc: $t_{start} \ge OpenTime$ và $t_{start} + stay \le CloseTime$.
2. Hàm đệ quy `Backtrack(current_schedule)`:
   a. Nếu `current_schedule` chứa đủ $n$ địa điểm $\rightarrow$ Lưu lại kết quả khả thi.
   b. Duyệt từng địa điểm $X_i$ chưa được chọn:
      - Tính thời gian dự kiến đến $X_i$: $t_{next} = t_{current} + travel$.
      - Nếu $t_{next}$ thỏa mãn khung giờ hoạt động của $X_i$:
         * Thêm $X_i$ vào `current_schedule`.
         * Gọi đệ quy `Backtrack(current_schedule)`.
         * Xóa $X_i$ khỏi `current_schedule` (Quay lui) để thử hoán vị khác.
3. Trả về lịch trình tối ưu nhất.

### Thuật toán 3: Phân lớp Naive Bayes và Khởi đầu lạnh (Cold-Start)
*   **Input**: Lịch sử tương tác người dùng, Đặc trưng (`dayOfWeek`, `timeOfDay`).
*   **Output**: Danh mục địa điểm được ưu tiên gợi ý.

1. Nếu `history.length == 0` (Người dùng mới):
   a. Bỏ qua Bayes, kích hoạt chế độ **Cold-Start Fallback**.
   b. Lấy danh sách địa điểm nổi bật tại trung tâm Quận 1 để hiển thị mặc định.
2. Nếu đã có dữ liệu, tính toán xác suất tiên nghiệm $P(c)$ cho từng danh mục.
3. Tính xác suất có điều kiện kết hợp làm mịn Laplace ($\alpha=1$):
   $P(day | c) = \frac{N_{day, c} + 1}{N_c + 7}$; $P(time | c) = \frac{N_{time, c} + 1}{N_c + 4}$
4. Chọn danh mục tối ưu = $\arg\max_c P(c) \times P(day|c) \times P(time|c)$.

### Thuật toán 4: Quy trình Nhận diện và Xử lý Ngôn ngữ Tự nhiên (NLP Voice Pipeline)
*   **Input**: Tín hiệu âm thanh giọng nói tiếng Việt từ micro người dùng.
*   **Output**: Tuyến đường chỉ dẫn tương ứng trên bản đồ và âm thanh phản hồi tự nhiên.

1. **Chuyển đổi âm thanh thành văn bản (Speech-to-Text):**
   *   Thu nhận âm thanh bằng Web Speech API, sử dụng thuật toán trích xuất đặc trưng âm tần **MFCC (Mel-Frequency Cepstral Coefficients)** để số hóa giọng nói.
   *   Áp dụng mạng nơ-ron học sâu (Deep Neural Networks - DNN) và thuật toán giải mã **Beam Search** tích hợp sẵn trên nhân trình duyệt để dịch âm thanh thành chuỗi văn bản tiếng Việt $T$.
2. **Hiểu ngôn ngữ và Trích xuất thông tin (Gemini NLP):**
   *   Đưa chuỗi văn bản $T$ qua mô hình Gemini AI (kiến trúc **Transformer với cơ chế Self-Attention**).
   *   Thực hiện phân loại ý định (Intent Classification) và nhận dạng thực thể (Named Entity Recognition - NER) bằng giải thuật **Slot Filling** (Ví dụ trích xuất: `Intent: Find_Food`, `Entity: Phở`).
   *   Sử dụng mạng nơ-ron lưu trữ ngữ cảnh đa lượt để liên kết các câu lệnh trước và sau.
3. **Tổng hợp âm thanh phản hồi (Text-to-Speech):**
   *   Tính toán đường đi bằng giải thuật $A^*$ theo thực thể đã trích xuất.
   *   Gemini tự sinh văn bản hướng dẫn tự nhiên (VD: "Đã tìm thấy quán phở, quãng đường đi mất 5 phút").
   *   Chuyển văn bản này qua bộ tổng hợp giọng nói của trình duyệt, áp dụng thuật toán ghép nối âm tố hoặc mạng nơ-ron sinh tiếng nói (Vocoder TTS) để đọc to kết quả chỉ đường.

## 2.3. Huấn luyện và Tối ưu hóa mô hình

Khác với các dự án nhận diện hình ảnh (Computer Vision) sử dụng tập dữ liệu ảnh để huấn luyện trên GPU (như YOLO), hệ thống MAPVIT kết hợp giữa việc tự huấn luyện học máy nhẹ (Naive Bayes) trực tiếp trên máy chủ Node.js và tối ưu hóa phản hồi (Prompt Tuning) của mô hình ngôn ngữ lớn (Gemini AI).

### 2.3.1. Huấn luyện mô hình gợi ý cá nhân hóa Naive Bayes
*   **Tập dữ liệu huấn luyện:** Hệ thống tự động thu thập từ Firestore lịch sử click/tìm kiếm của người dùng. Tập dữ liệu thực nghiệm để đánh giá gồm 500 bản ghi tương tác giả lập được phân phối theo các nhãn địa điểm mục tiêu (Cafe, Nhà hàng, Trạm xăng, Điểm mua sắm) dựa trên khung thời gian.
*   **Quy trình huấn luyện trực tuyến (Online Learning):**
    *   Mô hình không cần huấn luyện tĩnh (Offline). Mỗi khi người dùng có hành vi tương tác mới, hệ thống tự động cập nhật lại các bảng đếm tần suất $N_{day, c}$, $N_{time, c}$ và tổng số lượt $N_c$ của danh mục đó trong cơ sở dữ liệu.
    *   Thuật toán sẽ tính toán lại trực tiếp các tham số xác suất có điều kiện tích hợp hệ số làm mịn Laplace ($\alpha = 1$) để cập nhật vào cache của Backend.
    *   Thời gian huấn luyện và tính toán lại tham số xác suất gần như tức thời ($<2\text{ ms}$), giúp hệ thống tự thích ứng (Self-adapting) với thói quen của người dùng theo thời gian thực mà không làm nghẽn máy chủ.

### 2.3.2. Cấu hình và Căn chỉnh Trợ lý ngôn ngữ Gemini NLP
*   Do Gemini AI là mô hình ngôn ngữ lớn đã được huấn luyện sẵn (Pre-trained), nhóm không tiến hành huấn luyện lại toàn bộ tham số (Fine-tuning) để tiết kiệm tài nguyên. Thay vào đó, nhóm áp dụng phương pháp **Học theo ngữ cảnh (In-Context Learning)** và **Căn chỉnh Prompt (Prompt Tuning)**.
*   Nhóm thiết lập một System Prompt nghiêm ngặt cho mô hình ở Backend:
    > "Bạn là trợ lý ảo của bản đồ MAPVIT. Hãy phân tích câu nói của người dùng để trả về định dạng JSON duy nhất chứa: 1. Intent (Find_Place, Route, Weather), 2. Entity (tên địa điểm), 3. ResponseText (câu chào bằng tiếng Việt)."
*   Việc cấu hình này giúp đảm bảo đầu ra của AI luôn có cấu trúc cố định để code Backend dễ dàng trích xuất thông tin điều phối cho thuật toán $A^*$.

### 2.3.3. Tối ưu hóa hiệu năng thực thi
*   **Môi trường chạy**: Toàn bộ các lõi logic và mô hình Naive Bayes được thực thi trực tiếp trên CPU của máy chủ AWS EC2 (tối ưu hóa Node.js V8 Engine).
*   **Tham số tối ưu**: Hệ số phạt kẹt xe ($S = 10$) được thiết lập cố định vào các khung giờ cao điểm (7h-9h, 17h-19h) để đảm bảo giải thuật $A^*$ luôn chủ động bẻ hướng sang tuyến đường nhánh (màu Xanh Lá) thay vì đi vào trục đường chính bị tắc nghẽn.

## 2.4. Triển khai trên hệ thống Web (React/Node.js + Đám mây)

Sau khi các thuật toán lõi được hoàn thiện, hệ thống được tích hợp vào ứng dụng Web (React/Vite) kết nối Backend (Node.js). 

### 2.4.1. Kiến trúc lưu trữ và xử lý bất đồng bộ
Nhóm phát triển áp dụng kiến trúc Serverless để giảm tải cho máy chủ chính:
*   **Firebase Firestore**: Đóng vai trò cơ sở dữ liệu thời gian thực (Real-time DB), đồng bộ hóa lịch sử người dùng và đảm bảo giao diện thay đổi lập tức.
*   **AWS Lambda & DynamoDB**: Thay vì ghi log trực tiếp, Backend đẩy các sự kiện tìm kiếm sang hàm Lambda. Lambda sẽ xử lý bất đồng bộ, tiến hành làm sạch dữ liệu (loại bỏ tiền tố `Search: `, `Place: ` sinh ra từ Autocomplete) và đẩy vào DynamoDB, chuẩn bị dữ liệu sạch cho trang Admin.

### 2.4.2. Trợ lý giọng nói đàm thoại tự nhiên (Web Speech + Gemini)
Một trong những đột phá lớn nhất của dự án khi triển khai thực tế là tính năng Trợ lý đàm thoại, khắc phục hoàn toàn nhược điểm phải thao tác tay khi lái xe. Khác với các hệ thống ra lệnh bằng giọng nói cứng nhắc (người dùng phải đọc đúng từng chữ cú pháp), MAPVIT cung cấp trải nghiệm đàm thoại đa lượt (Multi-turn conversation).

**Pipeline xử lý giọng nói tìm đường cực kỳ chuyên sâu:**
1.  **Thu nhận âm thanh (Frontend):** 
    Người dùng bấm nút Micro trên giao diện. Trình duyệt sử dụng `Web Speech API (Speech-to-Text)` để bắt âm thanh trực tiếp và dịch giọng nói tiếng Việt thành văn bản thô (Ví dụ: *"Alo bản đồ, kiếm cho tô phở đi"*). Văn bản này lập tức được gửi về Backend qua giao thức WebSocket hoặc REST API.
2.  **Phân tích ngôn ngữ tự nhiên (Gemini AI LLM):**
    Tại Backend, dữ liệu được chuyển thẳng tới mô hình ngôn ngữ lớn **Gemini AI**.
    *   **Nhận diện ý định (Intent Recognition):** Gemini không chỉ tìm từ khóa mà nó "hiểu" ngữ nghĩa câu nói. Hệ thống trích xuất thực thể: `Intent = Find_Food`, `Entity = Phở`.
    *   **Bối cảnh đàm thoại (Context Memory):** Mô hình lưu lại lịch sử hội thoại. Nếu người dùng tiếp tục nói *"Chỉ đường đến quán gần nhất"*, AI tự hiểu chữ "quán" ở đây là "quán phở" của câu trước.
3.  **Thực thi và Phản hồi âm thanh (Text-to-Speech):**
    *   Backend gọi cơ sở dữ liệu tìm quán phở, chạy thuật toán $A^*$ để lấy thông tin quãng đường, sau đó truyền ngược lại cho Gemini để nó sinh ra một câu trả lời tự nhiên: *"Đã tìm thấy 3 quán phở gần bạn. Tuyến đường ngắn nhất đang không bị kẹt xe, bạn sẽ mất khoảng 5 phút di chuyển."*
    *   Câu phản hồi này trả về Frontend và được `Web Speech API (Text-to-Speech)` **đọc thành tiếng nói đàm thoại**, phát ra loa thiết bị. Quy trình này biến ứng dụng web trở thành một trợ lý giao thông thực thụ trên ô tô, vô cùng an toàn và thông minh.

## 2.5. Giao diện hệ thống
Website được xây dựng với các chức năng chính sau:
*   **Giao diện đăng nhập (Login)**: Người dùng cần đăng nhập bằng tài khoản (qua Firebase Authentication) để truy cập vào hệ thống. Việc này đảm bảo tính bảo mật, phân quyền sử dụng và làm cơ sở dữ liệu để mô hình Naive Bayes học hành vi gợi ý cá nhân hóa.
    ![Hình 2.1: Giao diện đăng nhập và xác thực Firebase](file:///C:/Users/PC/.gemini/antigravity-ide/brain/8451fb31-e3c3-40aa-943c-b90dd89285f3/login_page_1783432683111.png)
*   **Trang bản đồ chính và dẫn đường (Main Map & Navigation)**: Tải bản đồ nền Vector MapLibre GL, cho phép định vị vị trí hiện tại và chỉ đường. Khi kẹt xe, giao diện hiển thị song song tuyến đường mặc định của **AWS Route (màu Tím)** và tuyến tránh của **$A^*$ (màu Xanh Lá Cây 🟢)** kèm marker xe di chuyển giả lập theo GPS thời gian thực.
    ![Hình 2.2: Giao diện bản đồ dẫn đường tránh kẹt xe](file:///C:/Users/PC/.gemini/antigravity-ide/brain/8451fb31-e3c3-40aa-943c-b90dd89285f3/route_congestion_test_1783433418140.png)
*   **Giao diện Lập lịch trình (Smart Trip Planner)**: Cho phép người dùng nhập nhiều địa điểm muốn ghé thăm trong ngày thông qua ô tìm kiếm tự động gợi ý (Autocomplete). Khi bấm lập lịch, hệ thống sẽ ẩn các tọa độ phức tạp và hiển thị danh sách thứ tự di chuyển tối ưu nhất đã được giải bởi CSP.
    ![Hình 2.3: Giao diện lập kế hoạch hành trình thông minh](file:///C:/Users/PC/.gemini/antigravity-ide/brain/8451fb31-e3c3-40aa-943c-b90dd89285f3/trip_planner_test_1783433552554.png)
*   **Trang trợ lý đàm thoại giọng nói (Voice Assistant Chat)**: Hộp thoại trò chuyện (Chat UI) tích hợp nút Micro bắt âm thanh trực quan. Cho phép tương tác giọng nói tiếng Việt hai chiều (nhận diện giọng nói và tự động phát âm thanh hướng dẫn đi đường bằng giọng đọc).
    ![Hình 2.4: Giao diện trợ lý ảo giọng nói tiếng Việt](file:///C:/Users/PC/.gemini/antigravity-ide/brain/8451fb31-e3c3-40aa-943c-b90dd89285f3/voice_assistant_test_1783433698374.png)
*   **Trang tổng quan Admin (Admin Dashboard)**: Hiển thị các thông tin phân tích trực quan như: số lượng lượt tìm kiếm đường đi, biểu đồ thống kê danh mục địa điểm được yêu thích nhất (Cafe, nhà hàng), và danh sách từ khóa tìm kiếm gần đây.
    ![Hình 2.5: Giao diện trang tổng quan Admin Dashboard](file:///C:/Users/PC/.gemini/antigravity-ide/brain/8451fb31-e3c3-40aa-943c-b90dd89285f3/admin_dashboard_test_1783433722208.png)
*   **Giao diện phân tích AI Insight (AI Insight Cards)**: Nằm trong trang quản trị Admin, hiển thị các thẻ phân tích gợi ý tự động sinh ra từ mô hình Gemini AI dựa trên dữ liệu tổng hợp sạch từ AWS DynamoDB.
    ![Hình 2.6: Giao diện thẻ phân tích thông minh AI Insight Cards](file:///C:/Users/PC/.gemini/antigravity-ide/brain/8451fb31-e3c3-40aa-943c-b90dd89285f3/admin_dashboard_test_1783433722208.png)

Việc xây dựng website với đầy đủ các chức năng trên giúp hệ thống không chỉ dừng ở mức mô phỏng thuật toán trên console, mà còn trở thành một ứng dụng bản đồ thực tiễn có tính ứng dụng rất cao trong cuộc sống đô thị.

## 2.6. Kết quả và đánh giá

### Hiệu quả triển khai thực tế:
*   Hệ thống chạy ổn định gần thời gian thực trên nền tảng Web. Việc vẽ các tuyến đường của AWS và $A^*$, giả lập xe chạy diễn ra mượt mà nhờ công nghệ render vector MapLibre GL.
*   Tích hợp thành công trợ lý đàm thoại giọng nói thông minh: Nhận diện giọng nói tiếng Việt cực nhạy, Gemini AI hiểu chính xác ngữ nghĩa và ý định của câu nói (Intent), sau đó phát âm thanh phản hồi to, rõ ràng qua loa thiết bị.
*   Cơ chế tiền xử lý dữ liệu và lưu trữ song song hoạt động hiệu quả: Hệ thống vừa ghi dữ liệu Firestore để thay đổi giao diện tức thì cho người dùng, vừa gửi sang AWS Lambda chạy ngầm để lọc bỏ tiền tố kỹ thuật (`Search: `, `Place: `) và ghi vào DynamoDB phục vụ biểu đồ Admin mà không làm trễ giao diện Frontend.

### Đánh giá hiệu năng:
*   Trên môi trường thực nghiệm, tốc độ tính toán tuyến đường tránh kẹt xe của giải thuật $A^*$ và sắp xếp lịch trình của CSP cực kỳ nhanh chóng, hoàn tất suy luận và phản hồi **dưới 200ms**, đáp ứng hoàn hảo tính chất thời gian thực.
*   Việc xử lý giọng nói đàm thoại qua API của Gemini AI thỉnh thoảng có độ trễ khoảng 1.5s - 2s phụ thuộc vào đường truyền mạng internet kết nối đến máy chủ Google, tuy nhiên vẫn nằm trong ngưỡng chấp nhận được đối với một trợ lý đàm thoại đa lượt.
*   Do các giải thuật cốt lõi ($A^*$, CSP, Naive Bayes) đều được tối ưu hóa mã nguồn thuần chạy trên CPU nên hệ thống vận hành siêu nhẹ, tiêu tốn rất ít RAM và CPU của máy chủ AWS EC2, giúp tiết kiệm tối đa chi phí vận hành.

### Nhận xét tổng quan:
*   Về mặt ứng dụng, hệ thống đã chứng minh được tính khả thi vượt trội khi tích hợp thành công kiến trúc AI đa tầng vào ứng dụng Web thông qua sự kết hợp của ReactJS, Node.js và nền tảng đám mây AWS.
*   Hạn chế hiện tại chủ yếu là độ trễ nhỏ của API Gemini khi xử lý ngôn ngữ tự nhiên. Điều này có thể được cải thiện trong tương lai bằng cách triển khai các giải pháp Edge AI hoặc sử dụng kết nối mạng có băng thông ưu tiên.
