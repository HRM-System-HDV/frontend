import { apiGet } from "./api";

/**
 * Shape theo model `Backlog` của integration-service: thời điểm là `createdAt`
 * (serialized ISO), không có cột timestamp/actionLabel. `description` không có
 * trong schema nên luôn undefined — giữa cột "Chi tiết" cho dữ liệu tương lai.
 * Nguồn ghi thật duy nhất hiện nay là WorkService.saveAttendance
 * (backend/work-service/src/services/WorkService.js) với action
 * "attendance_saved" và module "work".
 */
export interface BacklogItem {
  id: string;
  userName: string;
  /** nullable trong schema: không lấy được vai trò thì BE để trống, không bịa. */
  userRole?: string | null;
  /** Mã hành động do service ghi; BE không khóa enum nên không khai union. */
  action: string;
  /** Mã phân hệ do service ghi (VD "work"). */
  module: string;
  targetName: string;
  description?: string;
  createdAt: string;
}

/**
 * `listBacklog` của integration-service trả nguyên bảng và bỏ mọi query params
 * (backend/integration-service/src/services/IntegrationService.js), nên ở đây
 * không dựng `?action=&module=&search=` như trước — bộ lọc nằm ở trang.
 */
export async function fetchBacklogs(): Promise<BacklogItem[]> {
  const res = await apiGet<BacklogItem[]>("/api/backlog");
  return Array.isArray(res) ? res : [];
}
