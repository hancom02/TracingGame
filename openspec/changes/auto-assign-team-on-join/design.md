## Context

Hiện tại `POST /api/teams/join` (`routes/teams.js:28-47`) nhận `slot_number` do client tự chọn từ UI lưới slot (`public/player/join.html`). Server chỉ validate slot đó có nằm trong khoảng hợp lệ và chưa bị chiếm, không tự chọn slot.

DB dùng `node:sqlite` (`DatabaseSync`) — mọi lệnh `db.prepare().get/all/run()` đều đồng bộ (blocking) và chạy trên cùng 1 thread Node.js. Do đó trong phạm vi 1 process, không có 2 request Express nào có thể đan xen thực thi giữa lúc đọc slot trống và lúc insert, miễn là không có `await` nào chèn giữa 2 bước đó trong cùng route handler.

## Goals / Non-Goals

**Goals:**
- Player không còn thấy/chọn slot khi join; chỉ nhập tên đội.
- Server tự động gán slot trống nhỏ nhất còn lại cho đội mới.
- Đảm bảo không có 2 đội bị gán cùng 1 slot dù nhiều request join tới gần như đồng thời.

**Non-Goals:**
- Không đổi schema DB (`teams.slot_number`, `UNIQUE(game_id, slot_number)` giữ nguyên).
- Không đổi cơ chế đặt tên đội / kiểm tra trùng tên.
- Không xử lý trường hợp chạy nhiều process/worker song song (ngoài phạm vi, app hiện chạy single-process).

## Decisions

**1. Tìm slot trống nhỏ nhất bằng 1 câu SQL, ngay trong cùng route handler đồng bộ, không `await` giữa lúc đọc và insert.**
Vì `node:sqlite` là đồng bộ và Node chạy single-threaded, việc đọc "slot nhỏ nhất chưa dùng" rồi insert ngay trong cùng 1 lệnh gọi hàm (không có `await`/I-O bất đồng bộ ở giữa) là an toàn, tương đương 1 transaction ngầm. Không cần transaction thủ công.

Truy vấn gợi ý: lấy danh sách `slot_number` đã dùng, lặp từ 1 đến `total_slots` để tìm số nhỏ nhất chưa có trong danh sách. Nếu không còn slot trống → trả lỗi 409 "Tất cả đội đã tham gia đủ".

**2. Vẫn giữ UNIQUE constraint `(game_id, slot_number)` làm lớp bảo vệ cuối.**
Nếu vì lý do nào đó insert bị đụng constraint (ví dụ code thay đổi sau này làm mất tính đồng bộ), server trả lỗi 409 rõ ràng thay vì crash — không cần retry loop vì đây là safety net, không phải đường xử lý chính.

**3. Bỏ tham số `slot_number` khỏi request body của `POST /api/teams/join`.**
Nếu client (đã update hoặc client cũ) vẫn gửi `slot_number`, server bỏ qua giá trị đó, không dùng để chọn slot — tránh việc client cũ giả định vẫn chọn được slot.

**4. `GET /api/games/:id/slots` giữ nguyên response (total_slots, taken, game_status, game_name).**
Trang join mới không cần hiển thị lưới slot, nhưng vẫn cần biết "đã đủ đội chưa" để hiển thị thông báo hết chỗ trước khi player nhập tên. Giữ endpoint này để tái dùng, chỉ đổi cách frontend dùng dữ liệu (không render lưới, chỉ check `takenCount >= total_slots`).

**5. Frontend: bỏ `renderSlots()` và toàn bộ UI lưới slot trong `join.html`, chỉ giữ form tên đội.**
Giảm số bước player phải làm; slot được gán tự động, phản hồi lại cho player qua kết quả `POST /api/teams/join` (team.slot_number) nếu cần hiển thị sau đó (ví dụ ở welcome screen), không cần hiển thị ở bước join.

## Risks / Trade-offs

- [Risk] Nếu trong tương lai app scale ra nhiều process/worker (cluster mode) hoặc đổi sang DB client bất đồng bộ, giả định "đồng bộ = an toàn" ở Decision 1 sẽ không còn đúng → race condition có thể xảy ra thật. → Mitigation: UNIQUE constraint ở Decision 2 vẫn chặn được việc 2 đội trùng slot ở tầng DB; khi đó cần thêm retry-on-conflict thay vì chỉ trả lỗi.
- [Risk] Client cũ (chưa cập nhật UI) vẫn gửi `slot_number` mong đợi server tôn trọng lựa chọn đó → hành vi thay đổi ngầm (server tự chọn khác). → Mitigation: đây là thay đổi có chủ đích (**BREAKING** đã ghi trong proposal), không cần tương thích ngược vì cả FE và BE đổi cùng lúc trong 1 change.
