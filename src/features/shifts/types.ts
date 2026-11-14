export interface ShiftTemplate {
  id: string;
  /** Mã nghiệp vụ khung ca, ví dụ ST-SANG (theo schema Prisma shift_templates.templateCode). */
  templateCode?: string;
  name: string;
  /** Giờ trong ngày, "HH:mm" — không phải mốc thời gian. */
  startTime: string;
  endTime: string;
  createdAt?: string;
}

/** Attendance đi kèm Shift trong projection của BE (work-service /api/shifts). */
export interface BackendShiftAttendance {
  checkIn?: string | Date | null;
  checkOut?: string | Date | null;
  status?: string;
  penaltyAmount?: number;
  penaltyNote?: string;
}

/**
 * Shift do BE (work-service 4003) trả qua Gateway — khớp `shiftProjection` +
 * model `Shift` (schema Prisma 20261112: UUID, employeeId/branchId, workDate,
 * templateId, scheduledStart/scheduledEnd, status, attendance).
 * KHÔNG có checkIn/checkOut trên chính Shift — giờ vào/ra nằm ở `attendance`.
 */
export interface BackendShift {
  id: string;
  employeeId: string;
  branchId?: string | null;
  workDate?: string;
  templateId: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  status?: string;
  createdAt?: string;
  attendance?: BackendShiftAttendance | null;
  attendanceState?: string;
  canCheckout?: boolean;
}

/** View model hiển thị cho FE (đã qua map từ BackendShift). */
export interface WorkShift {
  id: string;
  employee: string;
  employeeId?: string;
  phone?: string;
  branch: string;
  branchId?: string;
  date: string;
  templateName: string;
  scheduled: string;
  checkIn: string;
  checkOut: string;
  /** Mốc ISO gốc trong `attendance.checkIn/checkOut`; "HH:mm" ở trên chỉ để hiển thị,
   *  còn PUT /api/attendance/:shiftId cần giá trị đầy đủ để nạp lại form giờ. */
  rawCheckIn?: string | null;
  rawCheckOut?: string | null;
  status: "Đúng giờ" | "Trễ" | "Về sớm" | "Chưa chấm công" | "Quên chấm công";
}

export interface WeeklyRegistration {
  id: string;
  employeeName: string;
  role: string;
  branch: string;
  branchId?: string;
  requestedCount: number;
  registeredAt: string;
  order: number;
  days: Record<string, string>;
  dayRegistrationIds?: Record<string, string>;
  note?: string;
}

export interface ShiftRegistrationRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  branch: string;
  branchId?: string;
  date: string;
  templateName: string;
  scheduled: string;
  registeredAt: string;
  status: "Đã đăng ký";
  note?: string;
  rawShiftId?: string;
}
