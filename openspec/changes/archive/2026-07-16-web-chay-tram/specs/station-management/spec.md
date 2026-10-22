## ADDED Requirements

### Requirement: Admin có thể tạo và quản lý trạm
Hệ thống SHALL cho phép admin tạo trạm thuộc một game với đầy đủ thông tin: tên, mô tả thử thách, link map / text map, gợi ý, thời gian thực hiện (giây), số đội tối đa cùng lúc, đơn vị trò chơi, loại thử thách (trắc nghiệm / thể lực / không có), và public/private.

#### Scenario: Tạo trạm với thử thách trắc nghiệm
- **WHEN** admin chọn loại thử thách là "trắc nghiệm" và chọn câu hỏi từ ngân hàng
- **THEN** trạm được tạo với `challenge_type = 'mcq'` và `question_id` được liên kết

#### Scenario: Tạo trạm thể lực không có câu hỏi
- **WHEN** admin chọn loại thử thách là "thể lực"
- **THEN** trạm được tạo với `challenge_type = 'physical'`, không yêu cầu question_id

#### Scenario: Trạm private không hiện với player
- **WHEN** trạm được đánh dấu là private
- **THEN** trạm đó không hiển thị trong map/list của player; chỉ admin thấy và có thể nhập điểm thủ công

### Requirement: Trạm có giới hạn số đội đồng thời
Hệ thống SHALL không cho phép quá `max_teams` đội ở trạng thái `active` tại cùng một trạm cùng lúc.

#### Scenario: Trạm đã đầy không nhận thêm đội
- **WHEN** một đội được random chỉ định đến trạm đã đủ `max_teams` đội active
- **THEN** hệ thống bỏ qua trạm đó và chọn trạm khác chưa đầy
