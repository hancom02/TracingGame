## Why

Xây dựng web platform cho trò chơi chạy trạm ngoài trời (station-based outdoor game) phục vụ demo cho khách hàng. Hệ thống cần quản lý đồng thời nhiều đội chơi di chuyển giữa các trạm thực địa, với đồng hồ đếm ngược và chấm điểm thời gian thực.

## What Changes

- **Mới hoàn toàn**: Khởi tạo project `htrace2` từ đầu với stack HTML + CSS + Node.js + SQLite + Socket.io
- Xây dựng hệ thống quản lý game: tạo game, tạo trạm, ngân hàng câu hỏi trắc nghiệm
- Xây dựng luồng player: quét QR → đăng ký đội → câu hỏi intro → chơi trạm → nộp điểm → xem kết quả
- Xây dựng luồng admin: thiết lập game, điều phối trạm, xác nhận bắt đầu, chấm/chỉnh điểm, theo dõi tiến độ
- Real-time sync giữa player ↔ admin ↔ server qua Socket.io (timer, confirm start, score update)
- **Bugfix**: yêu cầu bắt đầu trạm (`request_start`) không còn bị mất khi admin vắng mặt/reload hoặc player reload — thêm trạng thái `requested` bền trên server thay vì chỉ emit socket tức thời

## Capabilities

### New Capabilities

- `game-management`: Tạo/sửa/xóa game, cài đặt số đội, trạng thái game (waiting/active/ended/reset)
- `station-management`: Tạo/sửa trạm thuộc game, cấu hình thử thách (trắc nghiệm hoặc thể lực), trạm public/private, max đội cùng lúc, thời gian thực hiện
- `question-bank`: Tạo/sửa ngân hàng câu hỏi trắc nghiệm theo từng game (câu hỏi + 4 đáp án + đáp án đúng)
- `player-join`: Quét QR → chọn slot trống → đặt tên đội → session đội
- `player-game-flow`: Câu hỏi intro mở khoá → hiển thị trạm được chỉ định → timer đếm ngược → thử thách → nhập điểm → trạm tiếp theo (random rải đều, tránh trạm đầy) → màn hình kết quả cuối
- `admin-station-control`: Xem danh sách đội đang ở trạm, xác nhận cho đội bắt đầu, xem timer, override điểm
- `admin-monitoring`: 2 màn hình theo dõi — (1) theo trạm: đội nào đang ở đâu + kết quả; (2) theo đội: lịch sử trạm theo thứ tự thời gian
- `scoring`: Player tự nhập điểm trong giờ; sau giờ chỉ admin nhập; admin có quyền override bất kỳ lúc nào; trạm private cho admin cộng/trừ điểm thủ công; điểm tổng hợp thành bảng xếp hạng cuối game

### Modified Capabilities

- `player-game-flow`: Bổ sung yêu cầu phục hồi trạng thái "đang chờ admin xác nhận" khi player reload, và luồng hết hạn yêu cầu sau 1 phút cho phép gửi lại
- `admin-station-control`: Bổ sung yêu cầu admin luôn thấy đủ danh sách đội đang chờ xác nhận dù mới vào trang hay vừa reload

## Impact

- **Stack mới**: Node.js + Express + Socket.io + SQLite (better-sqlite3) + HTML/CSS/Vanilla JS
- **Không có framework frontend**: Vanilla JS, không dùng React/Vue/Flutter Web
- **Database**: SQLite file-based, phù hợp cho demo — không cần migration phức tạp
- **Real-time**: Socket.io rooms theo game_id và station_id để broadcast đúng scope
- **Auth**: express-session đơn giản — admin dùng username/password, player dùng session token tự tạo khi join
- **Hosting**: Chạy local hoặc deploy lên VPS/ngrok để demo
- **Timeline**: 3 ngày (demo prototype)
