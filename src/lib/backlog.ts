import { apiGet } from "./api";
export interface BacklogItem {
  id: string; userId: string | null; userName: string; userRole: string | null;
  action: string; module: string; entityType: string; entityId: string; targetName: string; createdAt: string;
}
// Nhật ký do các service ghi. Web chỉ được đọc qua Gateway.
export function fetchBacklogs(): Promise<BacklogItem[]> { return apiGet<BacklogItem[]>("/api/backlog"); }
