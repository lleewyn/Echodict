# EchoDict - Smart Audio Dictation Tool

Ứng dụng web hỗ trợ luyện nghe bằng cách tự động phân đoạn âm thanh (Silence Detection), tương tự như WorkAudioBook nhưng chạy trực tiếp trên trình duyệt.

## ✨ Tính năng
- **Tự động phân đoạn**: Nhận diện khoảng lặng để chia nhỏ file âm thanh.
- **Auto-Replay**: Tự động lặp lại đoạn đang nghe.
- **Điều chỉnh tốc độ**: Nghe chậm hơn để bắt kịp từ mới (0.5x - 2.0x).
- **Phím tắt**: Điều khiển nhanh bằng bàn phím.
- **Offline First**: Mọi xử lý diễn ra ngay trên trình duyệt, không cần tải audio lên server (bảo mật tuyệt đối).

## ⌨️ Phím tắt (Shortcuts)
- `Space`: Phát / Tạm dừng.
- `Mũi tên Trái`: Quay lại đoạn trước.
- `Mũi tên Phải`: Chuyển sang đoạn kế tiếp.
- `Phím R`: Bật/Tắt chế độ tự động lặp lại (Auto-Replay).

## 🚀 Hướng dẫn Deploy (Đưa lên Web)

Vì đây là một ứng dụng Web tĩnh (HTML/JS), bạn có thể đưa nó lên mạng miễn phí chỉ trong vài phút theo các cách sau:

### Cách 1: Sử dụng Vercel (Khuyên dùng)
1. Truy cập [Vercel.com](https://vercel.com) và đăng nhập.
2. Tải công cụ Vercel CLI hoặc kết nối với tài khoản GitHub của bạn.
3. Nếu dùng CLI, bạn chỉ cần mở terminal tại thư mục này và gõ: `vercel`.

### Cách 2: Sử dụng GitHub Pages
1. Tạo một Repository mới trên GitHub.
2. Upload tất cả các file (`index.html`, `styles.css`, `app.js`) lên đó.
3. Vào phần **Settings** -> **Pages** -> Chọn nhánh `main` và lưu lại. 
4. Chờ 1-2 phút, ứng dụng của bạn sẽ có link dạng `https://ten-user.github.io/ten-repo/`.

### Cách 3: Sử dụng Netlify
1. Truy cập [Netlify.com](https://app.netlify.com).
2. Kéo cả thư mục `Audio` này thả vào vùng upload của Netlify.
3. Bạn sẽ nhận được một đường link web ngay lập tức.

## 🛠 Yêu cầu hệ thống
- Trình duyệt hiện đại (Chrome, Edge, Firefox, Safari).
- Không cần cài đặt Node.js hay Backend.
