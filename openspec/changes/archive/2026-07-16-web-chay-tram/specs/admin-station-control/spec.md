## ADDED Requirements

### Requirement: Admin xem danh sách đội đang chờ bắt đầu tại trạm
Hệ thống SHALL hiển thị cho admin danh sách các đội đã nhấn "Bắt đầu" và đang chờ xác nhận tại từng trạm.

#### Scenario: Đội yêu cầu bắt đầu
- **WHEN** player nhấn "Bắt đầu" tại trạm
- **THEN** màn hình admin trực trạm hiển thị thông báo và tên đội yêu cầu bắt đầu

#### Scenario: Admin vào trang trực trạm sau khi đội đã yêu cầu
- **WHEN** admin mở hoặc reload màn hình trực trạm sau khi 1 hoặc nhiều đội đã nhấn "Bắt đầu" (yêu cầu còn hiệu lực trong 1 phút, chưa được xác nhận)
- **THEN** hệ thống hiển thị đầy đủ các đội đang chờ xác nhận, kể cả những yêu cầu gửi đến trước khi admin có mặt trên trang

### Requirement: Admin xác nhận bắt đầu cho đội
Hệ thống SHALL cho phép admin nhấn "Xác nhận" để kích hoạt timer cho đội tại trạm.

#### Scenario: Admin confirm → timer chạy
- **WHEN** admin nhấn "Xác nhận bắt đầu" cho 1 đội cụ thể
- **THEN** server bắt đầu timer cho đội đó, broadcast tick qua Socket.io về màn hình player của đội; màn hình admin cập nhật trạng thái đội sang "Đang chơi"

### Requirement: Admin nhập và override điểm sau khi hết giờ
Hệ thống SHALL cho phép admin nhập điểm cho đội tại trạm bất kỳ lúc nào, kể cả override điểm player đã nhập.

#### Scenario: Admin override điểm
- **WHEN** admin nhập điểm mới cho 1 đội tại 1 trạm và submit
- **THEN** điểm được cập nhật với `score_updated_by = 'admin'`; player nhìn thấy điểm cập nhật (nếu đang ở màn hình kết quả)

### Requirement: Admin nhập điểm thủ công cho trạm private
Hệ thống SHALL cho phép admin cộng hoặc trừ điểm cho bất kỳ đội nào thông qua trạm private (điểm có thể âm).

#### Scenario: Admin cộng/trừ điểm qua trạm private
- **WHEN** admin chọn trạm private, chọn đội và nhập điểm (dương hoặc âm)
- **THEN** điểm được lưu vào team_stations cho cặp (đội, trạm private) đó; tổng điểm đội được tính lại
