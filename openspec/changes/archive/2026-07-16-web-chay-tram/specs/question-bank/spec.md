## ADDED Requirements

### Requirement: Admin có thể tạo câu hỏi trắc nghiệm vào ngân hàng
Hệ thống SHALL cho phép admin tạo câu hỏi gồm: nội dung câu hỏi, 4 đáp án (A/B/C/D) và chỉ định đáp án đúng. Câu hỏi thuộc về 1 game cụ thể.

#### Scenario: Tạo câu hỏi hợp lệ
- **WHEN** admin điền đầy đủ câu hỏi, 4 đáp án, chọn đáp án đúng và submit
- **THEN** câu hỏi được lưu và có thể chọn khi tạo trạm

#### Scenario: Câu hỏi thiếu đáp án đúng không được tạo
- **WHEN** admin submit câu hỏi mà không chọn đáp án đúng
- **THEN** hệ thống hiển thị lỗi validation

### Requirement: Câu hỏi dùng làm intro mở khoá vào game
Hệ thống SHALL lấy ngẫu nhiên 1 câu hỏi từ ngân hàng của game để làm câu hỏi intro. Player phải trả lời đúng mới được hiển thị trạm đầu tiên.

#### Scenario: Player trả lời đúng câu intro
- **WHEN** player chọn đáp án đúng cho câu hỏi intro
- **THEN** hệ thống hiển thị màn hình "Đến Trạm X" với thông tin trạm đầu tiên

#### Scenario: Player trả lời sai câu intro
- **WHEN** player chọn đáp án sai
- **THEN** hệ thống hiển thị thông báo sai và random câu hỏi mới từ ngân hàng để hỏi lại

### Requirement: Câu hỏi dùng làm thử thách tại trạm
Nếu trạm có `challenge_type = 'mcq'`, hệ thống SHALL hiển thị câu hỏi liên kết với trạm đó cho player trong thời gian đếm ngược.

#### Scenario: Trạm MCQ — player trả lời trong giờ
- **WHEN** timer đang chạy và player chọn đáp án
- **THEN** đáp án được ghi nhận; admin nhìn thấy đáp án player chọn để xác nhận/chấm điểm

#### Scenario: Trạm MCQ — hết giờ chưa trả lời
- **WHEN** timer hết mà player chưa submit đáp án
- **THEN** hệ thống tự động ghi nhận không có đáp án; admin chấm điểm 0 hoặc override
