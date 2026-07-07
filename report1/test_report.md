# Báo cáo Thực nghiệm & Kiểm thử Hệ thống MAPVIT

Nhóm nghiên cứu đã thực hiện chạy thực nghiệm kiểm thử trực quan trên môi trường local (`http://localhost:5173`) với tài khoản kiểm thử được cung cấp:
- **Tài khoản**: `dc1@gmail.com`
- **Mật khẩu**: `123123123`

---

## I. Danh mục tính năng đã xác minh (Checklist)

- [x] **Xác thực người dùng (Auth)**: Đăng nhập thành công bằng Firebase Authentication, giao diện tự động chuyển hướng về trang bản đồ chính.
- [x] **Tải bản đồ số (Map Canvas)**: MapLibre GL kết nối AWS Location Service tải bản đồ nhanh, hiển thị mượt mà.
- [x] **Định vị GPS**: Hệ thống lấy vị trí của trình duyệt để gán làm điểm xuất phát mặc định.
- [x] **Tìm đường đa tuyến**: Tự động tính toán song song:
  - **AWS Route (Tuyến thẳng mặc định - Màu Tím)**
  - **A\* Route (Tuyến tránh kẹt xe - Màu Xanh Lá 🟢)**
- [x] **Giả lập dẫn đường**: Điểm di chuyển (Marker xe chạy) hoạt động mượt mà, đồng bộ với tuyến đường tránh.
- [x] **VietMap AI (Voice Narration & TTS)**: Kích hoạt giọng nói chỉ đường thành công.

---

## II. Hình ảnh Thực tế Kiểm thử (Screenshots)

````carousel
![Trang Bản đồ chính sau khi đăng nhập](/Users/PC/.gemini/antigravity-ide/brain/4ac394a6-35a2-4e83-9fbf-838e6ed04003/main_map_page_1783376125413.png)
<!-- slide -->
![Vẽ Tuyến đường tránh từ Chợ Bến Thành đi Sân bay Tân Sơn Nhất](/Users/PC/.gemini/antigravity-ide/brain/4ac394a6-35a2-4e83-9fbf-838e6ed04003/route_ben_thanh_tan_son_nhat_1783376253558.png)
<!-- slide -->
![Bắt đầu giả lập dẫn đường tránh kẹt xe](/Users/PC/.gemini/antigravity-ide/brain/4ac394a6-35a2-4e83-9fbf-838e6ed04003/map_navigation_active_1783376270032.png)
````

---

## III. Phân tích Chi tiết Thuật toán A* tránh kẹt xe thực tế

Dựa trên kết quả vẽ tuyến đường từ **Chợ Bến Thành** đi **Sân bay Tân Sơn Nhất** ở hình ảnh trên:
1. **AWS Route (Màu Tím)** đề xuất đi thẳng xuyên tâm qua các trục đường chính ngắn nhất.
2. **A\* Route (Màu Xanh Lá 🟢)** đã tự động tính toán, phát hiện trọng số phạt kẹt xe giả lập ở trục chính lớn và bẻ hướng rẽ nhánh sang tuyến đường tránh thông thoáng hơn để đi đến đích.
3. Chức năng giả lập hoạt động đúng theo tọa độ của thuật toán $A^*$, dịch chuyển mượt mà trên đường tránh.

> [!NOTE]
> Hệ thống hoạt động rất ổn định, không ghi nhận bất kỳ lỗi JavaScript nào trên Console Log trong suốt quá trình đăng nhập và định tuyến.
