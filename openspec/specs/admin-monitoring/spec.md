# admin-monitoring Specification

## Purpose
TBD - created by archiving change web-chay-tram. Update Purpose after archive.

## Requirements

### Requirement: Màn hình theo dõi theo trạm
Hệ thống SHALL cung cấp màn hình admin hiển thị tất cả trạm và trạng thái của từng đội tại mỗi trạm trong thời gian thực.

#### Scenario: Admin xem tổng quan theo trạm
- **WHEN** admin mở màn hình "Monitor theo Trạm"
- **THEN** hiển thị grid: mỗi trạm là 1 cột/panel, mỗi đội là 1 row; ô hiển thị trạng thái (chờ/đang chơi/hoàn thành) và điểm

#### Scenario: Cập nhật real-time
- **WHEN** trạng thái đội thay đổi (bắt đầu, nộp điểm, hoàn thành)
- **THEN** màn hình monitor tự động cập nhật không cần refresh

### Requirement: Màn hình theo dõi theo đội
Hệ thống SHALL cung cấp màn hình admin hiển thị lịch sử trạm của từng đội theo thứ tự thời gian.

#### Scenario: Admin xem tiến độ 1 đội
- **WHEN** admin chọn xem 1 đội trong màn hình "Monitor theo Đội"
- **THEN** hiển thị danh sách trạm đội đó đã đi qua theo thứ tự thời gian: tên trạm, thời gian bắt đầu, thời gian kết thúc, điểm đạt được

#### Scenario: Admin xem overview tất cả đội
- **WHEN** admin xem màn hình monitor theo đội (chế độ overview)
- **THEN** mỗi đội hiển thị: số trạm đã hoàn thành / tổng trạm, tổng điểm hiện tại, trạm đang ở (nếu có)
