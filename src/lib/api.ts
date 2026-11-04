// ============================================================
// API client dùng chung — gọi qua api-gateway duy nhất (:4000).
// Cả web và mobile dùng chung 1 cửa gateway, không gọi thẳng 4001-4005.
// ============================================================

export const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

export interface ApiErrorShape {
  code: string;
  message: string;
}

export class GatewayError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function parseEnvelope(res: Response) {
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const err = (body as { error?: ApiErrorShape } | null)?.error;
    // 401 trên bất kỳ API nào qua gateway = phiên không còn — đá về login kèm thông báo.
    if (res.status === 401 && err?.code === "UNAUTHORIZED") {
      markSessionExpiredAndRedirect();
    }
    throw new GatewayError(
      err?.code || `HTTP_${res.status}`,
      err?.message || `Lỗi hệ thống (${res.status})`,
      res.status
    );
  }
  if (body !== null && typeof body === "object" && "data" in body) {
    return (body as { data: unknown }).data;
  }
  return body;
}

/**
 * Tự động ghi nhật ký thao tác (Thêm / Sửa / Xóa) vào Backlog khi request API thành công.
 */
function autoLogBacklog(method: string, path: string, payload?: unknown) {
  if (typeof window === "undefined") return;
  if (path.startsWith("/api/backlog") || path.startsWith("/api/auth") || path === "/health") return;

  let module = "Hệ thống";
  let action: "CREATE" | "UPDATE" | "DELETE" = "UPDATE";
  let actionLabel = "Chỉnh sửa";
  let targetName = "Dữ liệu";

  if (method === "POST") {
    action = "CREATE";
    actionLabel = "Thêm mới";
  } else if (method === "DELETE") {
    action = "DELETE";
    actionLabel = "Xóa";
  } else if (method === "PUT") {
    action = "UPDATE";
    actionLabel = "Cập nhật";
  }

  const pObj = payload && typeof payload === "object" ? (payload as Record<string, any>) : {};

  if (path.includes("/shifts/templates") || path.includes("/shift-templates")) {
    module = "Khung ca mẫu";
    targetName = pObj.name ? `Khung ca ${pObj.name}` : "Khung ca mẫu";
  } else if (path.includes("/shifts/register") || path.includes("/shifts/registrations")) {
    module = "Đăng ký ca";
    targetName = "Nguyện vọng ca tuần";
  } else if (path.includes("/shifts")) {
    module = "Phân ca làm việc";
    targetName = pObj.template ? `Ca ${pObj.template}` : "Phân ca làm việc";
  } else if (path.includes("/attendance/config")) {
    module = "Cấu hình chấm công";
    targetName = "Cấu hình phạt & đổi ca";
    actionLabel = "Lưu cấu hình";
  } else if (path.includes("/attendance")) {
    module = "Chấm công";
    targetName = "Dữ liệu chấm công";
  } else if (path.includes("/tasks")) {
    module = "Giao việc & Nhiệm vụ";
    targetName = pObj.title ? `Nhiệm vụ: ${pObj.title}` : "Nhiệm vụ";
  } else if (path.includes("/employees")) {
    module = "Nhân sự";
    targetName = pObj.name ? `Nhân viên: ${pObj.name}` : "Hồ sơ nhân viên";
  } else if (path.includes("/branches")) {
    module = "Chi nhánh";
    targetName = pObj.name ? `Chi nhánh: ${pObj.name}` : "Chi nhánh";
  } else if (path.includes("/departments")) {
    module = "Phòng ban";
    targetName = pObj.name ? `Phòng ban: ${pObj.name}` : "Phòng ban";
  } else if (path.includes("/requests")) {
    module = "Phê duyệt yêu cầu";
    targetName = "Yêu cầu / Đơn từ";
    if (path.includes("/approve")) actionLabel = "Phê duyệt";
    else if (path.includes("/reject")) actionLabel = "Từ chối";
  } else if (path.includes("/news")) {
    module = "Bảng tin";
    targetName = pObj.title ? `Bản tin: ${pObj.title}` : "Bản tin";
  } else if (path.includes("/regulations")) {
    module = "Nội quy & Quy định";
    targetName = pObj.title ? `Quy định: ${pObj.title}` : "Quy định";
  } else if (path.includes("/wifi")) {
    module = "Cấu hình Wi-Fi";
    targetName = pObj.ssid ? `Wi-Fi: ${pObj.ssid}` : "Cấu hình Wi-Fi";
  } else if (path.includes("/payroll") || path.includes("/payslips")) {
    module = "Phiếu lương";
    targetName = "Bảng lương & Phiếu lương";
    if (path.includes("/generate")) actionLabel = "Tạo bảng lương";
  }

  let userName = "Người dùng";
  let userRole = "staff";
  try {
    const sessionRaw = localStorage.getItem("hrm_user_session") || sessionStorage.getItem("hrm_user_session");
    if (sessionRaw) {
      const sess = JSON.parse(sessionRaw);
      userName = sess.name || sess.username || userName;
      userRole = sess.role || userRole;
    }
  } catch {
    /* ignore */
  }

  fetch(`${GATEWAY_URL}/api/backlog`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      userName,
      userRole,
      action,
      actionLabel,
      module,
      targetName,
      description: `${actionLabel} đối tượng ${targetName}`,
    }),
  }).catch(() => {});
}

/**
 * Khi gateway trả 401 (hết phiên làm việc giữa chừng): đánh dấu cờ vào
 * sessionStorage để trang login hiển thị toast, rồi đá về /login giữ ?from=.
 */
export function markSessionExpiredAndRedirect() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem("hrm_session_expired", "1");
    const next = window.location.pathname + window.location.search;
    window.location.replace(`/login?from=${encodeURIComponent(next)}`);
  } catch {
    /* ignore */
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${GATEWAY_URL}${path}`, {
      credentials: "include",
      signal: controller.signal,
    });
    return (await parseEnvelope(res)) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function apiPost<T>(path: string, payload: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${GATEWAY_URL}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data = (await parseEnvelope(res)) as T;
    autoLogBacklog("POST", path, payload);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export async function apiPut<T>(path: string, payload?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${GATEWAY_URL}${path}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
      signal: controller.signal,
    });
    const data = (await parseEnvelope(res)) as T;
    autoLogBacklog("PUT", path, payload);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export async function apiDelete<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${GATEWAY_URL}${path}`, {
      method: "DELETE",
      credentials: "include",
      signal: controller.signal,
    });
    const data = (await parseEnvelope(res)) as T;
    autoLogBacklog("DELETE", path);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export interface PayoutPayload {
  idempotencyKey: string;
  debitAccount: string;
  content: string;
  totalAmount: number;
  beneficiaryCount: number;
}

/** Tạo lệnh chi REST qua gateway. Gửi 2 lần cùng idempotencyKey, lần 2 trả bản ghi cũ kèm deduped:true. */
export function createPayout(payload: PayoutPayload) {
  return apiPost("/api/payroll/payouts", payload);
}

/** Gọi SOAP ngân hàng qua gateway — đi/nhận nguyên vẹn XML, lỗi trả soap:Fault. */
export async function postSoapPayroll(xmlBody: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${GATEWAY_URL}/soap/payroll`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "text/xml; charset=utf-8" },
      body: xmlBody,
      signal: controller.signal,
    });
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export function gatewayHealth() {
  return apiGet<{ status: string; service: string; time: string }>("/health");
}
