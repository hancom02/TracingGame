## Context

Project mới hoàn toàn: web platform quản lý trò chơi chạy trạm ngoài trời (station-based outdoor game). Mục đích là demo cho khách hàng trong 3 ngày. Scale nhỏ: tối đa 10 trạm, 20 đội, ~30 concurrent users. WiFi ổn định tại địa điểm tổ chức.

Stack: HTML + CSS + Vanilla JS (frontend) + Node.js + Express + Socket.io (backend) + SQLite via better-sqlite3 (database).

## Goals / Non-Goals

**Goals:**
- Web app chạy được trên mobile browser (player) và desktop/tablet (admin)
- Real-time sync giữa player ↔ admin ↔ server (timer, confirm start, score)
- Admin dashboard: tạo game, trạm, câu hỏi, điều phối chơi, theo dõi tiến độ
- Player flow: join qua QR → chơi trạm → xem kết quả cuối
- Hoàn thành trong 3 ngày để demo

**Non-Goals:**
- Production-grade security (không cần JWT, không cần HTTPS tự cấp)
- Offline support / PWA
- Multiple games chạy đồng thời (demo dùng 1 game)
- Admin phân quyền theo trạm (tất cả admin xem được toàn bộ)
- Push notification
- Media upload (banner/logo lưu là URL text)

## Decisions

### 1. SQLite thay vì PostgreSQL/MySQL
**Quyết định**: Dùng SQLite với `better-sqlite3`.  
**Lý do**: Demo không cần persistence phức tạp, zero-config, file-based dễ backup và reset. `better-sqlite3` synchronous API đơn giản hơn async drivers.  
**Thay thế đã xem xét**: PostgreSQL (overkill cho demo), lowdb/JSON file (không có SQL query).

### 2. Socket.io cho real-time
**Quyết định**: Socket.io thay vì SSE hoặc long polling.  
**Lý do**: Cần bi-directional communication (server → client cho timer, client → server cho confirm/score). Socket.io tự handle reconnect, fallback. Với WiFi ổn định, WebSocket luôn available.  
**Thay thế đã xem xét**: SSE (chỉ server→client, không đủ), polling mỗi 1s (wasteful, timer lag).

### 3. Vanilla JS thay vì React/Vue
**Quyết định**: Không dùng frontend framework.  
**Lý do**: 3 ngày, số màn hình ít (9 admin + 6 player), không cần state management phức tạp. Vanilla JS + fetch API + Socket.io client đủ dùng.  
**Thay thế đã xem xét**: Vue (nhanh hơn React nhưng vẫn cần setup), htmx (thú vị nhưng không quen thuộc).

### 4. Session-based auth đơn giản
**Quyết định**: `express-session` + bcrypt cho admin. Player dùng UUID token lưu localStorage.  
**Lý do**: Demo, không cần JWT/refresh token cycle. Session store in-memory (MemoryStore) đủ cho 3 ngày demo.  
**Thay thế đã xem xét**: JWT (overkill), no auth (không an toàn ngay cả demo).

### 5. Server-side timer (authoritative)
**Quyết định**: Timer chạy trên server, broadcast tick mỗi giây qua Socket.io. Client chỉ hiển thị.  
**Lý do**: Tránh drift giữa các thiết bị. Player không thể gian lận timer. Admin thấy đúng thời gian còn lại.  
**Thay thế đã xem xét**: Client-side timer (drift, không đồng bộ), NTP sync (phức tạp không cần thiết).

### 6. Data model — team_stations là trung tâm
**Quyết định**: Bảng `team_stations` ghi nhận mọi trạng thái (pending/active/completed) + điểm + thời gian cho mỗi cặp (team, station).  
**Lý do**: Dễ query cho cả 2 màn hình monitoring (theo trạm và theo đội). Tổng điểm = SUM(score) từ team_stations.

### 7. Socket.io Rooms
**Quyết định**: Dùng room pattern:
- `game:{game_id}` — tất cả player và admin của 1 game
- `station:{station_id}` — admin trực trạm và các đội đang ở trạm đó
- `team:{team_id}` — chỉ đội đó (nhận timer tick riêng)

