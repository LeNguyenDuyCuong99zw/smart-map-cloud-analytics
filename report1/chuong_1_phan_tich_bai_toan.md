# CHƯƠNG 1: PHÂN TÍCH BÀI TOÁN

## 1.1 Tổng quan bài toán giao thông thông minh

### 1.1.1 Vấn đề di chuyển và định tuyến trong đô thị hiện nay
Trong những năm gần đây, cùng với sự phát triển nhanh chóng của nền kinh tế và tốc độ đô thị hóa, nhu cầu di chuyển của người dân tại các thành phố lớn ở Việt Nam ngày càng tăng cao. Dù mạng lưới hạ tầng giao thông đường bộ liên tục được mở rộng và nâng cấp, tình trạng ùn tắc giao thông, kẹt xe cục bộ trong các khung giờ cao điểm vẫn diễn ra nghiêm trọng, gây ra nhiều tổn thất về thời gian, sức khỏe và kinh tế cho người tham gia giao thông.

Nhu cầu thực tiễn hiện nay không chỉ dừng lại ở việc tìm kiếm một con đường đi từ điểm A đến điểm B đơn thuần. Người dùng luôn mong muốn có những giải pháp hỗ trợ di chuyển thông minh hơn: tự động tìm kiếm tuyến đường nhanh nhất bằng cách tránh các điểm ùn tắc thời gian thực, tự sắp xếp lịch trình tối ưu khi phải đi qua nhiều điểm đến trong ngày, và nhận được các gợi ý địa điểm ăn uống, giải trí được cá nhân hóa phù hợp với thói quen của riêng mình.

### 1.1.2 Thách thức và hạn chế của các giải pháp bản đồ truyền thống
Hiện nay, việc lập kế hoạch di chuyển và tìm kiếm địa điểm của người dân vẫn chủ yếu dựa vào các công cụ bản đồ số thông thường hoặc tự lên kế hoạch thủ công:
*   **Tìm đường thủ công hoặc bán tự động**: Người dùng phải tự quan sát tình trạng giao thông trên bản đồ để chọn hướng đi, hoặc hoàn toàn phụ thuộc vào tuyến đường ngắn nhất do các ứng dụng bản đồ đề xuất mà không có sự linh hoạt chuyển hướng chủ động khi xảy ra kẹt xe.
*   **Tự lập lịch trình di chuyển**: Khi cần ghé thăm nhiều địa điểm khác nhau, người dùng phải tự sắp xếp thứ tự các điểm đến bằng cảm tính, dễ dẫn đến quãng đường đi bị chồng chéo, lãng phí thời gian di chuyển và gặp sự cố trễ giờ do địa điểm đóng cửa.
*   **Gợi ý địa điểm đại trà**: Các thông tin gợi ý thường hiển thị tràn lan, không theo ngữ cảnh thời gian hay hành vi riêng biệt của người dùng, gây ra hiện tượng quá tải thông tin.

Những phương pháp truyền thống này tồn tại các hạn chế lớn:
*   **Tốn nhiều thời gian và công sức**: Người dùng phải tự thao tác, tính toán và lên kế hoạch cho từng chặng đi riêng lẻ.
*   **Không tối ưu**: Dễ chọn phải các tuyến đường đang bị kẹt xe, hoặc xây dựng lịch trình không khả thi do vi phạm các ràng buộc về thời gian hoạt động của các điểm đến.
*   **Thiếu tính cá nhân hóa**: Hệ thống không tự động học hỏi từ thói quen người dùng để đưa ra gợi ý phù hợp, đặc biệt gặp khó khăn khi xử lý thông tin cho người dùng mới (bài toán Khởi đầu lạnh - Cold Start).
*   **Trải nghiệm tương tác hạn chế**: Thiếu các tính năng tương tác rảnh tay như trợ lý giọng nói thông minh hỗ trợ người dùng khi đang lái xe.

Trước bối cảnh đó, việc nghiên cứu và xây dựng một hệ thống bản đồ thông minh tích hợp trí tuệ nhân tạo (AI) đa tầng là vô cùng cấp thiết, nhằm tự động hóa quy trình dẫn đường tránh kẹt xe, tối ưu lịch trình hành trình và mang lại sự thuận tiện tối đa cho người tham gia giao thông.

