## Why

Các trang admin của một game (Sửa game, Trạm, Câu hỏi, Điều khiển, Monitor trạm, Monitor đội) chỉ liên kết được với nhau từ Dashboard: mỗi trang con chỉ có nút "← Dashboard" để quay lại danh sách game, rồi phải bấm lại đúng nút tương ứng để sang trang khác của cùng 1 game. Khi đang quản lý một game cụ thể (ví dụ đang xem Câu hỏi và cần sang Trạm), admin phải quay lại Dashboard rồi tìm lại đúng game — mất thao tác và dễ nhầm game khi có nhiều game. Cần một menu điều hướng hiển thị các trang của game hiện tại ngay trên mọi trang con, giúp chuyển qua lại nhanh.

## What Changes

- Thêm một thanh menu điều hướng theo ngữ cảnh game (game-scoped sub-nav) hiển thị trên các trang: Sửa game (`game-setup.html`), Trạm (`station-setup.html`), Câu hỏi (`questions.html`), Điều khiển (`game-control.html`), Monitor trạm (`monitor-station.html`), Monitor đội (`monitor-team.html`).
- Menu liệt kê các mục: Sửa game, Trạm, Câu hỏi, Điều khiển, Monitor trạm, Monitor đội — mỗi mục là link kèm `game_id`/`id` của game đang thao tác, để chuyển thẳng sang trang đó mà không cần quay lại Dashboard.
- Mục tương ứng với trang hiện tại được đánh dấu active (không tự link tới chính nó, hoặc disable).
- `renderTopbar()` trong `admin-common.js` được mở rộng để nhận thêm `gameId` và render menu này bên dưới/trong topbar khi có `gameId`; trang `dashboard.html` (không gắn với 1 game cụ thể) và `login.html`, `station-view.html` (trực trạm, không phải trang quản lý game) không hiển thị menu này.
- Giữ nguyên nút "← Dashboard" và "Đăng xuất" hiện có.

## Capabilities

### New Capabilities
- `admin-navigation`: Menu điều hướng giữa các trang quản lý của cùng một game, hiển thị nhất quán trên các trang con và cho biết đang ở trang nào.

## Impact

- `public/js/admin-common.js`: mở rộng `renderTopbar(title, activeNav, gameId)` để render thêm sub-nav khi có `gameId`.
- `public/admin/game-setup.html`, `station-setup.html`, `questions.html`, `game-control.html`, `monitor-station.html`, `monitor-team.html`: cập nhật lời gọi `renderTopbar()` để truyền `gameId` và tên mục active.
- `public/admin/dashboard.html`, `public/admin/login.html`, `public/admin/station-view.html`: không thay đổi hành vi (không có sub-nav game).
- Không đổi API backend, không đổi schema DB.
