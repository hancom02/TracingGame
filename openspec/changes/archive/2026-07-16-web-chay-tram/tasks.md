## 1. Project Setup

- [x] 1.1 Khởi tạo `package.json` với dependencies: express, socket.io, better-sqlite3, express-session, bcrypt, uuid, qrcode
- [x] 1.2 Tạo cấu trúc thư mục: `server/`, `db/`, `routes/`, `socket/`, `middleware/`, `public/admin/`, `public/player/`, `public/css/`, `public/js/`
- [x] 1.3 Tạo `server.js` — khởi tạo Express + Socket.io + session middleware + serve static files
- [x] 1.4 Tạo `db/schema.sql` với toàn bộ DDL (admins, games, stations, question_bank, teams, team_stations)
- [x] 1.5 Tạo `db/database.js` — kết nối SQLite, chạy schema, export db instance
- [x] 1.6 Tạo `db/seed.js` — tạo tài khoản admin mặc định (admin/admin123)
- [x] 1.7 Tạo `middleware/auth.js` — middleware `isAdmin` kiểm tra session
- [x] 1.8 Tạo `public/css/style.css` — design system: màu sắc, typography (Google Fonts), layout utilities, responsive

## 2. Admin Auth & Dashboard

- [x] 2.1 Tạo route `POST /api/auth/login` và `POST /api/auth/logout` trong `routes/auth.js`
- [x] 2.2 Tạo `public/admin/login.html` — form đăng nhập admin
- [x] 2.3 Tạo `public/admin/dashboard.html` — danh sách games với nút tạo mới, edit, xem QR

## 3. Game & Station Management (Admin)

- [x] 3.1 Tạo CRUD routes trong `routes/games.js`: GET /api/games, POST /api/games, PUT /api/games/:id, DELETE /api/games/:id
- [x] 3.2 Tạo CRUD routes trong `routes/stations.js`: GET /api/stations?game_id=, POST /api/stations, PUT /api/stations/:id, DELETE /api/stations/:id
- [x] 3.3 Tạo `public/admin/game-setup.html` — form tạo/sửa game (tên, banner URL, số đội)
- [x] 3.4 Tạo `public/admin/station-setup.html` — form tạo/sửa trạm (đầy đủ fields), dropdown chọn challenge type và câu hỏi từ ngân hàng
- [x] 3.5 Thêm route `GET /api/games/:id/qr` — generate QR code image trả về dạng base64

## 4. Question Bank (Admin)

- [x] 4.1 Tạo CRUD routes trong `routes/questions.js`: GET /api/questions?game_id=, POST /api/questions, PUT /api/questions/:id, DELETE /api/questions/:id
- [x] 4.2 Tạo `public/admin/questions.html` — list + form tạo/sửa câu hỏi (4 đáp án, radio đáp án đúng)

## 5. Game Control (Admin)

- [x] 5.1 Thêm route `POST /api/games/:id/start`, `/end`, `/reset` trong `routes/games.js`
- [x] 5.2 Tạo `public/admin/game-control.html` — nút Start/End/Reset + hiển thị status game + link QR code
- [x] 5.3 Khi admin reset game: xóa tất cả team_stations, reset teams về `waiting`, reset game về `waiting`

## 6. Player Join Flow

- [x] 6.1 Tạo routes trong `routes/teams.js`: GET /api/games/:id/slots (danh sách slot), POST /api/teams/join (tạo đội)
- [x] 6.2 Tạo `public/player/join.html` — hiển thị grid slots, form nhập tên đội, xử lý join + lưu session_token vào localStorage
- [x] 6.3 Tạo `public/player/welcome.html` — chào mừng đội, nút bắt đầu dẫn đến câu hỏi intro
- [x] 6.4 Thêm logic middleware player: kiểm tra session_token → redirect về màn hình đúng nếu đã có session

## 7. Player Game Flow — Câu hỏi & Trạm

- [x] 7.1 Tạo route `GET /api/games/:id/intro-question` — lấy ngẫu nhiên câu hỏi từ ngân hàng
- [x] 7.2 Tạo route `POST /api/teams/:id/verify-answer` — kiểm tra đáp án, trả về kết quả đúng/sai + trạm đầu tiên nếu đúng
- [x] 7.3 Tạo `public/player/question.html` — hiển thị câu hỏi trắc nghiệm 4 đáp án, xử lý đúng/sai
- [x] 7.4 Tạo `public/player/game.html` — màn hình chính player: hiển thị trạm hiện tại (tên, mô tả, map link, gợi ý), nút "Bắt đầu", timer, thử thách, form nhập điểm
- [x] 7.5 Logic random trạm tiếp theo: filter trạm public chưa đến + chưa đầy → random 1 → tạo team_stations record

## 8. Real-time Socket.io

