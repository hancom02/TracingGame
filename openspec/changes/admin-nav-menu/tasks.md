## 1. `admin-common.js` — mở rộng renderTopbar

- [x] 1.1 Thêm hằng `GAME_NAV_ITEMS` trong `public/js/admin-common.js`: mảng các mục `{ key, href, label }` gồm `setup` → `game-setup.html` (param `id`), `stations` → `station-setup.html`, `questions` → `questions.html`, `control` → `game-control.html`, `monitor-station` → `monitor-station.html`, `monitor-team` → `monitor-team.html` (4 mục sau dùng param `game_id`).
- [x] 1.2 Sửa chữ ký `renderTopbar(title, activeNav, gameId)`: khi có `gameId`, render thêm 1 dòng `<div class="nav game-nav">` bên dưới dòng tiêu đề, lặp `GAME_NAV_ITEMS` sinh: mục có `key === activeNav` → `<span class="btn btn-sm active">label</span>`; các mục khác → `<a class="btn btn-sm btn-ghost" href="<page>?<param>=<gameId>">label</a>`.
- [x] 1.3 Khi không có `gameId` (ví dụ `dashboard.html` gọi `renderTopbar('Dashboard')` không tham số 3), không render `.game-nav` — giữ nguyên hành vi cũ.

## 2. CSS cho mục active

- [x] 2.1 Trong `public/css/style.css`, thêm style `.game-nav` (dùng lại `.nav` hiện có: flex, gap, wrap) và `.btn.active` (ví dụ nền `var(--primary)` nhạt hơn hoặc viền nổi bật, `cursor: default`) để phân biệt mục đang active với các link khác.

## 3. Gắn menu vào từng trang quản lý game

- [x] 3.1 `public/admin/game-setup.html`: sửa lời gọi thành `renderTopbar('Thiết lập Game', 'setup', <id lấy từ query>)`.
- [x] 3.2 `public/admin/station-setup.html`: sửa thành `renderTopbar('Trạm', 'stations', <game_id>)`.
- [x] 3.3 `public/admin/questions.html`: sửa thành `renderTopbar('Câu hỏi', 'questions', <game_id>)`.
- [x] 3.4 `public/admin/game-control.html`: sửa thành `renderTopbar('Điều khiển Game', 'control', <game_id>)`.
- [x] 3.5 `public/admin/monitor-station.html`: sửa thành `renderTopbar('Monitor Trạm', 'monitor-station', <game_id>)`.
- [x] 3.6 `public/admin/monitor-team.html`: sửa thành `renderTopbar('Monitor Đội', 'monitor-team', <game_id>)`.
- [x] 3.7 Xác nhận `dashboard.html`, `login.html`, `station-view.html` không truyền `gameId` (không đổi lời gọi hiện có).

## 4. Kiểm thử thủ công

- [x] 4.1 Từ Dashboard, vào trang Câu hỏi của 1 game, bấm lần lượt từng mục menu (Trạm, Điều khiển, Monitor trạm, Monitor đội, Sửa game) — xác nhận mỗi lần chuyển đúng sang trang đích và giữ đúng game (không bị lệch sang game khác).
- [x] 4.2 Trên mỗi trang, xác nhận mục tương ứng với trang hiện tại hiển thị active và không phải link (bấm không điều hướng).
- [x] 4.3 Mở Dashboard, xác nhận không có menu game nào hiển thị.
- [x] 4.4 Mở trang Trực trạm (`station-view.html`) bằng link trạm thật, xác nhận không có menu game nào hiển thị.
- [x] 4.5 Kiểm tra trên màn hình hẹp (mobile width) menu wrap xuống dòng hợp lý, không tràn ngang.
