# Smart Map Cloud Analytics 🌍🚀

[![Node.js](https://img.shields.io/badge/Backend-Node.js-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/Web-React-blue)](https://reactjs.org/)
[![Android](https://img.shields.io/badge/Mobile-Android%20Compose-green)](https://developer.android.com/)
[![AWS](https://img.shields.io/badge/Cloud-AWS-orange)](https://aws.amazon.com/)
[![Google Cloud](https://img.shields.io/badge/Cloud-GCP-blue)](https://cloud.google.com/)

**Smart Map Cloud Analytics** là một hệ sinh thái ứng dụng bản đồ đa nền tảng, tích hợp các dịch vụ đám mây mạnh mẽ từ AWS và Google Cloud Platform (GCP) để cung cấp giải pháp theo dõi vị trí, phân tích dữ liệu và quản lý người dùng theo thời gian thực.

---

## 🏗️ Kiến trúc Hệ thống

Dự án bao gồm 3 thành phần chính:

1.  **Backend (`/backend`)**: API Node.js (Express) xử lý logic nghiệp vụ, tích hợp AWS Location Service, DynamoDB, Lambda và Firebase Admin SDK.
2.  **Web Dashboard (`/web`)**: Ứng dụng React (Vite) hiển thị bản đồ tương tác sử dụng MapLibre GL và dữ liệu từ Backend.
3.  **Android App (`/ggmap_user`)**: Ứng dụng di động (Kotlin & Jetpack Compose) cho phép người dùng định vị, đánh dấu vị trí và gửi dữ liệu lên hệ thống.

---

## ✨ Tính năng chính

-   📍 **Định vị thời gian thực**: Lấy vị trí chính xác của người dùng trên cả Web và Android.
-   🗺️ **Bản đồ tương tác**: Sử dụng Google Maps SDK (Android) và MapLibre GL (Web).
-   🔐 **Xác thực người dùng**: Tích hợp Firebase Authentication (Google & Email/Password).
-   📊 **Cloud Analytics**: Lưu trữ logs và tọa độ vào AWS DynamoDB thông qua Lambda.
-   ☁️ **Cloud Storage**: Quản lý tệp tin với Google Cloud Storage.
-   🛡️ **Bảo mật**: Quản lý API Keys và Secrets qua GCP Secret Manager.

---

## 🛠️ Hướng dẫn Cài đặt & Chạy Local

### 1. Backend (Node.js)
```bash
cd backend
npm install
# Tạo file .env dựa trên .env.example
npm run dev
```

### 2. Web Dashboard (React + Vite)
```bash
cd web
npm install
# Tạo file .env.local dựa trên .env.example
npm run dev
```

### 3. Android App (Kotlin)
- Mở thư mục `ggmap_user` bằng **Android Studio**.
- Tạo file `secrets.properties` với `MAPS_API_KEY=YOUR_KEY`.
- Build và chạy trên máy ảo hoặc thiết bị thật.

---

## 🚀 Triển khai (Deployment)

Dự án được thiết kế để triển khai trên:
- **Backend**: Google Cloud Run.
- **Web**: Firebase Hosting.
- **Database**: Firestore (GCP) & DynamoDB (AWS).
- **Functions**: AWS Lambda.

*Chi tiết các bước deploy xem tại [README_DEPLOY.md](./README_DEPLOY.md).*

---

## 📝 Thông tin Sinh viên
- **Họ và tên**: Lê Nguyễn Duy Cường
- **Đề tài**: Smart Map Cloud Analytics (Integration of AWS & GCP Services)

---

## 📄 Giấy phép
Dự án được thực hiện cho mục đích học tập và nghiên cứu.