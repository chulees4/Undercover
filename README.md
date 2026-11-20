# 🕵️ Undercover – Gián Điệp Ẩn Danh

Web game suy luận xã hội **Pass & Play** 100% tiếng Việt, hoạt động hoàn toàn **offline (PWA)** trên một thiết bị duy nhất — không cần cài thư viện hay CDN bên ngoài.

## ✨ Tính năng nổi bật

- **3 – 20 người chơi** với công thức tự động cân bằng vai trò (**Dân thường**, **Gián điệp**, **Mũ Trắng / Mr. White**).
- **3 vai trò mở rộng**:
  - ⚖️ **Nữ thần Công lý** (phá thế hòa phiếu kín).
  - 💘 **Cặp đôi Người tình** (loại dây chuyền).
  - ⚔️ **Kẻ báo thù** (kéo theo 1 người khi bị loại).
- **65+ cặp từ tiếng Việt** chia theo 5 chủ đề (*Phổ thông, Ẩm thực VN, Địa danh & Du lịch, Phim & Giải trí, Công nghệ & Đời sống*) + **Bộ từ tự tạo** lưu cục bộ, tự động chống lặp từ.
- **Chống nhìn trộm (Pass & Play)**: Màn hình chuyển máy riêng tư + thẻ **Nhấn giữ để xem từ**.
- **2 chế độ bỏ phiếu**: Ngoài đời & Bỏ phiếu kín chuyền tay.
- **Cơ hội lật kèo Mũ Trắng (20 giây)**: Chuẩn hóa tiếng Việt không dấu & khớp từ đồng nghĩa thông minh.
- **Âm thanh Web Audio API tổng hợp** (0 file MP3), rung phản hồi (Haptics), pháo giấy Confetti, lưu tiến trình tự động (`localStorage`) và hỗ trợ cài đặt thành ứng dụng **PWA**.

## 🚀 Cách chạy dự án

### Cách 1: Windows 1-Click (Không cần cài đặt gì thêm)
Nhấp đúp vào file **`start-game.bat`** — máy chủ cục bộ sẽ tự động mở game tại `http://localhost:5173`.

### Cách 2: Dùng Node.js (nếu đã cài)
```bash
npm run dev
```

### Cách 3: Deploy lên Web (GitHub Pages / Vercel / Netlify)
Dự án là static web chuẩn ES Modules, chỉ cần đẩy thư mục gốc lên **GitHub Pages**, **Vercel**, hoặc **Netlify** (không cần bước build).
