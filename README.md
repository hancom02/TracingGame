# 🏁 htrace2 — Web trò chơi chạy trạm ngoài trời

Web platform quản lý trò chơi **chạy trạm** (station-based outdoor game): nhiều đội di chuyển giữa các trạm thực địa, có đồng hồ đếm ngược server-side và chấm điểm real-time. Xây cho mục đích **demo** (scale nhỏ: ~10 trạm, 20 đội, ~30 người chơi đồng thời).

## Stack

- **Backend**: Node.js + Express + Socket.io
- **Database**: SQLite qua module built-in `node:sqlite` (Node ≥ 22.5 — *không cần biên dịch native*)
- **Frontend**: HTML + CSS + Vanilla JS (không framework)
- **Auth**: `express-session` + `bcryptjs` (admin), session token UUID (player)

> **Lưu ý:** Thiết kế ban đầu dùng `better-sqlite3`, nhưng môi trường không có trình biên dịch C++. Đã chuyển sang `node:sqlite` (API tương thích: `prepare().get/all/run`, `exec`). Yêu cầu **Node ≥ 22.5** (đã test trên Node 24).

## Yêu cầu

- Node.js **≥ 22.5** (khuyến nghị 24+)
- npm

## Chạy local

```bash
# 1. Cài dependencies
npm install

# 2. Tạo tài khoản admin mặc định (admin / admin123)
npm run seed

# 3. Khởi động server
npm start
# → http://localhost:3000
```

Biến môi trường (tuỳ chọn):

| Biến | Mặc định | Ý nghĩa |
|------|----------|---------|
| `PORT` | `3000` | Cổng HTTP |
| `DB_PATH` | `db/htrace2.db` | Đường dẫn file SQLite |
| `SESSION_SECRET` | `htrace2-demo-secret` | Secret cho session |
| `ADMIN_USER` / `ADMIN_PASS` | `admin` / `admin123` | Tài khoản admin khi seed |

## Kịch bản demo

### A. Admin thiết lập (desktop/tablet)

1. Mở `http://localhost:3000/admin/login.html` → đăng nhập `admin / admin123`.
2. **Tạo game mới**: đặt tên, số đội (slots).
3. Vào **Câu hỏi** → tạo vài câu trắc nghiệm (dùng cho câu hỏi mở khoá & trạm MCQ).
4. Vào **Trạm** → tạo các trạm:
   - `public` (mặc định): player được random dẫn tới; đặt thời gian, số đội tối đa, loại thử thách (MCQ / thể lực / không).
   - `private` (🔒): ẩn với player, admin dùng để cộng/trừ điểm thủ công.
5. Vào **Điều khiển** → bấm **Bắt đầu game**. Lấy **QR** để player quét.

### B. Player chơi (mobile)

1. Quét QR (hoặc mở link join) → chọn **ô trống**, đặt **tên đội** → tham gia.
2. Trả lời **câu hỏi mở khoá** → nhận **trạm đầu tiên**.
3. Tới trạm thực địa → bấm **Bắt đầu** → chờ admin **xác nhận**.
4. Admin xác nhận → **timer đếm ngược** chạy; player làm thử thách và **nhập điểm trong giờ**.
5. Hết giờ → chỉ admin nhập/override điểm được. Bấm **Trạm tiếp theo**.
6. Hết trạm public → màn hình **kết quả**: điểm từng trạm + tổng + **bảng xếp hạng**.

### C. Admin điều phối & theo dõi

- **Trực trạm** (`station-view`): thấy đội yêu cầu bắt đầu → xác nhận; nhập/override điểm; với trạm private thì cộng/trừ điểm cho bất kỳ đội nào (điểm có thể âm).
- **Monitor theo Trạm**: grid mỗi trạm + trạng thái/điểm từng đội, cập nhật real-time.
- **Monitor theo Đội**: timeline trạm mỗi đội theo thời gian + tổng điểm.
- **Kết thúc game**: tất cả player được đưa về màn hình kết quả.
- **Reset game**: xoá tiến độ & điểm, đưa các đội về trạng thái chờ (giữ tên đội & slot).

