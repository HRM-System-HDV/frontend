export interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface WorkShift {
  id: string;
  employee: string;
  branch: string;
  date: string;
  templateName: string;
  scheduled: string;
  checkIn: string;
  checkOut: string;
  status: "Đúng giờ" | "Trễ" | "Về sớm" | "Chưa làm";
  note?: string;
  isRecurring?: boolean;
}

export interface WeeklyRegistration {
  id: string;
  employeeName: string;
  role: string;
  branch: string;
  requestedCount: number;
  registeredAt: string;
  order: number;
  days: Record<string, string>;
  note?: string;
}
