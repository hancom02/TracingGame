## Context

Các trang quản lý của một game (`game-setup.html`, `station-setup.html`, `questions.html`, `game-control.html`, `monitor-station.html`, `monitor-team.html`) đều nhận `game_id`/`id` qua query string và đều gọi `renderTopbar(title)` (định nghĩa trong `public/js/admin-common.js`) để dựng phần đầu trang. Hiện `renderTopbar` chỉ render tiêu đề, nút "← Dashboard" và nút "Đăng xuất" — không có liên kết nào giữa các trang con của cùng một game.

## Goals / Non-Goals

**Goals:**
- Cho phép admin chuyển giữa 6 trang quản lý của cùng một game bằng 1 cú click, từ bất kỳ trang nào trong số đó.
- Đánh dấu rõ đang ở trang nào trong menu.
- Thay đổi tập trung ở `admin-common.js` + lời gọi `renderTopbar()` ở từng trang, không đổi logic nghiệp vụ/API.

**Non-Goals:**
- Không làm menu cho `dashboard.html` (danh sách nhiều game, không có 1 `game_id` cụ thể) hay `login.html`.
- Không đổi menu/luồng cho `station-view.html` (trang trực trạm dùng cho tình nguyện viên tại trạm, không phải luồng quản trị game).
- Không responsive/mobile hamburger — chỉ cần thanh nav ngang đơn giản, dùng lại style hiện có trong `style.css`.

## Decisions

1. **Mở rộng chữ ký `renderTopbar(title, activeNav, gameId)`** thay vì tạo hàm mới `renderGameNav()` riêng, để mọi trang chỉ sửa 1 dòng gọi hàm đã có, giảm rủi ro quên gắn nav ở trang nào đó.
   - Alternative đã cân nhắc: hàm `renderGameNav(gameId, activeNav)` tách riêng, gọi thêm bên cạnh `renderTopbar`. Bị loại vì mỗi trang phải sửa 2 chỗ (thêm gọi hàm + thêm container), dễ bỏ sót.
2. **Danh sách menu cứng (hardcode) trong `admin-common.js`**: `[['game-setup.html','Sửa game'], ['station-setup.html','Trạm'], ['questions.html','Câu hỏi'], ['game-control.html','Điều khiển'], ['monitor-station.html','Monitor trạm'], ['monitor-team.html','Monitor đội']]`, mỗi mục build link dạng `<page>?game_id=<gameId>` (riêng `game-setup.html` dùng query param `id` theo đúng quy ước hiện có của trang đó).
   - Alternative: lấy danh sách trang từ server/config. Không cần thiết vì tập trang quản lý cố định, ít thay đổi.
3. **`activeNav` là key chuỗi** (ví dụ `'stations'`, `'questions'`, `'control'`, `'monitor-station'`, `'monitor-team'`, `'setup'`) được truyền từ mỗi trang khi gọi `renderTopbar`; mục có key trùng `activeNav` được render là `<span>` không phải `<a>` (không tự link tới trang hiện tại) và thêm class `active`.
4. **Không hiển thị sub-nav khi thiếu `gameId`**: nếu trang gọi `renderTopbar(title)` không truyền `gameId` (như `dashboard.html`), hàm giữ nguyên hành vi cũ, không render thêm gì — đảm bảo tương thích ngược, không phải sửa các trang không liên quan.

## Risks / Trade-offs

- [Trùng `game_id` vs `id` query param giữa các trang] → `game-setup.html` đang dùng `id`, các trang còn lại dùng `game_id`; hàm build link trong `admin-common.js` phải map đúng tên param theo từng trang đích (khai báo cứng trong danh sách menu), tránh sinh link sai gây lỗi load trang đích.
- [Quên cập nhật `activeNav` đúng key ở 1 trang khi thêm lời gọi mới] → liệt kê rõ danh sách key hợp lệ trong comment tại `admin-common.js`; tasks.md sẽ yêu cầu kiểm thử qua từng trang để xác nhận đúng mục active.
