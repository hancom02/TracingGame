## MODIFIED Requirements

### Requirement: Player tham gia game qua QR code
Hệ thống SHALL tạo 1 QR code chung cho toàn bộ game (link đến trang join). Player quét QR, đặt tên đội và xác nhận để tham gia; hệ thống SHALL tự động gán slot trống có số nhỏ nhất cho đội mới, player KHÔNG được chọn slot hoặc thứ tự vào đội.

#### Scenario: Player đặt tên đội và được tự động gán slot
- **WHEN** player mở link QR và nhập tên đội rồi xác nhận
- **THEN** hệ thống tìm slot trống có số nhỏ nhất trong game (từ 1 đến total_slots), tạo đội mới với slot đó, session token được lưu vào localStorage, player được redirect đến Welcome screen

#### Scenario: Slot đã đầy
- **WHEN** tất cả slot đã có người
- **THEN** trang join hiển thị thông báo "Tất cả đội đã tham gia đủ" và không cho nhập tên đội để tham gia

#### Scenario: Player quay lại sau khi đã join (session còn hạn)
- **WHEN** player mở lại link game với session token hợp lệ trong localStorage
- **THEN** player được redirect về đúng màn hình game hiện tại của đội mình
