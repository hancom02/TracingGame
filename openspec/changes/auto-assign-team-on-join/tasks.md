## 1. Backend — API join

- [x] 1.1 Trong `routes/teams.js`, sửa `POST /api/teams/join`: bỏ đọc/validate `slot_number` từ `req.body`.
- [x] 1.2 Thêm hàm tìm slot trống nhỏ nhất cho 1 `game_id` (đọc danh sách `slot_number` đã dùng, lặp từ 1 đến `game.total_slots`, trả số nhỏ nhất chưa dùng).
- [x] 1.3 Nếu không còn slot trống → trả 409 với message "Tất cả đội đã tham gia đủ" (thay cho lỗi "Slot không hợp lệ"/"Slot này đã có đội khác chọn" cũ).
- [x] 1.4 Insert đội mới dùng slot tự tìm được ở bước 1.2, giữ nguyên logic kiểm tra tên đội trùng.
- [x] 1.5 Đảm bảo không có `await`/I-O bất đồng bộ nào chèn giữa lúc đọc slot trống và lúc insert (theo Decision 1 trong design.md).

## 2. Frontend — trang join

- [x] 2.1 Trong `public/player/join.html`, bỏ `<div id="slots">`, hàm `renderSlots()`, và biến `selectedSlot`.
- [x] 2.2 Bỏ điều kiện chặn submit khi chưa chọn slot (`if (!selectedSlot) ...`).
- [x] 2.3 Sửa `load()`: vẫn gọi `GET /api/games/:id/slots` để lấy `total_slots`/`taken` nhằm hiển thị thông báo hết chỗ, nhưng không render lưới; nếu `takenCount >= totalSlots` thì disable form nhập tên đội.
- [x] 2.4 Sửa handler `joinBtn`: gọi `POST /api/teams/join` chỉ với `{ game_id, name }` (không gửi `slot_number`).
- [x] 2.5 Cập nhật text hướng dẫn trên trang (bỏ "Chọn 1 ô trống và đặt tên đội của bạn" → chỉ còn "Đặt tên đội của bạn").

## 3. Kiểm thử

- [x] 3.1 Test join khi còn slot trống: đội mới được gán đúng slot trống nhỏ nhất.
- [x] 3.2 Test join khi 1 vài slot giữa đã trống (do xóa/reset) — xác nhận vẫn lấy đúng slot nhỏ nhất còn trống, không phải slot cuối.
- [x] 3.3 Test join khi hết slot: nhận lỗi/thông báo "Tất cả đội đã tham gia đủ", không tạo đội.
- [x] 3.4 Test tên đội trùng vẫn bị từ chối như cũ.
- [x] 3.5 Test trang join không còn hiển thị lưới slot, chỉ có form tên đội.
