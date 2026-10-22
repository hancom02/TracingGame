# player-join Specification

## Purpose
TBD - created by archiving change web-chay-tram. Update Purpose after archive.

## Requirements

### Requirement: Player tham gia game qua QR code
Hệ thống SHALL tạo 1 QR code chung cho toàn bộ game (link đến trang join). Player quét QR, chọn slot trống và đặt tên đội để tham gia.

#### Scenario: Player chọn slot trống và đặt tên đội
- **WHEN** player mở link QR, nhìn thấy danh sách slot (1 đến total_slots)
- **THEN** các slot đã có người hiển thị tên đội và bị khóa; slot trống có thể chọn
- **WHEN** player chọn slot trống và nhập tên đội rồi xác nhận
- **THEN** đội được tạo với slot đó, session token được lưu vào localStorage, player được redirect đến Welcome screen

#### Scenario: Slot đã đầy
- **WHEN** tất cả slot đã có người
- **THEN** trang join hiển thị thông báo "Tất cả đội đã tham gia đủ"

#### Scenario: Player quay lại sau khi đã join (session còn hạn)
- **WHEN** player mở lại link game với session token hợp lệ trong localStorage
- **THEN** player được redirect về đúng màn hình game hiện tại của đội mình

### Requirement: Tên đội không được trùng trong cùng 1 game
Hệ thống SHALL từ chối tên đội đã tồn tại trong game.

#### Scenario: Tên đội bị trùng
- **WHEN** player nhập tên đội đã được đội khác sử dụng trong game đó
- **THEN** hệ thống hiển thị lỗi "Tên đội đã tồn tại, vui lòng chọn tên khác"
