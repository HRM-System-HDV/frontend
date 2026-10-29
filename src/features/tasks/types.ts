export type TaskSourceType = "manager" | "shift";
export type TaskStatus = "pending" | "inProgress" | "overdue" | "completed";
export type TaskPriority = "urgent" | "high" | "normal";

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  sourceType: TaskSourceType; // "manager": Quản lý giao riêng, "shift": Cố định theo ca
  assignedByName: string;
  shiftName?: string;
  branch: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedToEmail: string;
  assignedToName: string;
  completedAt?: string;
  createdAt: string;
  requirePhoto?: boolean; // Quản trị viên yêu cầu chụp ảnh kết quả khi hoàn thành
  proofPhotoUrl?: string; // Ảnh minh chứng kết quả công việc do nhân viên chụp
  photoSubmittedBy?: string; // Tên nhân viên đã chụp và gửi ảnh qua mobile app
  photoSubmittedAt?: string; // Thời gian nhân viên chụp/nộp ảnh minh chứng
}