## Kiểm thử

Test tích hợp end-to-end (admin flow, player flow, chấm điểm trạm private) qua HTTP + Socket.io:

```bash
# Terminal 1: chạy server ở cổng test
PORT=3555 npm start

# Terminal 2: chạy test
BASE=http://localhost:3555 npm test
```

Test bao phủ: đăng nhập, CRUD game/câu hỏi/trạm, QR, join (chặn trùng tên/slot), câu hỏi mở khoá (đúng/sai), request start → admin confirm → timer tick → nộp điểm → hết giờ (từ chối nộp) → trạm tiếp → hoàn thành, cộng/trừ điểm trạm private, bảng xếp hạng.

## Cấu trúc thư mục

```
htrace2/
├── server.js              # Entry: Express + Socket.io + session + static
├── db/
│   ├── schema.sql         # DDL toàn bộ bảng
│   ├── database.js        # Kết nối node:sqlite + chạy schema
│   └── seed.js            # Seed admin mặc định
├── lib/
│   └── gameLogic.js       # Logic dùng chung (random trạm, tổng điểm, câu hỏi…)
├── routes/
│   ├── auth.js            # Login/logout admin
│   ├── games.js           # CRUD game + QR + start/end/reset
│   ├── stations.js        # CRUD trạm
│   ├── questions.js       # CRUD ngân hàng câu hỏi
│   ├── teams.js           # Join, trạng thái đội, câu hỏi intro, trạm hiện tại
│   └── results.js         # Leaderboard, kết quả đội, monitoring
├── socket/
│   └── handlers.js        # Tất cả sự kiện real-time (timer, confirm, score…)
├── middleware/
│   └── auth.js            # isAdmin
├── public/
│   ├── css/style.css      # Design system (mobile-first)
│   ├── js/                # admin-common.js, player-common.js
│   ├── admin/             # login, dashboard, game/station/questions setup, control, station-view, monitors
│   └── player/            # join, welcome, question, game, result
└── scripts/
    └── test-flow.js       # Integration test
```

## Mô hình dữ liệu (tóm tắt)

- `games` → `stations`, `question_bank`, `teams`
- `team_stations`: **trung tâm** — mỗi cặp (đội, trạm) 1 bản ghi: trạng thái (`pending`/`active`/`timeup`/`completed`), điểm, thời gian, `visit_order`, nguồn điểm (`team`/`admin`).
- **Tổng điểm đội** = `SUM(team_stations.score)` (gồm cả trạm private, có thể âm).

## Sự kiện Socket.io chính

| Chiều | Sự kiện | Ý nghĩa |
|------|---------|---------|
| player→server | `team:request_start` | Xin bắt đầu trạm |
| admin→server | `admin:confirm_start` | Xác nhận → chạy timer server-side |
| server→player | `timer:tick` / `timer:expired` | Đồng hồ đếm ngược |
| player→server | `team:submit_score` | Nộp điểm (chỉ khi còn giờ) |
| admin→server | `admin:override_score` | Nhập/override (kể cả trạm private) |
| player→server | `team:request_next` | Sang trạm tiếp / kết thúc |
| server→player | `next:station` / `player:finished` | Trạm mới / đã xong hết |
| admin→server | `admin:end_game` / `admin:reset_game` | Kết thúc / reset |

## Giới hạn đã biết (demo)

- Session lưu in-memory: **restart server → mất session** (admin login lại, player join lại). Tránh restart giữa buổi demo.
- Timer server-side sống trong RAM: restart → timer đang chạy mất.
- Thời gian trạm tối thiểu **10 giây** (ràng buộc trong `routes/stations.js`).
- Thiết kế cho **1 game** chạy tại một thời điểm khi demo (hệ thống vẫn lưu nhiều game).
