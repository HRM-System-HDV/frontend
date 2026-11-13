# HRM — Web quản trị

Web cho đồ án quản lý nhân sự SOA, dùng Next.js App Router, React, TypeScript, Tailwind CSS và Font Awesome. Giữ giao diện Public Sans và màu chủ đạo hiện có; font được phục vụ từ `public/fonts` để build không cần Google Fonts.

## Chạy dự án

Yêu cầu Node.js >= 20.9 và API Gateway đang chạy. Cấu hình `NEXT_PUBLIC_GATEWAY_URL` theo `.env.example` (mặc định `http://localhost:4000`). Web chỉ gọi Gateway; không kết nối DB và không tự ghi nhật ký nghiệp vụ.

```sh
npm ci
npm run dev
```

Trên PowerShell bị chặn script, dùng `npm.cmd` thay cho `npm`.

## Phạm vi

- Admin: toàn bộ Web. Manager: vận hành chi nhánh; không có tài khoản/phân quyền, ngân hàng/SOAP, Wi-Fi, cấu hình chấm công hoặc nhật ký hệ thống. Staff sử dụng Mobile.
- Hồ sơ nhân viên, CCCD, tải ảnh đại diện/CCCD, lương thỏa thuận theo giờ/tháng và số công thỏa thuận cho lương tháng. Chi nhánh, phòng ban, vị trí dùng UUID; mã nghiệp vụ chỉ để hiển thị.
- Ca mẫu, phân ca, nguyện vọng đăng ký; xem chấm công và nhập đủ giờ vào/ra trực tiếp trên ca. Chặn chọn ca đã phân cho nhân viên, BE kiểm tra trùng/đè thời gian lần cuối. Cấu hình vào sớm, hạn checkout, phạt phần trăm và chấm công kép tách riêng.
- Công việc cá nhân giao trực tiếp; công việc chung theo chi nhánh/ngày/ca mẫu có chung trạng thái hoàn thành và ảnh minh chứng.
- Đơn nghỉ, tạm ứng, đổi ca, bổ sung công chỉ ghi nhận kết quả duyệt. Duyệt đơn không tự sửa lịch, chấm công hoặc lương.
- Phiếu lương dùng số tiền dạng chuỗi, lấy kết quả tính công từ BE. Admin/manager xác nhận phiếu trong phạm vi; chỉ admin chi các phiếu đã xác nhận, chưa trả qua REST/SOAP. Giữ khóa chống trùng khi thử lại cùng lệnh chi và không coi SOAP Fault là thành công.
- Bảng tin, quy định và thông báo theo chi nhánh/toàn thể; PDF đính kèm quy định. Thông báo đọc riêng từng nhân viên và được tải lại mỗi 60 giây.

Phiên Web dùng cookie HttpOnly và refresh qua Gateway. Không lưu token hoặc dữ liệu nhân sự trong localStorage. Mọi quyền và tính toán lương vẫn được BE kiểm tra.
Menu tài khoản có đổi mật khẩu và xem/thu hồi các phiên thiết bị của chính mình; IP/vị trí chỉ hiển thị dữ liệu BE đã ghi nhận.

## Cấu trúc

`src/app` chứa route; `src/features` chứa giao diện từng nghiệp vụ; `src/components` chứa UI dùng chung; `src/lib/api.ts` là HTTP client; `src/types/index.ts` chứa DTO phù hợp BE.

## Kiểm tra

```sh
npm run typecheck
npm run lint
npm run build
npm test
npm run typecheck:test
```

TypeScript production và test có cấu hình riêng (`tsconfig.json`, `tsconfig.test.json`). Build production không cần Vitest; `npm test` và `typecheck:test` cần cài đủ devDependencies. Không bỏ qua lỗi production khi build.

Các kiểm thử bao phủ payload hồ sơ/danh mục, ca qua đêm và múi giờ, ca trùng, công việc trực tiếp/chung, quyền duyệt đơn, xác nhận lương, tổng lệnh chi chính xác, refresh phiên, phân quyền Web và SOAP Fault.

Chi tiết nghiệp vụ: `../docs/BUSINESS.md`. Kết quả kiểm tra và giới hạn môi trường: `../docs/AUDIT.md`.
