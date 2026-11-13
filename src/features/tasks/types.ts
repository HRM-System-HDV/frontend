export type TaskStatus = "pending" | "inProgress" | "overdue" | "completed";
export type TaskPriority = "urgent" | "high" | "normal";

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  assignedByName: string;
  branch: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedToName: string;
  // Mã nhân viên được giao, khác với mã tài khoản đăng nhập.
  assignedToId?: string | null;
  completedAt?: string;
  createdAt: string;
  requirePhoto?: boolean; // Quản trị viên yêu cầu chụp ảnh kết quả khi hoàn thành
  proofPhotoUrl?: string; // Ảnh minh chứng kết quả công việc do nhân viên chụp
  photoSubmittedByName?: string | null;
  photoSubmittedAt?: string; // Thời điểm nộp ảnh do server ghi nhận.
}
