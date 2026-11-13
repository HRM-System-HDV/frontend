// Hợp đồng DTO của BE; tiền giữ dạng chuỗi Decimal, ngày YYYY-MM-DD và timestamp ISO.
export type UserRole = "admin" | "manager" | "staff";
export type Money = string;
export type SalaryType = "hourly" | "monthly";
export interface UserAccount { id: string; employeeId: string | null; name: string; email: string; systemRole: UserRole; role: UserRole; branchId: string | null }
export interface Employee {
  id: string; employeeCode: string; name: string; email: string;
  phone?: string | null; gender?: string | null; birthDate?: string | null;
  province?: string | null; ward?: string | null; street?: string | null;
  cccd?: string | null; issueDate?: string | null; issuePlace?: string | null;
  cccdFront?: string | null; cccdBack?: string | null; avatar?: string | null;
  branchId: string | null; departmentId: string | null; positionId: string | null;
  status: string; resignedAt?: string | null; joinDate?: string | null;
  salaryType: SalaryType; salary: Money; standardWorkDays: number | null;
  bankName?: string | null; bankAccountNumber?: string | null; bankAccountName?: string | null; createdAt?: string;
}
export interface Branch { id: string; branchCode: string; name: string; address?: string | null; managerId?: string | null; status: string; createdAt?: string }
export interface Department { id: string; departmentCode: string; name: string; managerId?: string | null; status: string; createdAt?: string }
export interface Position { id: string; positionCode: string; name: string; departmentId?: string | null; status: string; createdAt?: string }
export interface ShiftTemplate { id: string; templateCode: string; name: string; startTime: string; endTime: string; createdAt?: string }
export interface Shift {
  id: string; employeeId: string; workDate: string; templateId: string;
  scheduledStart: string; scheduledEnd: string; note?: string | null;
  status: "đang làm" | "đã hủy"; createdAt?: string; attendance?: Attendance | null;
}
export interface ShiftRegistration { id: string; employeeId: string; branchId?: string | null; registerDate: string; templateId: string; createdAt?: string }
export interface Attendance {
  id: string; employeeId: string; shiftId: string; workDate: string;
  checkIn: string | null; checkOut: string | null; penaltyAmount: Money;
  penaltyNote?: string | null; status: string; createdAt?: string; shift?: Shift;
  complete?: boolean; workedSeconds?: number; earnedSalary?: Money;
}
export interface AttendanceConfig {
  id?: string;
  gracePeriodMinutes: number; earlyCheckinMinutes: number; checkoutWindowMinutes: number;
  latePenaltyPct: number; earlyLeavePenaltyPct: number; allowDoubleCheckin: boolean;
  doubleCheckinEarlyMinutes: number; doubleCheckinLateMinutes: number;
  shiftSwapMode: "manager_approval" | "mutual_acceptance"; requireReasonSwap: boolean;
}
export interface Task {
  id: string; title: string; description?: string | null; assignedTo: string | null;
  branchId?: string | null; workDate?: string | null; templateId?: string | null; dueDate?: string | null;
  assignedBy?: string | null; assignedByName?: string | null;
  status: "pending" | "in_progress" | "done"; priority?: string | null;
  requirePhoto: boolean; proofPhotoUrl?: string | null; photoSubmittedBy?: string | null;
  photoSubmittedAt?: string | null; completedAt?: string | null; createdAt?: string;
}
export type RequestType = "leave" | "advance" | "shift_swap" | "work_supplement";
export interface RequestRecord {
  id: string; type: RequestType; employeeId: string; targetEmployeeId?: string | null; branchId: string | null;
  title: string; content: string; attachmentUrl?: string | null;
  leaveStartDate?: string | null; leaveEndDate?: string | null; advanceAmount?: Money | null;
  requestedCheckIn?: string | null; requestedCheckOut?: string | null;
  status: "pending" | "approved" | "rejected"; reviewedBy?: string | null;
  reviewedByName?: string | null; reviewedAt?: string | null; reviewNote?: string | null;
  sourceShiftId?: string | null; targetShiftId?: string | null;
  shiftSwapMode?: "manager_approval" | "mutual_acceptance" | null; createdAt: string;
}
export type PayslipStatus = "pending_confirmation" | "confirmed" | "paid";
export interface Payslip {
  id: string; employeeId: string; branchId: string | null; month: string;
  baseSalary: Money; bonus: Money; totalPenalty: Money; netSalary: Money;
  salaryType: SalaryType; salaryRate: Money; workedHours?: Money | null;
  status: PayslipStatus; confirmedBy?: string | null; confirmedAt?: string | null;
  payoutId?: string | null; issuedAt: string;
}
export interface BankAccount { id: string; accountNumber: string; accountName?: string | null; bankName?: string | null; branchId?: string | null; balance: Money; isPrimary: boolean; createdAt?: string }
export interface Payout { id: string; bankReference: string; debitAccountId: string | null; debitAccountNumber?: string | null; totalAmount: Money; beneficiaryCount: number; content?: string | null; idempotencyKey: string; status: string; createdAt: string; payslips?: { id: string }[]; deduped?: boolean }
export interface SoapGatewayConfig { id?: string; endpointUrl: string; wsdlUrl: string; serviceName: string; securityMode: string; status: string; lastPingTime?: string | null; avgResponseTime?: string | null; certExpiry?: string | null }
export interface Notification { id: string; targetEmployeeId: string; branchId: string | null; title: string; body: string; isRead: boolean; createdAt: string; requestId?: string | null; requestType?: RequestType | null; metadata?: Record<string, unknown> | null; senderName?: string | null }
export interface News { id: string; title: string; summary: string; content: string; publishDate: string; tag: string; pinned: boolean; branchId: string | null; authorId?: string | null; authorName?: string | null; createdAt?: string }
export type RegulationCategory = string;
export type RegulationStatus = "hiệu lực" | "dự thảo" | "hết hiệu lực";
export interface FileAsset { id: string; publicId: string; folder: string; storagePath: string; mime: string; bytes: number; regulationId?: string | null; createdAt?: string; url?: string }
export interface Regulation { id: string; regulationCode: string; title: string; category: string; summary: string; content: string; status: RegulationStatus; scopeBranchId: string | null; effectiveDate: string; expiryDate?: string | null; version: string; pinned: boolean; createdAt?: string; files?: FileAsset[] }
export interface WifiConfig { id: string; ssid: string; bssid: string; branchId: string; status: "hoạt động" | "vô hiệu hóa"; createdAt?: string }
