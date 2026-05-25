# 🚀 Hướng Dẫn Khởi Chạy Nhanh Dự Án (Local Setup Guide)

Tài liệu này hướng dẫn cách cấu hình chi tiết và khởi chạy nhanh 2 thành phần chính của hệ thống là **Backend** và **Frontend (Web)** ở môi trường cục bộ (local).

---

## 📂 Các file cần chuẩn bị (Nhận trực tiếp từ người gửi)

Vì lý do bảo mật, các file chứa mã khóa cá nhân đã được đưa vào `.gitignore` để tránh bị lộ trên GitHub. Để chạy được dự án, bạn hãy xin **người quản trị dự án** gửi trực tiếp 2 file sau:

1. **File 1**: `.env` (Của Backend)
2. **File 2**: `.env.local` (Của Frontend)

---

## 🛠️ Bước 1: Khởi chạy Backend (`/backend`)

1. Mở terminal tại thư mục dự án và di chuyển vào `backend/`:
   ```bash
   cd backend
   ```
2. Cài đặt các thư viện cần thiết:
   ```bash
   npm install
   ```
3. Đặt file **`.env`** nhận được từ người quản trị vào trực tiếp thư mục **`backend/`**.
   *(File này chứa thông tin cấu hình cổng chạy 3001, Google Maps API Key và khóa bí mật kết nối Firebase Admin SDK).*
4. Khởi chạy server API:
   ```bash
   npm run dev
   ```
   *Server Backend sẽ chạy thành công tại địa chỉ: `http://localhost:3001`*

---

## 💻 Bước 2: Khởi chạy Frontend Web (`/web`)

1. Mở một cửa sổ terminal mới và di chuyển vào thư mục `web/`:
   ```bash
   cd web
   ```
2. Cài đặt các thư viện cần thiết:
   ```bash
   npm install
   ```
3. Đặt file **`.env.local`** nhận được từ người quản trị vào trực tiếp thư mục **`web/`**.
   *(File này chứa thông tin Firebase Client Config để xác thực người dùng đăng nhập và khóa AWS Location Service để hiển thị bản đồ vector).*
4. Khởi chạy giao diện Web:
   ```bash
   npm run dev
   ```
   *Giao diện Web sẽ chạy thành công tại địa chỉ: `http://localhost:5173`*

---

## 🔍 Kiểm tra hoạt động
* Mở trình duyệt và truy cập `http://localhost:5173`.
* Bạn có thể đăng nhập bằng tài khoản Google hoặc Email/Password để trải nghiệm tính năng tìm kiếm địa điểm, vẽ đường đi thời gian thực và theo dõi dữ liệu phân tích (Analytics).
