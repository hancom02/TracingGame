# scoring Specification

## Purpose
TBD - created by archiving change web-chay-tram. Update Purpose after archive.

## Requirements

### Requirement: Điểm tổng của đội tính từ tất cả trạm kể cả trạm private
Hệ thống SHALL tính tổng điểm mỗi đội bằng SUM(score) từ tất cả team_stations của đội đó (bao gồm cả trạm private, có thể âm).

#### Scenario: Tính điểm có trạm private âm
- **WHEN** đội hoàn thành 3 trạm public (+80, +90, +70) và admin trừ điểm qua trạm private (-20)
- **THEN** tổng điểm đội = 220

#### Scenario: Bảng xếp hạng cuối game
- **WHEN** game kết thúc hoặc player xem màn hình kết quả
- **THEN** hiển thị bảng XH gồm: hạng, tên đội, tổng điểm; sắp xếp giảm dần theo điểm

### Requirement: Player chỉ thấy điểm trạm public trong màn hình kết quả
Hệ thống SHALL hiển thị chi tiết điểm theo từng trạm cho player, nhưng chỉ hiển thị các trạm public. Tổng điểm vẫn bao gồm cả trạm private nhưng không hiện chi tiết.

#### Scenario: Kết quả player — trạm private ẩn
- **WHEN** player xem màn hình kết quả của mình
- **THEN** danh sách trạm chỉ hiện trạm public kèm điểm; tổng điểm = tổng tất cả (kể cả điều chỉnh private) nhưng không có dòng giải thích trạm private

### Requirement: Admin override điểm được ghi nhận
Hệ thống SHALL đánh dấu điểm do admin nhập/override khác với điểm player tự nhập.

#### Scenario: Phân biệt nguồn điểm
- **WHEN** admin xem chi tiết kết quả 1 đội tại 1 trạm
- **THEN** hiển thị ai đã nhập điểm cuối cùng: "Player" hoặc "Admin (override)"
