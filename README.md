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

## 📁 Cấu trúc dự án

```text
.
├── index.html                  # Trang chính & PWA meta
├── manifest.json               # Web App Manifest (cài đặt PWA)
├── sw.js                       # Service Worker cache offline
├── package.json                # Cấu hình dự án & scripts
├── start-game.bat              # Khởi chạy nhanh 1 click trên Windows
├── scripts/
│   └── dev-server.ps1          # Máy chủ web cục bộ (không cần Node/Python)
├── assets/
│   └── icons/
│       ├── icon.svg            # Logo & Favicon SVG
│       └── icon-maskable.svg   # Icon PWA maskable
└── src/
    ├── css/
    │   ├── tokens.css          # Design tokens, màu sắc & reset
    │   ├── layout.css          # Bố cục, nền neon & thanh điều hướng
    │   ├── components.css      # Thẻ kính, nút, stepper, modal, toast
    │   └── phases.css          # Giao diện từng giai đoạn chơi
    ├── data/
    │   ├── words.js            # Kho 65 cặp từ khóa tiếng Việt
    │   └── avatars.js          # Danh sách avatar & nhãn vai trò
    └── js/
        ├── main.js             # Entry point, gắn sự kiện & đăng ký SW
        ├── core/
        │   ├── audio.js        # Web Audio synthesizer & haptics
        │   ├── router.js       # Bộ điều hướng giai đoạn chơi
        │   ├── state.js        # Trạng thái toàn cục & lưu phiên
        │   ├── storage.js      # Helper localStorage an toàn
        │   ├── utils.js        # Fisher-Yates, chuẩn hóa tiếng Việt
        │   └── wordManager.js  # Chọn từ không lặp & quản lý từ tự tạo
        ├── engine/
        │   └── gameInit.js     # Khởi tạo ván chơi & chia vai trò
        ├── phases/
        │   ├── setup.js        # Giai đoạn 1: Thiết lập ván chơi
        │   ├── distribute.js   # Giai đoạn 2: Phát từ bí mật
        │   ├── describe.js     # Giai đoạn 3: Mô tả & đồng hồ đếm ngược
        │   ├── voting.js       # Giai đoạn 4: Bỏ phiếu ngoài đời / kín
        │   ├── elimination.js  # Giai đoạn 5: Lật vai, Mũ Trắng & chuỗi loại
        │   └── endgame.js      # Giai đoạn 6: Tính điểm & bảng xếp hạng
        └── ui/
            ├── confetti.js     # Hiệu ứng pháo giấy Canvas
            ├── customWordsModal.js # Modal quản lý bộ từ tự tạo
            └── feedback.js     # Toast & Modal động
```

## 🚀 Cách chạy dự án

### Cách 1: Windows 1-Click (Không cần cài đặt gì thêm)
Nhấp đúp vào file **`start-game.bat`** — máy chủ cục bộ sẽ tự động mở game tại `http://localhost:5173`.

### Cách 2: Dùng Node.js (nếu đã cài)
```bash
npm run dev
```

### Cách 3: Deploy lên Web (GitHub Pages / Vercel / Netlify)
Dự án là static web chuẩn ES Modules, chỉ cần đẩy thư mục gốc lên **GitHub Pages**, **Vercel**, hoặc **Netlify** (không cần bước build).