- [x] 8.1 Tạo `socket/handlers.js` — setup rooms: `game:{id}`, `station:{id}`, `team:{id}`
- [x] 8.2 Xử lý event `team:request_start` — broadcast đến admin room `station:{id}`
- [x] 8.3 Xử lý event `admin:confirm_start` — khởi động server-side timer, lưu started_at, broadcast `start:confirmed` đến `team:{id}`
- [x] 8.4 Server-side timer: dùng setInterval mỗi 1000ms, broadcast `timer:tick` với remaining seconds đến `team:{id}`, khi hết emit `timer:expired`
- [x] 8.5 Xử lý event `team:submit_score` — lưu điểm nếu timer còn chạy, emit `score:accepted`
- [x] 8.6 Xử lý event `admin:override_score` — lưu điểm với `score_updated_by='admin'`, broadcast cập nhật
- [x] 8.7 Xử lý event `team:answer_question` (MCQ challenge) — ghi nhận đáp án, notify admin
- [x] 8.8 Xử lý event `admin:end_game` — broadcast `game:ended` đến tất cả trong room `game:{id}`
- [x] 8.9 Xử lý event `admin:reset_game` — reset DB, broadcast về tất cả player

## 9. Admin Station Control View

- [x] 9.1 Tạo `public/admin/station-view.html` — màn hình trực trạm: danh sách đội đang ở trạm, trạng thái từng đội, timer live, nút confirm start, form nhập/override điểm
- [x] 9.2 Kết nối Socket.io client để nhận `team:request_start`, hiển thị nút xác nhận real-time
- [x] 9.3 Thêm form nhập điểm trạm private — dropdown chọn đội, input điểm (cho phép âm), submit

## 10. Admin Monitoring

- [x] 10.1 Tạo route `GET /api/games/:id/monitor/stations` — trả về tất cả trạm + đội tại mỗi trạm + điểm
- [x] 10.2 Tạo route `GET /api/games/:id/monitor/teams` — trả về tất cả đội + lịch sử trạm theo thứ tự thời gian
- [x] 10.3 Tạo `public/admin/monitor-station.html` — grid theo trạm, cập nhật real-time qua Socket.io
- [x] 10.4 Tạo `public/admin/monitor-team.html` — list đội + timeline trạm đã đi, tổng điểm từng đội

## 11. Scoring & Results

- [x] 11.1 Tạo route `GET /api/games/:id/leaderboard` — trả về bảng XH (tên đội + tổng điểm, sắp xếp giảm dần)
- [x] 11.2 Tạo route `GET /api/teams/:id/result` — trả về điểm từng trạm public + tổng điểm (kể cả private)
- [x] 11.3 Tạo `public/player/result.html` — màn hình kết quả: điểm từng trạm public, tổng điểm đội, bảng XH toàn game

## 12. Polish & QA

- [x] 12.1 Responsive CSS cho tất cả màn hình player (mobile-first)
- [x] 12.2 Xử lý edge case: player disconnect/reconnect → restore state từ localStorage + session
- [x] 12.3 Xử lý edge case: tất cả trạm đều đầy → player phải chờ (hiển thị thông báo, polling mỗi 30s)
- [x] 12.4 Test full flow: join → intro → trạm 1 → confirm → timer → điểm → trạm tiếp → kết quả
- [x] 12.5 Test admin flow: tạo game → trạm → câu hỏi → start → monitor → end
- [x] 12.6 Test trạm private: admin cộng/trừ điểm → kiểm tra tổng điểm bảng XH
- [x] 12.7 Tạo README.md với hướng dẫn chạy local và cách demo

## 13. Cập nhật: chọn trạm tiếp theo rải đều (least-loaded)

- [x] 13.1 Sửa `pickNextStation` trong `lib/gameLogic.js`: lọc trạm public chưa đến & còn chỗ (`active < max_teams`), rồi random trong nhóm trạm có số đội active thấp nhất
- [x] 13.2 Thêm test kiểm chứng: tránh trạm đầy + ưu tiên trạm ít đội (least-loaded)

## 14. Bugfix: yêu cầu bắt đầu trạm không đồng bộ khi reload / admin vắng mặt

- [x] 14.1 Thêm cột `requested_at` và trạng thái `requested` vào `team_stations.status` trong `db/schema.sql`
- [x] 14.2 Sửa `socket/handlers.js` — `team:request_start`: upsert `team_stations` với `status='requested', requested_at=now()`; bỏ qua nếu đã có yêu cầu còn hiệu lực (< 60s) để chặn spam-click
- [x] 14.3 Sửa `admin:join_station` — sau khi join room, query DB các `team_stations` `status='requested'` chưa hết hạn tại trạm đó và emit snapshot riêng cho socket vừa join (hydrate lại danh sách chờ khi admin reload/vào trễ)
- [x] 14.4 Thêm sweep định kỳ (giống cơ chế timer hiện có) chuyển `requested` quá hạn 60s về lại `pending`, báo cho player được yêu cầu lại
- [x] 14.5 Cập nhật `GET /api/teams/:id/current-station` trả về đủ `status='requested'` + `requested_at` để player phục hồi đúng màn hình khi reload
- [x] 14.6 Sửa `public/player/game.html` — tách thông báo "Đang tìm trạm tiếp theo…" khỏi `#pendingState`, không ghi đè text mặc định "Đang chờ admin xác nhận bắt đầu…"
- [x] 14.7 Test lại 3 kịch bản: admin vắng mặt lúc request, admin reload, player reload, và request hết hạn 60s cho phép gửi lại
