## ADDED Requirements

### Requirement: Admin có thể tạo và quản lý game
Hệ thống SHALL cho phép admin tạo game với tên, banner URL và số đội tham gia. Admin SHALL có thể chỉnh sửa thông tin game khi game chưa bắt đầu.

#### Scenario: Tạo game mới
- **WHEN** admin điền tên game, banner URL, số đội và submit
- **THEN** game được tạo với status `waiting`, xuất hiện trong dashboard

#### Scenario: Không cho phép tạo game thiếu tên
- **WHEN** admin submit form tạo game không có tên
- **THEN** hệ thống hiển thị lỗi validation, không tạo game

### Requirement: Admin có thể start, end và reset game
Hệ thống SHALL cho phép admin thay đổi trạng thái game (waiting → active → ended → waiting).

#### Scenario: Start game
- **WHEN** admin nhấn "Bắt đầu game" và game đang ở trạng thái `waiting`
- **THEN** game chuyển sang `active`, tất cả player nhận được thông báo game bắt đầu

#### Scenario: End game
- **WHEN** admin nhấn "Kết thúc game"
- **THEN** game chuyển sang `ended`, tất cả player được redirect về màn hình kết quả cuối

#### Scenario: Reset game
- **WHEN** admin nhấn "Reset game" và xác nhận
- **THEN** tất cả team_stations bị xóa, tất cả đội về trạng thái `waiting`, game về `waiting`
