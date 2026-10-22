## ADDED Requirements

### Requirement: Menu điều hướng giữa các trang quản lý của cùng một game
Trên các trang quản lý gắn với một game cụ thể (Sửa game, Trạm, Câu hỏi, Điều khiển, Monitor trạm, Monitor đội), hệ thống SHALL hiển thị một menu liệt kê cả 6 mục trên, mỗi mục là liên kết sang trang tương ứng kèm theo game đang thao tác, để admin chuyển trang mà không cần quay lại Dashboard.

#### Scenario: Chuyển từ trang Câu hỏi sang trang Trạm của cùng game
- **WHEN** admin đang ở trang Câu hỏi của game #5 và bấm mục "Trạm" trên menu
- **THEN** trình duyệt chuyển tới trang Trạm với đúng game #5 (không phải chọn lại game từ Dashboard)

#### Scenario: Menu hiển thị đủ 6 mục trên mọi trang quản lý game
- **WHEN** admin mở bất kỳ trang nào trong số: Sửa game, Trạm, Câu hỏi, Điều khiển, Monitor trạm, Monitor đội
- **THEN** menu hiển thị đủ 6 mục: Sửa game, Trạm, Câu hỏi, Điều khiển, Monitor trạm, Monitor đội

### Requirement: Menu đánh dấu trang hiện tại
Hệ thống SHALL đánh dấu mục tương ứng với trang đang xem là "đang active" và không cho bấm lại vào chính trang đó qua menu.

#### Scenario: Mục active không phải là link
- **WHEN** admin đang ở trang Điều khiển của một game
- **THEN** mục "Điều khiển" trên menu được hiển thị ở trạng thái active và không phải là một liên kết (bấm vào không điều hướng đi đâu)

### Requirement: Trang không gắn với 1 game cụ thể không hiển thị menu này
Hệ thống SHALL không hiển thị menu điều hướng game trên các trang không thao tác với một game cụ thể (Dashboard, đăng nhập, trực trạm).

#### Scenario: Dashboard không hiển thị menu game
- **WHEN** admin mở trang Dashboard (danh sách nhiều game)
- **THEN** không có menu điều hướng game nào được hiển thị

#### Scenario: Trang trực trạm không hiển thị menu game
- **WHEN** tình nguyện viên mở trang Trực trạm (`station-view.html`)
- **THEN** không có menu điều hướng game nào được hiển thị