### 8. Thuật toán chọn trạm tiếp theo — rải đều (least-loaded random)
**Quyết định**: Khi chọn trạm tiếp theo cho 1 đội: lọc các trạm public đội **chưa đến** và **còn chỗ** (`active < max_teams`), rồi chọn ngẫu nhiên trong nhóm trạm có **số đội active thấp nhất** (least-loaded), thay vì random đều trên toàn bộ ứng viên.
**Lý do**: (1) Không vượt `max_teams` — tránh dồn ứ tại một trạm; (2) Rải đều các đội ra nhiều trạm, giảm thời gian chờ tổng thể và cho trải nghiệm mượt hơn. Vẫn giữ yếu tố ngẫu nhiên khi nhiều trạm cùng mức tải để tránh các đội đi trùng lộ trình.
**Thay thế đã xem xét**: Random đều toàn bộ ứng viên (đơn giản nhưng dễ dồn cụm khi nhiều đội hoàn thành cùng lúc); round-robin cố định theo `display_order` (đoán trước được, kém thú vị, dễ tắc nghẽn theo thứ tự).

### 9. Persist trạng thái `requested` thay vì chỉ emit socket tức thời
**Quyết định**: Khi player bấm "Bắt đầu", server ghi `team_stations.status='requested'` + `requested_at` vào DB (upsert), rồi mới broadcast `admin:start_requested`. Khi admin `admin:join_station` (join room lần đầu hoặc sau reload), server query lại các row `status='requested'` chưa hết hạn tại trạm đó và gửi snapshot hydrate riêng cho socket đó. Yêu cầu tự hết hạn sau 60 giây (sweep định kỳ, cùng cơ chế `setInterval` đang dùng cho timer) nếu admin chưa xác nhận, trả `team_stations` về lại `pending` để player được yêu cầu lại.
**Lý do**: Bản chất Socket.io room broadcast là fire-and-forget — nếu không có socket nào đang trong room `station:{id}` tại đúng thời điểm emit (admin chưa mở đúng trang, hoặc vừa reload mất state client-side), sự kiện `admin:start_requested` biến mất vĩnh viễn và không có cách nào phục hồi vì trước đây không có gì được ghi xuống DB. Tương tự phía player: reload mất luôn trạng thái "đang chờ xác nhận" vì UI đó chỉ là optimistic front-end, không có gì để đọc lại từ server. Thêm cột bền `requested`/`requested_at` giải quyết cả 2 chiều, đồng thời tạo cơ sở tự nhiên cho quy tắc "yêu cầu hết hạn sau 1 phút thì được gửi lại" (tránh vừa mất yêu cầu vừa kẹt vĩnh viễn không request lại được).
**Thay thế đã xem xét**: Giữ nguyên in-memory Map trên server (không qua DB) — đơn giản hơn nhưng không sống sót qua restart và không tận dụng được cơ chế query monitor sẵn có của `team_stations`; dùng `socket.io-adapter` để buffer event — phức tạp không cần thiết cho scale nhỏ của demo.

## Database Schema

```sql
-- Admin accounts
admins (id, username, password_hash, role, created_at)

-- Game
games (id, name, banner_url, total_slots, status, created_at, updated_at)
-- status: 'waiting' | 'active' | 'ended'

-- Stations belong to a game
stations (
  id, game_id, name, description,
  map_link, map_text, hint,
  duration_seconds, max_teams, unit,
  is_private,                          -- 0=public, 1=private
  challenge_type,                      -- 'mcq' | 'physical' | 'none'
  question_id,                         -- FK → question_bank (nullable)
  display_order, created_at
)

-- Question bank per game
question_bank (
  id, game_id, question_text,
  option_a, option_b, option_c, option_d,
  correct_answer,                      -- 'a' | 'b' | 'c' | 'd'
  created_at
)

-- Teams (join slots)
teams (
  id, game_id, name, slot_number,
  session_token,                       -- UUID, stored in localStorage
  status,                              -- 'waiting' | 'playing' | 'finished'
  current_station_id,                  -- FK → stations (nullable)
  created_at
)

-- Per-team per-station record
team_stations (
  id, team_id, station_id,
  status,                              -- 'pending' | 'requested' | 'active' | 'timeup' | 'completed'
  requested_at,                        -- timestamp lúc player bấm "Bắt đầu" (chờ admin xác nhận), hết hạn sau 60s
  started_at, completed_at,
  score,                               -- điểm (có thể âm với trạm private)
  visit_order,                         -- trạm thứ mấy đội này đến
  score_updated_by                     -- 'team' | 'admin'
)
```

