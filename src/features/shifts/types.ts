export interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface WorkShift {
  id: string;
  employee: string;
  employeeId?: string;
  phone?: string;
  branch: string;
  branchSlug?: string;
  date: string;
  templateName: string;
  scheduled: string;
  checkIn: string;
  checkOut: string;
  status: "Đúng giờ" | "Trễ" | "Về sớm" | "Chưa chấm công" | "Quên chấm công";
  note?: string;
  isRecurring?: boolean;
}

export interface WeeklyRegistration {
  id: string;
  employeeName: string;
  role: string;
  branch: string;
  branchSlug?: string;
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
  date: string;
  templateName: string;
  scheduled: string;
  registeredAt: string;
  status: "Đã đăng ký";
  note?: string;
  rawShiftId?: string;
}
