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
  cccdFront?: string | boolean; // Trạng thái ảnh mặt trước
  cccdBack?: string | boolean;  // Trạng thái ảnh mặt sau
  avatar?: string;              // Đường dẫn ảnh đại diện

  // Công tác & Phân quyền
  branch: string;
  department: string;
  role: "Quản trị viên" | "Quản lý" | "Nhân sự" | "Kế toán" | "Lễ tân" | "Kỹ thuật" | string;
  systemRole: UserRole;
  status: "đang làm" | "vô hiệu hóa";
  joinDate?: string;

  // Tiền lương & Ngân hàng
  baseSalary?: number;
  salaryType?: "hourly" | "monthly";
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
  from: string;
  to: string;
  reason: string;
  status: "chờ duyệt" | "đã duyệt" | "từ chối";
  createdAt?: string;
}

export interface Payslip {
  id: string;
  employee: string;
  branch?: string;
  month: string;
  days: number;
  salary: number;
  bonus: number;
  penalty: number;
  total: number;
  status: "chưa chốt" | "đã chốt";
  reason?: string;
}

export interface Shift {
  id: string;
  employee: string;
  branch: string;
  date: string;
  template: string;
  scheduled: string;
  checkIn?: string;
  checkOut?: string;
  status: "hoàn thành" | "đang làm" | "vắng" | "trễ";
}

export interface WifiConfig {
  id: string;
  ssid: string;
  bssid: string;
  branch: string;
  status: string;
}

export interface Branch {
  id: string;
  name: string;
  slug: string;
  address: string;
  manager: string;
  status: "hoạt động" | "vô hiệu hóa";
  staff: number;
}

export interface Department {
  id: string;
  name: string;
  /** Mã phòng ban do hệ thống tự sinh (PB-0001), client không tự nhập. */
  code: string;
  manager: string;
  status: "hoạt động" | "tạm dừng";
  staff?: number;
  createdAt?: string;
}

export interface Notification {
  id: string;
  title: string;
  content: string;
  time: string;
  read: boolean;
  icon?: string;
  tone?: "primary" | "info" | "danger" | "warning" | "success";
}

export interface Announcement {
  id: string;
  title: string;
  summary: string;
  content: string;
  author: string;
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

export interface Regulation {
  id: string;
  code: string;
  title: string;
  category: RegulationCategory;
  summary: string;
  content: string;
  status: RegulationStatus;
  scope: string; // "Toàn công ty" | "HN-1" | "HN-2" ...
  effectiveDate: string; // dd/mm/yyyy
  expiryDate?: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  version: string;
  pinned?: boolean;
  attachments?: number;
}
