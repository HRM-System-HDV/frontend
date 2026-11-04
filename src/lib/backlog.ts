import { apiGet, apiPost } from "./api";

export type BacklogAction = "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT";

export interface BacklogItem {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  action: BacklogAction;
  actionLabel: string;
  module: string;
  targetName: string;
  description?: string;
  createdAt?: string;
}

export interface BacklogQuery {
  action?: string;
  module?: string;
  search?: string;
}

export async function fetchBacklogs(query: BacklogQuery = {}): Promise<BacklogItem[]> {
  const params = new URLSearchParams();
  if (query.action && query.action !== "all") params.set("action", query.action);
  if (query.module && query.module !== "all") params.set("module", query.module);
  if (query.search) params.set("search", query.search);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await apiGet<BacklogItem[]>(`/api/backlog${qs}`);
  return Array.isArray(res) ? res : [];
}

export async function recordBacklog(entry: {
  action: BacklogAction;
  actionLabel: string;
  module: string;
  targetName: string;
  description?: string;
  userName?: string;
  userRole?: string;
}): Promise<void> {
  try {
    let resolvedUserName = entry.userName;
    let resolvedUserRole = entry.userRole;

    if (!resolvedUserName && typeof window !== "undefined") {
      try {
        const sessionRaw = localStorage.getItem("hrm_user_session") || sessionStorage.getItem("hrm_user_session");
        if (sessionRaw) {
          const sess = JSON.parse(sessionRaw);
          resolvedUserName = sess.name || sess.username;
          resolvedUserRole = sess.role;
        }
      } catch {
        /* ignore */
      }
    }

    await apiPost("/api/backlog", {
      userName: resolvedUserName || "Người dùng",
      userRole: resolvedUserRole || "staff",
      action: entry.action,
      actionLabel: entry.actionLabel,
      module: entry.module,
      targetName: entry.targetName,
      description: entry.description || "",
    });
  } catch (err) {
    // Không làm gián đoạn hành vi chính của người dùng nếu ghi log gặp lỗi
    console.warn("[Backlog] Ghi nhật ký thất bại:", err);
  }
}

export async function clearAllBacklogs(): Promise<void> {
  const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";
  await fetch(`${GATEWAY_URL}/api/backlog`, {
    method: "DELETE",
    credentials: "include",
  });
}