### 1.1.3 Giới thiệu về Trí tuệ Nhân tạo và các giải thuật cốt lõi (AI/ML)
Trí tuệ nhân tạo (AI) và Học máy (Machine Learning) đã chứng minh hiệu quả vượt trội trong việc giải quyết các bài toán tối ưu hóa phức tạp và phân tích hành vi người dùng mà không cần lập trình thủ công các quy tắc cứng nhắc. Để xây dựng hệ thống bản đồ thông minh **MAPVIT**, nhóm nghiên cứu đã chủ động thiết kế và **tự tay lập trình từ số không (custom code)** toàn bộ nhân thuật toán nền tảng thay vì sử dụng các thư viện đóng gói sẵn. Cụ thể cấu trúc AI đa tầng bao gồm:
*   **Thuật toán tìm kiếm Heuristic $A^*$ (tự phát triển)**: Giải quyết bài toán tìm đường đi ngắn nhất trên đồ thị mạng lưới đường giao thông tự xây dựng (Road Network Graph), tích hợp hệ số phạt ùn tắc động giúp tự động tính toán và bẻ hướng tuyến đường để tránh các điểm kẹt xe hiệu quả.
*   **Bài toán thỏa mãn ràng buộc (CSP - Constraint Satisfaction Problem - tự phát triển)**: Sử dụng mô hình toán học dựa trên tập các biến số, miền giá trị và hệ thống ràng buộc thời gian (giờ đóng/mở cửa, thời gian di chuyển giữa các điểm) cùng bộ giải Backtracking đệ quy tự viết để lập lịch trình hành trình tối ưu nhất.
*   **Học máy phân lớp Naive Bayes (tự phát triển)**: Tự lập trình bộ phân lớp xác suất Bayes kết hợp hệ số làm mịn Laplace để phân loại và gợi ý địa điểm cá nhân hóa dựa trên ngữ cảnh thời gian (thứ trong tuần, khung giờ trong ngày) và thói quen tương tác của người dùng.
*   **Xử lý ngôn ngữ tự nhiên (NLP)**: Sử dụng mô hình ngôn ngữ lớn (Gemini AI) kết hợp với các API nhận diện và tổng hợp giọng nói (Web Speech API) để xây dựng trợ lý ảo đàm thoại thông minh, giúp chỉ đường bằng giọng nói tiếng Việt tự nhiên và sinh các thẻ phân tích gợi ý tự động.

Sự kết hợp đa tầng và khả năng tự làm chủ các thuật toán nền tảng giúp hệ thống không chỉ là một công cụ hiển thị bản đồ tĩnh mà trở thành một trợ lý giao thông thông minh thực thụ.

---

## 1.2 Mục đích đồ án
Đề tài này hướng tới việc nghiên cứu lý thuyết và triển khai ứng dụng thực tế các giải thuật Trí tuệ Nhân tạo để xây dựng **Hệ thống bản đồ thông minh tích hợp AI đa tầng (MAPVIT)** trên nền tảng Web nhằm hỗ trợ người dùng thuận lợi và tối ưu nhất khi tham gia giao thông.

Mục đích cụ thể của đồ án bao gồm:
1.  **Tự động hóa chỉ đường và giả lập lộ trình tránh ùn tắc**: Ứng dụng giải thuật $A^*$ tự viết trên đồ thị giao thông thực tế để tính toán lộ trình tối ưu và đề xuất tuyến đường tránh kẹt xe (màu xanh lá) song song với tuyến đường mặc định của AWS (màu tím), tích hợp cơ chế giả lập xe di chuyển thời gian thực (navigation simulation) đồng bộ theo GPS.
2.  **Lập lịch trình hành trình thông minh**: Xây dựng tính năng *Smart Trip Planner* giải bài toán CSP giúp tự động sắp xếp thứ tự tham quan/di chuyển qua nhiều địa điểm một cách khoa học, bám sát các ràng buộc thời gian đóng/mở cửa của địa điểm và thời gian di chuyển giữa các chặng.
3.  **Cá nhân hóa và giải quyết bài toán khởi đầu lạnh**: Sử dụng mô hình Naive Bayes để gợi ý địa điểm thông minh theo thói quen cá nhân và ngữ cảnh thời gian, kết hợp giải thuật đề xuất mặc định tại khu vực trung tâm để xử lý triệt để bài toán Cold Start cho người dùng mới.
4.  **Tích hợp trợ lý đàm thoại giọng nói**: Phát triển tính năng nhận diện và chỉ đường bằng giọng nói tiếng Việt tự nhiên (Web Speech API) kết hợp xử lý ngôn ngữ tự nhiên đa lượt (Gemini NLP) giúp người dùng tương tác rảnh tay an toàn khi lái xe.
5.  **Triển khai thực tế trên kiến trúc Multi-Cloud & Serverless**: Triển khai ứng dụng Web React (Vite + MapLibre GL) sử dụng **Firebase Authentication** để xác thực, **Firestore** lưu dữ liệu thời gian thực, **GCP Secret Manager** để quản lý khóa bảo mật, **Google Cloud Storage** quản lý tệp tin và đồng bộ hóa ngầm nhật ký tìm kiếm của người dùng lên đám mây **AWS (Lambda & DynamoDB)** để phục vụ lưu trữ dữ liệu lớn bất đồng bộ.
6.  **Quản trị và phân tích thông minh**: Xây dựng bảng điều khiển quản trị (Admin Dashboard) hiển thị biểu đồ phân tích tương tác trực quan của người dùng, tích hợp trí tuệ nhân tạo Gemini để tự động sinh các thẻ phân tích gợi ý thông minh (AI Insight Cards) hỗ trợ nhà quản lý tối ưu hóa hệ thống.
