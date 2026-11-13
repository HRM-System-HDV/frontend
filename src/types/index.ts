// ============================================================
// Types cho hệ thống quản lý Nhân sự nội bộ (HRM System - On-Premises)
// ============================================================

export type UserRole = "admin" | "manager" | "staff";

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender?: "Nam" | "Nữ" | "Khác" | string;
  birthDate?: string; // e.g. "15/03/1998"

  // Địa chỉ hiện tại (đồng bộ mobile)
  province?: string;  // Tỉnh / Thành phố
  ward?: string;      // Phường
  street?: string;    // Số nhà / Tên đường

  // Thông tin CCCD / Định danh (đồng bộ mobile)
  cccd?: string;        // Số CCCD (12 chữ số)
  issueDate?: string;   // Ngày cấp
  issuePlace?: string;  // Nơi cấp
  cccdFront?: string; // Đường dẫn ảnh mặt trước
  cccdBack?: string;  // Đường dẫn ảnh mặt sau
  avatar?: string;              // Đường dẫn ảnh đại diện

  // Công tác & Phân quyền
  branchId?: string | null;
  departmentId?: string | null;
  positionId?: string | null;
  employeeCode?: string;
  department: string;
  role: "Quản trị viên" | "Quản lý" | "Nhân sự" | "Kế toán" | "Lễ tân" | "Kỹ thuật" | string;
  systemRole?: UserRole;
  accountId?: string;
  status: "đang làm" | "vô hiệu hóa" | "nghỉ việc";
  resignedAt?: string | null;
  joinDate?: string;

  // Tiền lương & Ngân hàng
  baseSalary?: number;
  salaryType?: "hourly" | "monthly";
  salary?: string;
  standardWorkDays?: number | null;
  hourlySalary?: number;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
}

export interface ShiftRequest {
  id: string;
  employee: string;
  branch: string;
  type: "đổi ca" | "nghỉ phép" | "bổ sung công" | "tạm ứng";
  title?: string;
  amount?: string;
  from: string;
  to: string;
  reason: string;
  status: "chờ duyệt" | "đã duyệt" | "từ chối";
  createdAt?: string;
  // Thông tin xử lý đơn do BE lưu khi duyệt/từ chối.
  reviewedByName?: string;
  reviewNote?: string;
  reviewedAt?: string;
}

export interface Payslip {
  id: string;
  /** employeeId của organization-service (BE) — dùng để gọi chi tiết nhân sự. */
  employeeId?: string;
  employee: string;
  branch?: string;
  branchId?: string | null;
  month: string;
  days: number | null;
  salaryType?: "monthly" | "hourly";
  workedHours?: number | null;
  /** Số ca làm việc được tính lương (BE: workedShifts). */
  workedShifts?: number | null;
  penaltyOverride?: number | null;
  /** Các trường chuẩn BE (payroll-service /api/payroll/payslips). */
  baseSalary?: number;
  bonus: number;
  totalPenalty?: number;
  netSalary?: number;
  /** Alias sau map BE -> hiển thị: salary = baseSalary, penalty = totalPenalty, total = netSalary. */
  salary?: number;
  penalty?: number;
  total?: number;
  payoutId?: string | null;
  status: "chưa chốt" | "đã chốt" | "chưa xác nhận" | "đã xác nhận" | "đã thanh toán";
  reason?: string;
  adjustmentReason?: string | null;
  issuedAt?: string;
}

export interface WifiConfig {
  id: string;
  ssid: string;
  bssid: string;
  /** branches.id (UUID) của organization-service — không có FK chéo DB. */
  branchId: string;
  /** integration-service chặn đúng 2 giá trị này khi ghi. */
  status: "hoạt động" | "vô hiệu hóa";
  createdAt?: string;
}

export interface Branch {
  id: string;
  name: string;
  branchCode?: string;
  address: string;
  manager: string;
  managerId: string | null;
  status: "hoạt động" | "vô hiệu hóa";
  staff: number;
  createdAt?: string;
}
export interface BranchManagerCandidate { id: string; name: string; systemRole: "admin" | "manager" }

export interface Department {
  id: string;
  name: string;
  /** Mã nghiệp vụ của phòng ban; dùng ID để liên kết. */
  departmentCode: string;
  managerId?: string | null;
  manager: string;
  status: "hoạt động" | "tạm dừng";
  staff?: number;
  createdAt?: string;
}
export interface Position {
  id: string;
  name: string;
  /** Mã nghiệp vụ của vị trí; dùng ID để liên kết. */
  positionCode: string;
  /** null = vị trí liên chi nhánh, khai báo dùng được ở mọi phòng ban. */
  departmentId: string | null;
  status: "hoạt động" | "tạm dừng";
  /** Số hồ sơ đang trỏ tới vị trí — do organization-service đếm. */
  staff?: number;
  createdAt?: string;
}

export interface Notification {
  id: string;
  title: string;
  /** Tên trường thật của API integration-service (không phải `content`). */
  body: string;
  /** ISO/định dạng gốc server trả về (không phải `time`). */
  createdAt: string;
  /** Cờ đã đọc theo schema DB (không phải `read`). */
  isRead: boolean;
  icon?: string;
  tone?: "primary" | "info" | "danger" | "warning" | "success";
}

export interface Announcement {
  id: string;
  title: string;
  summary: string;
  content: string;
  date: string;
  tag: string;
}

export type RegulationCategory =
  | "Nội quy lao động"
  | "An toàn lao động"
  | "Chấm công & Kỷ luật"
  | "Thưởng & Kỷ luật"
  | "Bảo mật & Dữ liệu"
  | "Vận hành chung"
  | string;

export type RegulationStatus = "hiệu lực" | "dự thảo" | "hết hiệu lực";

export interface RegulationFile {
  id: string;
  publicId: string;
  mime: string;
  bytes: number;
}

export interface Regulation {
  id: string;
  regulationCode: string;
  title: string;
  category: RegulationCategory;
  summary: string;
  content: string;
  status: RegulationStatus;
  scopeBranchId: string | null; // null = toàn công ty
  effectiveDate: string; // ISO YYYY-MM-DD (BE gửi/nhận ngày ISO)
  expiryDate?: string | null;
  createdAt: string;
  updatedAt: string;
  version: string;
  pinned?: boolean;
  files?: RegulationFile[];
}
