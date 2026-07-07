# CHƯƠNG 3: TỔNG KẾT

## 3.1. Kết luận
Đề tài "Xây dựng hệ thống bản đồ thông minh tích hợp AI đa tầng (MAPVIT)" đã được nhóm triển khai thành công từ khâu nghiên cứu lý thuyết giải thuật, thiết kế kiến trúc hệ thống đến lập trình thực nghiệm và tích hợp lên nền tảng Web đám mây. 

Các giải thuật lõi tự viết tay gồm Heuristic $A^*$ tránh kẹt xe, giải bài toán thỏa mãn ràng buộc (CSP) để lập lịch và phân lớp Naive Bayes đều đạt tốc độ phản hồi thực nghiệm tối ưu (dưới 200ms). Trợ lý giọng nói đa lượt tích hợp Gemini AI và Web Speech API có khả năng nhận diện tiếng Việt tự nhiên và phản hồi đàm thoại chính xác, mang lại trải nghiệm tương tác vượt trội.

Hệ thống web hoàn chỉnh tích hợp Multi-Cloud (AWS EC2/Lambda/DynamoDB kết hợp Firebase Auth/Firestore) cho phép dẫn đường, lập lịch trình, gợi ý địa điểm cá nhân hóa và quản trị phân tích thông minh thời gian thực. Kết quả thực nghiệm này thể hiện tính khả thi cao của việc áp dụng trí tuệ nhân tạo đa tầng hỗ trợ tối ưu hóa quy trình tham gia giao thông và quản lý đô thị.

## 3.2. Đóng góp mới với các chương trình/ứng dụng có sẵn

*   **Ứng dụng thuật toán $A^*$ thực tế để tránh ùn tắc động:**
    Mặc dù thuật toán $A^*$ là lý thuyết tìm đường phổ biến, dự án này áp dụng trực tiếp cho bài toán kẹt xe thời gian thực bằng việc gán hệ số phạt kẹt xe động ($S = 10$) vào giờ cao điểm trên Đồ thị mạng lưới đường giao thông (Road Network Graph) thực tế. Hệ thống tự động bẻ hướng vẽ ra tuyến tránh phụ màu Xanh Lá 🟢 khác biệt hoàn toàn với tuyến đi thẳng màu Tím của AWS, giúp người dùng tiết kiệm thời gian di chuyển.
*   **Lập lịch hành trình tối ưu giải quyết đa ràng buộc:**
    Các ứng dụng bản đồ hiện có chỉ hỗ trợ dẫn đường tuần tự. MAPVIT đóng góp tính năng lập lịch tự động thông qua giải thuật CSP và thuật toán Backtracking đệ quy, tự động tính toán và sắp xếp thứ tự đi qua nhiều địa điểm khoa học nhất dựa trên thời gian mở/đóng cửa của địa điểm và thời gian lái xe thực tế.
*   **Tương tác đàm thoại giọng nói đa lượt tiếng Việt rảnh tay:**
    Hệ thống đóng góp tính năng tương tác tự nhiên tích hợp mô hình ngôn ngữ lớn Gemini AI và Web Speech API. Người lái xe có thể đàm thoại qua lại với trợ lý ảo bằng tiếng Việt đời thường, AI có khả năng nhớ ngữ cảnh câu lệnh trước đó để thực thi tìm kiếm địa điểm và đọc to chỉ dẫn ra loa thiết bị, nâng cao độ an toàn khi lái xe.
*   **Kiến trúc Multi-Cloud Serverless và Admin Dashboard tích hợp Generative AI:**
    Dự án xây dựng mô hình ghi log bất đồng bộ đẩy qua AWS Lambda để chuẩn hóa dữ liệu tìm kiếm và lưu trữ tại DynamoDB mà không gây tải cho web server chính. Đồng thời, trang quản trị của MAPVIT tích hợp Gemini AI để tự sinh các thẻ phân tích gợi ý thông minh (AI Insight Cards) hỗ trợ nhà quản lý đô thị ra quyết định nhanh chóng.

## 3.3. Hạn chế của hệ thống
*   **Độ trễ xử lý ngôn ngữ:** Do mô hình Gemini AI là API đám mây quốc tế của Google, quá trình suy luận đàm thoại giọng nói thỉnh thoảng có độ trễ nhỏ từ 1.5s - 2s tùy thuộc vào băng thông kết nối internet toàn cầu.
*   **Phạm vi dữ liệu đồ thị:** Đồ thị mạng lưới đường (Road Network Graph) phục vụ thuật toán tìm đường $A^*$ hiện tại mới chỉ được thu thập và định nghĩa giới hạn tại khu vực trung tâm TP.HCM để thử nghiệm giải thuật, chưa mở rộng ra toàn hệ thống giao thông cả nước.
*   **Sự phụ thuộc vào bên thứ ba:** Việc hiển thị bản đồ nền và geocoding địa chỉ phụ thuộc nhiều vào AWS Location Service, dẫn đến rủi ro gián đoạn hiển thị nếu kết nối AWS bị mất.

## 3.4. Hướng phát triển trong tương lai
*   **Tích hợp Mạng nơ-ron đồ thị (GNN):** Huấn luyện mô hình học máy GNN trên tập dữ liệu lịch sử lưu lượng để dự báo mật độ kẹt xe động của từng tuyến đường theo thời gian, giúp thuật toán $A^*$ tìm đường thông minh hơn nữa.
*   **Edge AI và Mô hình ngôn ngữ nhỏ (SLM):** Triển khai các thư viện Speech-to-Text và mô hình ngôn ngữ nhỏ cục bộ ngay trên thiết bị người dùng (sử dụng ONNX hoặc WebGPU) để xử lý giọng nói tức thời không phụ thuộc vào internet, triệt tiêu độ trễ đàm thoại về $0\text{ ms}$.
*   **Tự động cập nhật bản đồ từ camera hành trình:** Tích hợp các mô hình thị giác máy tính học sâu (như YOLO) để tự động nhận diện các biển cấm tạm thời, biển báo giao thông, công trình thi công hoặc các chướng ngại vật cản trở di chuyển từ camera hành trình của phương tiện, từ đó tự cập nhật ngay trạng thái hoạt động của các cạnh đường đi trên cơ sở dữ liệu đồ thị DynamoDB.

---

## TÀI LIỆU THAM KHẢO

[1] Stuart Russell and Peter Norvig, *Artificial Intelligence: A Modern Approach*, Fourth Edition, Chapters 3 (Heuristic Search) & Chapter 6 (Constraint Satisfaction Problems), Pearson Education, 2021.
[2] Google Cloud Platform, *Gemini API Developer Guide - Structured JSON Outputs and System Instructions*, 08/2025, https://ai.google.dev/gemini-api/docs
[3] Amazon Web Services, *Amazon Location Service Developer Guide - Routing and Geocoding*, 08/2025, https://docs.aws.amazon.com/location/
[4] MapLibre, *MapLibre GL JS - Vector Tile Rendering Reference*, 2025, https://maplibre.org/maplibre-gl-js/docs/
[5] Web Hypertext Application Technology Working Group (WHATWG), *Web Speech API Specification - SpeechRecognition & SpeechSynthesis*, 2025, https://wicg.github.io/speech-api/
