## ADDED Requirements

### Requirement: Player hoàn thành câu hỏi intro để nhận trạm đầu tiên
Sau khi tham gia game, hệ thống SHALL hiển thị 1 câu hỏi trắc nghiệm từ ngân hàng. Player phải trả lời đúng để được biết trạm đầu tiên cần đến.

#### Scenario: Trả lời đúng → nhận trạm đầu
- **WHEN** player chọn đáp án đúng cho câu hỏi intro
- **THEN** hệ thống random chọn 1 trạm public chưa đầy làm trạm đầu tiên và hiển thị thông tin trạm (tên, mô tả, map link/text, gợi ý)

#### Scenario: Trả lời sai → hỏi lại
- **WHEN** player chọn đáp án sai
- **THEN** hệ thống báo sai và hiển thị câu hỏi mới ngẫu nhiên từ ngân hàng

### Requirement: Player yêu cầu bắt đầu trạm và chờ admin xác nhận
Khi player đến trạm thực địa, hệ thống SHALL cho phép player nhấn "Bắt đầu" và đợi admin xác nhận trước khi timer chạy.

#### Scenario: Player nhấn Bắt đầu
- **WHEN** player nhấn nút "Bắt đầu tại trạm X"
- **THEN** hệ thống gửi yêu cầu đến admin và hiển thị trạng thái "Đang chờ admin xác nhận..."

#### Scenario: Admin xác nhận → timer bắt đầu
- **WHEN** admin nhấn "Xác nhận bắt đầu" cho đội đó
- **THEN** timer đếm ngược hiển thị trên màn hình player (theo thời gian cài đặt của trạm); thử thách hiển thị

#### Scenario: Player reload trong lúc đang chờ xác nhận
- **WHEN** player đã nhấn "Bắt đầu" và reload trang trước khi admin xác nhận, còn trong vòng 1 phút kể từ lúc yêu cầu
- **THEN** màn hình player phục hồi đúng trạng thái "Đang chờ admin xác nhận bắt đầu…" thay vì hiện lại nút "Bắt đầu"

#### Scenario: Yêu cầu bắt đầu hết hạn sau 1 phút
- **WHEN** player đã yêu cầu bắt đầu nhưng quá 1 phút admin vẫn chưa xác nhận
- **THEN** hệ thống cho phép player nhấn "Bắt đầu" để gửi lại yêu cầu mới

### Requirement: Timer đếm ngược chạy trên server và sync về player
Hệ thống SHALL duy trì timer authoritative trên server, broadcast mỗi giây qua Socket.io về màn hình player.

#### Scenario: Timer hết giờ
- **WHEN** đồng hồ đếm về 0
- **THEN** hệ thống tự động chuyển sang màn hình nhập điểm; nếu player đã nhập điểm trước đó thì giữ nguyên

### Requirement: Player nhập điểm trong thời hạn quy định
Player SHALL được nhập điểm của mình trong khi timer còn chạy. Sau khi hết giờ, chỉ admin mới được nhập điểm.

#### Scenario: Player nhập điểm trước khi hết giờ
- **WHEN** timer còn chạy và player nhập điểm rồi submit
- **THEN** điểm được lưu với `score_updated_by = 'team'`; hiển thị xác nhận "Đã nhập điểm, chờ trạm tiếp theo"

#### Scenario: Player cố nhập điểm sau khi hết giờ
- **WHEN** timer đã hết và player cố nhập điểm từ màn hình player
- **THEN** hệ thống từ chối và hiển thị "Hết thời gian, chỉ admin có thể nhập điểm"

### Requirement: Hệ thống chọn trạm tiếp theo — chưa đầy và rải đều đội
Sau khi hoàn thành 1 trạm, hệ thống SHALL chọn trạm tiếp theo trong các trạm public mà đội **chưa đến** và **chưa đầy** `max_teams`. Trong nhóm ứng viên hợp lệ đó, hệ thống SHALL ưu tiên các trạm đang có **ít đội active nhất** (least-loaded) rồi chọn ngẫu nhiên trong số đó, nhằm rải đều các đội ra nhiều trạm khác nhau thay vì dồn nhiều đội vào cùng một trạm.

#### Scenario: Còn trạm chưa đến
- **WHEN** đội hoàn thành 1 trạm và còn trạm public chưa đến & chưa đầy
- **THEN** hệ thống chọn ngẫu nhiên 1 trạm trong nhóm trạm đang có ít đội active nhất và hiển thị thông tin trạm đó

#### Scenario: Ưu tiên trạm ít đội để rải đều
- **WHEN** có nhiều trạm hợp lệ nhưng số đội đang chơi ở mỗi trạm khác nhau
- **THEN** hệ thống ưu tiên trạm có số đội active thấp nhất; nếu nhiều trạm cùng mức thấp nhất thì random trong số đó

#### Scenario: Tất cả trạm còn lại đều đầy
- **WHEN** mọi trạm public đội chưa đến đều đã đạt `max_teams` đội active
- **THEN** hệ thống cho đội chờ và tự thử lại khi có chỗ trống (không bao giờ vượt `max_teams`)

#### Scenario: Đã hoàn thành tất cả trạm
- **WHEN** đội hoàn thành trạm cuối cùng
- **THEN** hệ thống redirect đến màn hình kết quả cuối với điểm tổng và bảng xếp hạng

### Requirement: Màn hình kết quả cuối cho player
Sau khi hoàn thành tất cả trạm hoặc game bị admin end, hệ thống SHALL hiển thị điểm từng trạm, tổng điểm của đội và bảng xếp hạng tất cả đội.

#### Scenario: Kết quả cuối sau khi chơi hết trạm
- **WHEN** đội hoàn thành trạm cuối
- **THEN** màn hình hiển thị: điểm từng trạm (chỉ trạm public), tổng điểm, bảng XH toàn game

#### Scenario: Admin end game — tất cả đội xem kết quả
- **WHEN** admin nhấn end game
- **THEN** tất cả player (dù đang ở bất kỳ màn hình nào) được redirect về màn hình kết quả
