# 🕵️ Undercover – Gián Điệp Ẩn Danh

Board game suy luận xã hội tiếng Việt cho **3–20 người** chuyền tay trên một thiết bị. Chơi với Dân thường, Gián điệp, Mũ Trắng và các vai mở rộng Công lý, Người tình, Báo thù. Hỗ trợ bỏ phiếu ngoài đời hoặc bỏ phiếu kín, bộ từ tiếng Việt, từ tự tạo, điểm tích lũy và tự lưu ván.

## Chạy và phát triển

Cần Node.js 22.13+ trong dòng 22, Node.js 24 hoặc Node.js 26+.

```sh
npm ci
npm run dev
```

Trên Windows, chạy `start-game.bat` để cài phụ thuộc khi cần và mở game trên cổng 5173.

| Lệnh                                      | Công dụng                                    |
| ----------------------------------------- | -------------------------------------------- |
| `npm run dev`                             | Chạy Vite ở chế độ phát triển                |
| `npm run build`                           | Tạo bản tĩnh và service worker trong `dist/` |
| `npm run preview`                         | Xem bản production trên localhost            |
| `npm run typecheck`                       | Kiểm tra TypeScript strict                   |
| `npm run lint`                            | Kiểm tra ESLint                              |
| `npm run format` / `npm run format:check` | Định dạng hoặc kiểm tra bằng Prettier        |
| `npm test` / `npm run test:unit`          | Chạy unit test bằng Vitest                   |
| `npm run test:e2e`                        | Chạy Playwright khi được yêu cầu             |

Để chạy Playwright lần đầu, dùng `npx playwright install chromium`. Bộ kiểm thử chạy bản production tại `/Undercover/` và mô phỏng một lần phát hành service worker mới.

## Triển khai và kiểm tra ngoại tuyến

1. Chạy `npm ci` và `npm run build`, rồi triển khai nội dung thư mục `dist/` lên HTTPS. Đặt `index.html` và `sw.js` ở thư mục gốc của ứng dụng. Base mặc định tương đối, phù hợp cả với GitHub Pages tại `/Undercover/`. Để tạo đường dẫn tuyệt đối, chạy `npm run build -- --base=/Undercover/`.
2. Dùng `npm run preview` để xác minh bản production trên localhost. Mở app khi có mạng, đợi trình duyệt cài service worker và tải lại trang để worker kiểm soát tab. Trong menu trình duyệt, chọn cài ứng dụng hoặc thêm vào màn hình chính.
3. Bật chế độ máy bay hoặc chọn Offline trong DevTools. Mở lại ứng dụng, tạo ván, phát từ, bỏ phiếu và hoàn thành ván. Tải lại giữa ván và chọn **Tiếp tục** để kiểm tra bản lưu.
4. Triển khai bản mới trên cùng origin và đường dẫn. Khi ứng dụng báo có phiên bản mới, nút **Cập nhật** khả dụng sau khi kết thúc ván hoặc trở về thiết lập. Cập nhật rồi chọn **Tiếp tục** để kiểm tra vị trí đang chơi.

Dữ liệu được lưu trong localStorage, gồm ván, hồ sơ và điểm, từ tự tạo, lịch sử từ đã dùng và tùy chọn. Bản lưu gắn với hồ sơ trình duyệt và origin hiện tại. Khi nâng cấp, ứng dụng đọc dữ liệu v1 hợp lệ và giữ lại các khóa cũ. Dữ liệu sai định dạng được báo trong giao diện và bản gốc được giữ lại.

## Cấu trúc

- `src/game/` chứa mô hình, luật và reducer TypeScript thuần cùng bộ từ.
- `src/app/` điều phối chuyển trạng thái, các hiệu ứng và lưu ván.
- `src/features/` chứa màn hình Preact. CSS Modules bổ sung kiểu riêng cho từng màn hình trên bộ token và kiểu dùng chung hiện có.
- `src/infrastructure/` chứa localStorage, âm thanh, rung, confetti và tích hợp PWA.
- `tests/unit/` chứa unit test. `tests/e2e/` chứa hành trình Playwright chạy theo yêu cầu.

[Hành vi của bản gốc](docs/legacy-behavior.md)
