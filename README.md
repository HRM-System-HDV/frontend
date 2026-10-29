# HRM Enterprise — Web Portal Quản trị (Next.js 16 + Tailwind CSS v4)

Cổng thông tin Web Portal quản trị nhân sự, vận hành ca kíp, phê duyệt đơn từ, tính lương và tích hợp chi lương ngân hàng cho chuỗi doanh nghiệp bán lẻ / F&B / dịch vụ.

Thuộc hệ sinh thái **HRM Enterprise**, kết nối trực tiếp với Core Server (Express Microservices SOA) qua API Gateway.

---

## 🛠 Công nghệ sử dụng

- **Framework:** Next.js 16.0 (App Router)
- **Giao diện:** React 19, Tailwind CSS v4, Lucide React Icons
- **Ngôn ngữ:** TypeScript
- **Xác thực:** Cookie-based JWT Session (`hrm-session`) thông qua API Gateway
- **Kiến trúc:** Feature-based Clean Architecture, Modular Components, Client & Server Components

---

## 🌟 Phân hệ & Tính năng chính

1. **📊 Dashboard Tổng quan:**
   - Thống kê thời gian thực: Tổng nhân viên, phòng ban, ca trực hôm nay, đơn từ đang chờ duyệt, quỹ lương tháng.
   - Biểu đồ biến động nhân sự và các thông báo quan trọng trong ngày.

2. **🏢 Cơ cấu Tổ chức:**
   - Quản lý Chi nhánh: Thêm, sửa, xem thông tin chi nhánh (HN-1, HN-2, DN-1...), địa chỉ, số điện thoại liên hệ.
   - Quản lý Phòng ban: Phân bổ phòng ban theo từng chi nhánh, chỉ định trưởng phòng.

3. **👥 Quản lý Nhân sự:**
   - Danh sách nhân viên toàn hệ thống / theo chi nhánh, tìm kiếm và lọc đa điều kiện.
   - Xem và cập nhật hồ sơ chi tiết: CCCD, mã số thuế, chức vụ, mức lương cơ bản, ảnh đại diện.
   - Khóa/mở khóa tài khoản, cấp lại mật khẩu cho nhân sự.

4. **📅 Quản lý Ca kíp & Chấm công:**
   - Khởi tạo ca mẫu (Sáng, Chiều, Tối, Đêm), định mức giờ làm và hệ số lương.
   - Phân ca làm việc cho nhân viên theo tuần/tháng.
   - Đăng ký ca làm thêm / nguyện vọng đi làm của nhân sự.
   - Theo dõi dữ liệu chấm công Wi-Fi thực tế và xuất lịch phân ca (PDF/Excel).

5. **📝 Phê duyệt Đơn từ:**
   - Tiếp nhận và xử lý đơn xin nghỉ phép, làm thêm giờ (OT), tạm ứng lương, giải trình vi phạm chấm công kèm ảnh chứng thực.
   - Quy trình duyệt nhiều cấp (Quản lý chi nhánh -> Giám đốc).

6. **💰 Bảng lương & Lệnh chi Ngân hàng:**
   - Tự động tổng hợp ngày công, phụ cấp, tiền phạt, thuế TNCN và BHXH.
   - Chốt bảng lương định kỳ hàng tháng.
   - Tích hợp cổng thanh toán ngân hàng (SOAP Bank Simulator), tạo lệnh chi lương chống trùng lặp (`idempotencyKey`).

7. **📢 Bảng tin & Quy chế Doanh nghiệp:**
   - Đăng tin tức, thông báo toàn công ty hoặc theo từng chi nhánh.
   - Quản lý sổ tay nhân sự, quy định thưởng phạt, chính sách nội bộ.

8. **📶 Cấu hình Wi-Fi Chấm công:**
   - Cài đặt danh sách Access Point Wi-Fi (BSSID, IP Gateway) tại mỗi chi nhánh để phục vụ chấm công mobile app.

---

## 🌳 Cấu trúc Thư mục Repository

```text
frontend/
├── public/                 # Static assets, logos, favicon
├── src/
│   ├── app/                # Next.js App Router (auth, dashboard: branches, shifts, payslips...)
│   ├── components/         # UI Components dùng chung (Sidebar, Topbar, Modal, Form, Table...)
│   ├── context/            # React Context (AuthContext, TopbarContext)
│   ├── features/           # Module nghiệp vụ chuyên biệt:
│   │   ├── bank/           # Lệnh chi SOAP ngân hàng & thống kê chi trả
│   │   ├── branches/       # CRUD danh sách chi nhánh
│   │   ├── departments/    # CRUD phòng ban
│   │   ├── employees/      # Quản lý nhân viên, hồ sơ, cấp lại mật khẩu
│   │   ├── news/           # Đăng bảng tin & thông báo
│   │   ├── payslips/       # Quản lý bảng lương & chốt lương
│   │   ├── regulations/    # Sổ tay quy chế công ty
│   │   ├── requests/       # Duyệt đơn từ nghỉ phép, OT, tạm ứng
│   │   ├── shifts/         # Phân ca, ca mẫu, nguyện vọng tuần
│   │   ├── tasks/          # Quản lý tác vụ vận hành
│   │   └── wifi/           # Cấu hình BSSID / IP Wi-Fi chi nhánh
│   ├── hooks/              # Custom React Hooks (useCurrentUser)
│   ├── lib/                # API Client, utils, phân quyền
│   └── types/              # TypeScript Type & Interface toàn hệ thống
├── .env.example            # Khai báo biến môi trường mẫu
├── .env.local              # Cấu hình biến môi trường cục bộ
├── next.config.ts          # Cấu hình Next.js
├── package.json            # Dependencies
├── tsconfig.json           # Cấu hình TypeScript
└── postcss.config.mjs      # Cấu hình Tailwind CSS
```

---

## 🚀 Cài đặt & Khởi chạy

### Yêu cầu hệ thống
- **Node.js** >= 18.x
- **npm** >= 9.x
- **API Gateway backend** đang chạy tại port `4000`

### Các bước cài đặt

```bash
# 1. Cài đặt các thư viện phụ thuộc
npm install

# 2. Cấu hình biến môi trường (Đã có sẵn file .env và .env.local)
cp .env.example .env.local
```

Nội dung file `.env.local`:
```env
NEXT_PUBLIC_GATEWAY_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000
PORT=3000
```

```bash
# 4. Chạy môi trường phát triển (Development)
npm run dev
# Truy cập giao diện tại: http://localhost:3000

# 5. Build phiên bản phát hành (Production)
npm run build
npm start
```

---

## 🔑 Tài khoản thử nghiệm

| Vai trò | Email | Mật khẩu | Phạm vi quyền hạn |
|---|---|---|---|
| **Admin** — Trần Minh Tuấn | `admin@company.com` | `123456` | Toàn quyền hệ thống, quản trị tất cả chi nhánh |
| **Manager** — Vũ Thành Công | `manager@company.com` | `123456` | Quản lý vận hành phạm vi chi nhánh HN-1 |

---

## 🔗 Liên kết hệ sinh thái HRM Enterprise

- **Backend SOA (Core Server):** [HRM-QuanLyDuAn/backend](https://github.com/HRM-QuanLyDuAn/backend)
- **Mobile App (Flutter):** [HRM-QuanLyDuAn/mobile](https://github.com/HRM-QuanLyDuAn/mobile)