## Socket.io Event Map

```
CLIENT → SERVER:
  team:request_start    { team_id, station_id }
  team:submit_score     { team_id, station_id, score }
  team:answer_question  { team_id, station_id, answer }  → MCQ only

SERVER → CLIENT:
  start:confirmed       { team_id, station_id, duration }  → bắt đầu timer
  timer:tick            { team_id, station_id, remaining } → mỗi giây
  timer:expired         { team_id, station_id }
  score:accepted        { team_id, station_id, score }
  next:station          { team_id, station_id, station_data }
  game:ended            { game_id }

ADMIN → SERVER:
  admin:confirm_start   { team_id, station_id }
  admin:override_score  { team_id, station_id, score }
  admin:end_game        { game_id }
  admin:reset_game      { game_id }

SERVER → ADMIN:
  station:update        { station_id, teams[] }           → cập nhật monitor
  team:update           { team_id, stations[] }           → cập nhật monitor
  team:score_submitted  { team_id, station_id, score }    → cần confirm
  admin:pending_requests_snapshot
                         { station_id, requests[] }        → hydrate lại danh sách chờ khi admin vừa join/reload

SERVER → CLIENT (bugfix — bổ sung):
  start:request_expired { team_id, station_id }            → yêu cầu quá 60s chưa được confirm, cho phép bấm lại
```

## Project Structure

```
htrace2/
├── package.json
├── server.js                 # Entry point
├── db/
│   ├── schema.sql            # DDL
│   ├── seed.js               # Admin account seed
│   └── database.js           # DB connection + helpers
├── routes/
│   ├── auth.js               # Admin login/logout
│   ├── games.js              # CRUD game
│   ├── stations.js           # CRUD stations
│   ├── questions.js          # CRUD question bank
│   ├── teams.js              # Join game, team state
│   └── results.js            # Scores, leaderboard
├── socket/
│   └── handlers.js           # All Socket.io events
├── middleware/
│   └── auth.js               # isAdmin middleware
└── public/
    ├── css/
    │   └── style.css
    ├── js/
    │   └── socket-client.js  # Shared socket setup
    ├── admin/
    │   ├── login.html
    │   ├── dashboard.html
    │   ├── game-setup.html
    │   ├── station-setup.html
    │   ├── questions.html
    │   ├── game-control.html
    │   ├── monitor-station.html
    │   └── monitor-team.html
    └── player/
        ├── join.html
        ├── welcome.html
        ├── question.html
        ├── game.html
        └── result.html
```

## Risks / Trade-offs

- **MemoryStore session**: Nếu server restart → tất cả session mất, admin phải login lại, player phải join lại. **Mitigation**: Tránh restart trong khi demo đang diễn ra. Có thể dùng `better-sqlite3-session-store` nếu cần.
- **SQLite concurrent writes**: Với nhiều đội submit cùng lúc, SQLite serializes writes — có thể lag nhẹ. **Mitigation**: Scale nhỏ (20 đội), `better-sqlite3` sync rất nhanh, chấp nhận được.
- **Flutter Web alternative bị bác bỏ**: Vanilla JS cần nhiều boilerplate hơn nhưng không cần học framework mới. **Mitigation**: Tận dụng template HTML reuse, CSS component.
- **Timer drift nhỏ**: Dù server-authoritative, client display có thể lag 1 giây do network. **Mitigation**: Acceptable cho demo game outdoor.
