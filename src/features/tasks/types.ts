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
  // Mã nhân viên được giao (id). Backend lưu id để đối chiếu với x-user-id của
  // người đăng nhập; tên chỉ dùng để hiển thị. Task theo ca (sourceType "shift")
  // giao cho cả ca nên assignedToId = null.
  assignedToId?: string | null;
  completedAt?: string;
  createdAt: string;
  requirePhoto?: boolean; // Quản trị viên yêu cầu chụp ảnh kết quả khi hoàn thành
  proofPhotoUrl?: string; // Ảnh minh chứng kết quả công việc do nhân viên chụp
  photoSubmittedBy?: string; // Tên nhân viên đã chụp và gửi ảnh qua mobile app
  photoSubmittedAt?: string; // Thời gian nhân viên chụp/nộp ảnh minh chứng
}
