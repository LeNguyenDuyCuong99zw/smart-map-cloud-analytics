# TRẢ LỜI CÂU HỎI PHẢN BIỆN (DATASET & PIPELINE) - MAPVIT

### 1. Dataset có phân nhánh không?
*   **Không (Gợi ý địa điểm):** Dữ liệu tổ chức phẳng theo 4 nhóm đơn giản (Cafe, Nhà hàng, Trạm xăng, Mua sắm).
*   **Có (Bản đồ $A^*$):** Đồ thị mạng lưới đường đi có các nhánh rẽ tại các tọa độ ngã ba, ngã tư.

### 2. Có bao nhiêu thực thể (đối tượng) trong dataset?
*   **Số lượng phân lớp (Classes/Labels):** Có **4 lớp đối tượng/thực thể chính** được gán nhãn gồm: *Cafe, Nhà hàng (Restaurant), Trạm xăng (Gas Station), và Mua sắm (Shopping)*.
*   **Số lượng thực thể địa điểm thực tế (Real-world Entities):** Có **50 địa điểm thực tế** tiêu biểu quanh khu vực Quận 1, TP.HCM (được cào từ Overpass API).
*   *Lưu ý phân biệt:* Con số **500** là tổng số **mẫu ghi/bản ghi lịch sử** (samples) dùng để huấn luyện và kiểm thử mô hình gợi ý, không phải số lượng thực thể.

### 3. Khai thác luồng dữ liệu kết hợp (data pipeline) như thế nào?
*   **Luồng:** Người dùng tương tác $\rightarrow$ Đồng bộ lên **Firebase Firestore** (Real-time) $\rightarrow$ Đẩy qua **AWS Lambda** làm sạch $\rightarrow$ Lưu vào **AWS DynamoDB** (Analytics) để vẽ biểu đồ và cho Gemini AI phân tích sinh thẻ gợi ý (Insight Cards).

### 4. Dataset có được gán nhãn (labeled) hay không gán nhãn (unlabeled)?
*   **Có gán nhãn (Labeled):** Mọi lịch sử tìm kiếm đều được gắn nhãn danh mục cụ thể (Ví dụ: "Phở" $\rightarrow$ nhãn `Restaurant`) nhằm phục vụ huấn luyện học máy có giám sát Naive Bayes.

### 5. Dự án có dùng Phân cụm dữ liệu (Data clustering) không?
*   **Không sử dụng:** MapVit dùng **Phân lớp (Classification - Naive Bayes)** trên dữ liệu đã gán nhãn, không dùng phân cụm (Clustering - học không giám sát) trên dữ liệu không gán nhãn.
*   *Mở rộng:* Nếu nâng cấp, có thể áp dụng thuật toán phân cụm (như DBSCAN) để gom nhóm các tọa độ GPS thô thành các điểm nóng giao thông hoặc vùng kẹt xe.

---

## III. ĐỊNH NGHĨA CÁC KHÁI NIỆM CƠ BẢN (DÀNH CHO BẢO VỆ)

Để tự tin trả lời khi thầy cô hỏi định nghĩa, bạn có thể giải thích ngắn gọn như sau:

### 1. Dataset (Tập dữ liệu) là gì?
*   **Định nghĩa:** Là tập hợp chứa toàn bộ các mẫu thông tin, số liệu được thu thập và cấu trúc lại để huấn luyện hoặc kiểm tra mô hình AI/ML.
*   **Trong MapVit:** Dataset chính là **500 bản ghi lịch sử click/tìm kiếm** của người dùng (chứa thông tin: thời gian, thứ trong tuần, vĩ độ, kinh độ và danh mục địa điểm).

### 2. Entity / Object (Thực thể / Đối tượng) là gì?
*   **Định nghĩa:** 
    *   *Trong cơ sở dữ liệu:* Là các đối tượng thực tế ngoài đời thực cần quản lý (như quán cafe, người dùng).
    *   *Trong Học máy:* Là các lớp nhãn (Classes) mục tiêu mà mô hình cần phân loại hoặc nhận diện.
*   **Trong MapVit:** 
    *   Đối tượng phân lớp: **4 loại thực thể** (Cafe, Nhà hàng, Trạm xăng, Mua sắm).
    *   Đối tượng địa lý: **50 địa điểm thực tế** tại Quận 1 (Chợ Bến Thành, Dinh Độc Lập...).

### 3. Data Pipeline (Luồng dữ liệu) là gì?
*   **Định nghĩa:** Là quy trình tự động giúp vận chuyển dữ liệu từ nơi phát sinh (Frontend/Client) đi qua các bước lọc, chuẩn hóa, biến đổi (ETL) và lưu trữ vào kho dữ liệu cuối cùng (Database/Cloud) để khai thác.
*   **Trong MapVit:** Hành động click của User $\rightarrow$ Ghi nhận tức thời ở **Firebase** $\rightarrow$ Đẩy qua **AWS Lambda** để xóa tiền tố kỹ thuật thừa $\rightarrow$ Lưu vào **DynamoDB** để vẽ biểu đồ và cho AI phân tích.

### 4. Labeled (Có nhãn) và Unlabeled (Không nhãn) là gì?
*   **Labeled (Có nhãn):** Dữ liệu đã được gán sẵn kết quả/đáp án (Ví dụ: dữ liệu tìm kiếm "Phở Hùng" được gắn nhãn sẵn là "Restaurant"). Dùng cho học có giám sát (Supervised Learning) như Naive Bayes.
*   **Unlabeled (Không nhãn):** Dữ liệu thô hoàn toàn chưa có đáp án hay phân loại từ trước. Dùng cho học không giám sát (Unsupervised Learning) như phân cụm.

### 5. Data Clustering (Phân cụm dữ liệu) là gì?
*   **Định nghĩa:** Là thuật toán học không giám sát tự động nhóm các dữ liệu thô (không gán nhãn) lại gần nhau thành các cụm (cluster) dựa trên độ tương đồng hoặc khoảng cách hình học giữa chúng.
*   **Trong MapVit:** MapVit **không dùng** phân cụm. Nhưng nếu áp dụng, thuật toán sẽ tự động gom các tọa độ GPS báo kẹt xe rời rạc gần nhau để vẽ thành một vùng kẹt xe lớn trên bản đồ.

