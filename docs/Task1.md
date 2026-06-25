# Kế hoạch Tích hợp Trí tuệ Nhân tạo (AI) vào Smart Map Cloud Analytics

## Tổng quan

**Smart Map Cloud Analytics (MAPVIT)** hiện là một hệ sinh thái bản đồ đa nền tảng (Node.js backend, React web, Android app) sử dụng AWS Location Service, Firebase Firestore, GCP và DynamoDB. Dữ liệu hành vi người dùng (lịch sử tìm kiếm, địa điểm yêu thích) đang được thu thập nhưng **chưa được khai thác bằng AI**.

Kế hoạch này đề xuất **4 tính năng AI cụ thể**, được phân chia theo độ ưu tiên và mức độ phức tạp, hoàn toàn phù hợp với kiến trúc hiện tại.

---

## Phân tích Hiện trạng

| Thành phần | Công nghệ | Dữ liệu AI có thể khai thác |
|---|---|---|
| Backend | Node.js / Express | Lịch sử tìm kiếm, tọa độ, hành vi người dùng |
| Firestore | Firebase | `users/{uid}/history`, `users/{uid}/favorites` |
| DynamoDB | AWS Lambda | Search queries, place logs theo thời gian thực |
| Web Dashboard | React + MapLibre | Click map, thời gian xem địa điểm |
| Android | Kotlin + Compose | GPS tracking, chuyển động người dùng |

**Điểm yếu hiện tại cần AI giải quyết:**
- Rating địa điểm đang là mock (`rating: 4.5, isOpen: true`) — cần AI phân tích thực tế
- Hướng dẫn chỉ đường chỉ có "Tiếp tục đi thẳng" — cần NLP tạo instructions thực
- Tìm kiếm chỉ dựa text match — cần hiểu ngữ nghĩa (semantic search)
- Admin dashboard chỉ hiện số liệu thô — cần AI phân tích xu hướng

---

## Tính năng AI đề xuất

### 🤖 Tính năng 1: AI Chatbot Tư vấn Địa điểm (Ưu tiên cao nhất)

**Mô tả:** Tích hợp một AI assistant vào giao diện web, cho phép người dùng hỏi bằng ngôn ngữ tự nhiên như _"Tìm quán cà phê view đẹp gần đây"_, _"Đường đi đến sân bay Tân Sơn Nhất vào giờ cao điểm mất bao lâu?"_

**Công nghệ:** Google Gemini API (Free tier) + Prompt Engineering

**Kiến trúc:**
```
User Chat Input
    → Backend: POST /ai/chat
    → Gemini API (system prompt + user location context)
    → Parse AI response → searchPlaces() hoặc getDirections()
    → Trả kết quả có ngữ cảnh + hiển thị trên bản đồ
```

**Thay đổi cần làm:**
- **[NEW]** `backend/src/controllers/aiController.js` — xử lý chat với Gemini
- **[NEW]** `backend/src/routes/ai.js` — route `/ai/chat`
- **[MODIFY]** `backend/src/app.js` — đăng ký route mới
- **[NEW]** `web/src/components/AIChatPanel.jsx` — UI chat panel
- **[MODIFY]** `web/src/pages/MapPage.jsx` — thêm tab "AI Assistant"

**Ước tính:** 2-3 ngày • Chi phí: Miễn phí (Gemini Free tier)

---

### 📊 Tính năng 2: AI Phân tích Xu hướng trên Dashboard Analytics (Ưu tiên cao)

**Mô tả:** Thêm AI summarization vào trang Admin Analytics. Thay vì chỉ hiện bảng số liệu thô, AI sẽ tự động phân tích và tóm tắt: _"Tuần này người dùng tìm kiếm 'quán ăn' tăng 42%, tập trung ở khu vực Quận 1. Đề xuất: Cải thiện dữ liệu địa điểm ăn uống khu vực này."_

**Công nghệ:** Gemini API + AWS DynamoDB data

**Kiến trúc:**
```
Admin Dashboard loads
    → Fetch analytics data (DynamoDB via Lambda)
    → POST /ai/analyze với raw analytics JSON
    → Gemini summarizes + generates insights
    → Hiển thị "AI Insight Card" trên dashboard
```

**Thay đổi cần làm:**
- **[MODIFY]** `backend/src/controllers/aiController.js` — thêm hàm `analyzeData()`
- **[NEW]** `backend/src/routes/ai.js` — route `/ai/analyze`
- **[MODIFY]** `web/src/pages/AnalyticsPage.jsx` — thêm AI Insight Card

**Ước tính:** 1-2 ngày • Chi phí: Miễn phí

---

### 🔮 Tính năng 3: Gợi ý Địa điểm Thông minh (Personalized Recommendations)

