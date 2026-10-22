## Why

Hiện tại khi join game, player phải tự chọn 1 slot trống trong danh sách rồi mới đặt tên đội (`join.html` hiển thị lưới slot). Việc cho player tự chọn thứ tự/slot gây rối vì slot không có ý nghĩa với player, dễ tạo thắc mắc "vì sao chọn được slot này mà không phải slot khác", và làm chậm quá trình vào game. Cần đơn giản hóa: hệ thống tự gán slot trống nhỏ nhất cho player, player chỉ cần đặt tên đội và tham gia.

## What Changes

- **BREAKING**: Bỏ bước player chọn slot trống trên trang join. Player không còn thấy/chọn số slot.
- Khi player submit tên đội, hệ thống tự tìm slot trống nhỏ nhất (slot_number nhỏ nhất chưa được dùng trong game) và gán cho đội mới, thay vì nhận `slot_number` từ client.
- API `POST /api/teams/join` không còn nhận `slot_number` từ request; server tự xác định slot trống nhỏ nhất trong transaction để tránh race condition khi nhiều player join cùng lúc.
- Trang `join.html` bỏ UI lưới chọn slot; chỉ giữ form nhập tên đội. Vẫn hiển thị thông báo "Tất cả đội đã tham gia đủ" khi hết slot.
- Giữ nguyên yêu cầu tên đội không trùng trong cùng 1 game.
- Giữ nguyên endpoint `GET /api/games/:id/slots` cho mục đích hiển thị số đội đã tham gia/còn trống (không dùng để chọn slot), hoặc điều chỉnh response nếu không còn cần trả danh sách slot chi tiết.

## Capabilities

### Modified Capabilities
- `player-join`: Requirement "Player tham gia game qua QR code" thay đổi từ "player chọn slot trống và đặt tên đội" thành "hệ thống tự gán slot trống nhỏ nhất, player chỉ đặt tên đội".

## Impact

- Backend: `routes/teams.js` (`POST /api/teams/join` — bỏ nhận `slot_number` từ client, thêm logic tìm slot trống nhỏ nhất; `GET /api/games/:id/slots` — xem lại có còn cần thiết).
- Frontend: `public/player/join.html` (bỏ `renderSlots()` và UI chọn slot, chỉ giữ form tên đội).
- DB: không đổi schema (`teams.slot_number` vẫn dùng, chỉ đổi nguồn giá trị từ client-chọn sang server-tự-gán).
- Cần xử lý race condition khi nhiều player join đồng thời và tranh nhau slot trống nhỏ nhất.