**Mô tả:** Dựa trên lịch sử tìm kiếm và địa điểm yêu thích của từng user trong Firestore, AI sẽ gợi ý địa điểm phù hợp khi họ mở ứng dụng. Ví dụ: user hay tìm "cà phê" thì khi vào app sẽ thấy gợi ý các quán cà phê gần vị trí hiện tại.

**Công nghệ:** Gemini API + Firestore history data + AWS Location Service

**Kiến trúc:**
```
User opens app + shares location
    → GET /ai/recommendations?uid=xxx&lat=xxx&lng=xxx
    → Backend: đọc 20 history gần nhất từ Firestore
    → Gemini: extract user preferences từ history
    → AWS Location: search places theo preferences gần vị trí
    → Trả danh sách gợi ý có AI score
```

**Thay đổi cần làm:**
- **[MODIFY]** `backend/src/controllers/aiController.js` — thêm `getRecommendations()`
- **[MODIFY]** `web/src/pages/MapPage.jsx` — hiển thị "Gợi ý cho bạn" khi idle
- **[MODIFY]** `ggmap_user/` — thêm màn hình Recommendations (Android)

**Ước tính:** 3-4 ngày • Chi phí: Miễn phí

---

### 🗺️ Tính năng 4: Smart Route Narration (AI Chỉ đường bằng Giọng nói NLP)

**Mô tả:** Hiện tại `historyController.js` trả về `"Tiếp tục đi thẳng"` cho mọi bước. AI sẽ phân tích geometry của route và tạo ra hướng dẫn tự nhiên bằng tiếng Việt: _"Đi thẳng 500m, đến ngã tư Nguyễn Huệ - Lê Lợi, rẽ phải..."_

**Công nghệ:** Gemini API + AWS Route Geometry data

**Kiến trúc:**
```
Route geometry trả về từ AWS
    → POST /ai/narrate-route với geometry + step data
    → Gemini: tạo human-readable instructions tiếng Việt
    → Hiển thị từng bước có thể đọc được + Text-to-Speech (Web Speech API)
```

**Thay đổi cần làm:**
- **[MODIFY]** `backend/src/controllers/placesController.js` — pipe geometry qua AI
- **[MODIFY]** `backend/src/controllers/aiController.js` — thêm `narrateRoute()`
- **[MODIFY]** `web/src/pages/MapPage.jsx` — hiển thị turn-by-turn instructions

**Ước tính:** 2-3 ngày • Chi phí: Miễn phí

---

## Lộ trình Thực hiện (Roadmap)

```
Tuần 1: Setup + Tính năng 1 (AI Chatbot)
├── Cài đặt @google/generative-ai package
├── Tạo aiController.js + route
├── Build AIChatPanel.jsx
└── Test integration

Tuần 2: Tính năng 2 + 3 (Analytics AI + Recommendations)
├── AI Insight Card cho AnalyticsPage
├── Recommendations engine
└── Update Firestore queries

Tuần 3: Tính năng 4 + Polish (Smart Route)
├── Route narration
├── Text-to-Speech Web API
└── Android updates (nếu có thời gian)
```

## Stack kỹ thuật bổ sung

| Package | Mục đích | Cài đặt |
|---|---|---|
| `@google/generative-ai` | Gemini API client | `npm install @google/generative-ai` (backend) |
| `Web Speech API` | Text-to-speech route narration | Built-in browser, không cần cài |

## Biến môi trường cần thêm

```env
# backend/.env
GEMINI_API_KEY=your_gemini_api_key_here
```

## Verification Plan

### Automated
- Gọi thử `POST /ai/chat` với Postman/curl và kiểm tra response hợp lệ
- Chạy `npm test` để đảm bảo không có regression

### Manual (Browser)
- Mở MapPage → Tab "AI" → Gõ "quán cà phê gần đây" → kết quả hiện trên bản đồ
- Mở AnalyticsPage → Kiểm tra AI Insight Card
- Tìm route → Kiểm tra hướng dẫn chỉ đường tiếng Việt

---

## Open Questions

> [!IMPORTANT]
> **Câu hỏi 1:** Bạn muốn triển khai **tất cả 4 tính năng** hay chỉ một số? Tính năng được ưu tiên nhất là **AI Chatbot (Tính năng 1)** và **Analytics AI (Tính năng 2)**.

> [!IMPORTANT]
> **Câu hỏi 2:** Bạn đã có **Gemini API Key** chưa? Nếu chưa, cần đăng ký tại [Google AI Studio](https://aistudio.google.com) (miễn phí).

> [!NOTE]
> **Câu hỏi 3:** Bạn muốn AI chatbot giao tiếp bằng **tiếng Việt** hay song ngữ Việt-Anh?

> [!NOTE]
> **Câu hỏi 4:** Có muốn cập nhật cả **Android app** hoặc chỉ tập trung vào Web + Backend trước?
