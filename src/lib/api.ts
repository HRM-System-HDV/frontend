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

  let moduleName = "Hệ thống";
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

  const pObj = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const getString = (key: string): string | undefined => {
    const val = pObj[key];
    return typeof val === "string" && val.trim() ? val : undefined;
  };

  const nameVal = getString("name");
  const titleVal = getString("title");
  const templateVal = getString("template");
  const ssidVal = getString("ssid");

  if (path.startsWith("/api/archive")) {
    moduleName = "Lưu trữ";
    targetName = "Dữ liệu cũ";
    if (path.includes("/restore")) {
      actionLabel = "Khôi phục";
      targetName = "Bản ghi lưu trữ";
    } else if (path.includes("/run")) {
      actionLabel = "Thực hiện lưu trữ";
    }
  } else if (path.includes("/shifts/templates") || path.includes("/shift-templates")) {
    moduleName = "Khung ca mẫu";
    targetName = nameVal ? `Khung ca ${nameVal}` : "Khung ca mẫu";
  } else if (path.includes("/shifts/register") || path.includes("/shifts/registrations")) {
    moduleName = "Đăng ký ca";
    targetName = "Đăng ký ca tuần";
  } else if (path.includes("/shifts")) {
    moduleName = "Phân ca làm việc";
    targetName = templateVal ? `Ca ${templateVal}` : "Phân ca làm việc";
  } else if (path.includes("/attendance/config")) {
    moduleName = "Cấu hình chấm công";
    targetName = "Cấu hình phạt & đổi ca";
    actionLabel = "Lưu cấu hình";
  } else if (path.includes("/attendance")) {
    moduleName = "Chấm công";
    targetName = "Dữ liệu chấm công";
  } else if (path.includes("/tasks")) {
    moduleName = "Giao việc & Nhiệm vụ";
    targetName = titleVal ? `Nhiệm vụ: ${titleVal}` : "Nhiệm vụ";
  } else if (path.includes("/employees")) {
    moduleName = "Nhân sự";
    targetName = nameVal ? `Nhân viên: ${nameVal}` : "Hồ sơ nhân viên";
  } else if (path.includes("/branches")) {
    moduleName = "Chi nhánh";
    targetName = nameVal ? `Chi nhánh: ${nameVal}` : "Chi nhánh";
  } else if (path.includes("/departments")) {
    moduleName = "Phòng ban";
    targetName = nameVal ? `Phòng ban: ${nameVal}` : "Phòng ban";
  } else if (path.includes("/requests")) {
    moduleName = "Phê duyệt yêu cầu";
    targetName = "Yêu cầu / Đơn từ";
    if (path.includes("/approve")) actionLabel = "Phê duyệt";
    else if (path.includes("/reject")) actionLabel = "Từ chối";
  } else if (path.includes("/news")) {
    moduleName = "Bảng tin";
    targetName = titleVal ? `Bản tin: ${titleVal}` : "Bản tin";
  } else if (path.includes("/regulations")) {
    moduleName = "Nội quy & Quy định";
    targetName = titleVal ? `Quy định: ${titleVal}` : "Quy định";
  } else if (path.includes("/wifi")) {
    moduleName = "Cấu hình Wi-Fi";
    targetName = ssidVal ? `Wi-Fi: ${ssidVal}` : "Cấu hình Wi-Fi";
  } else if (path.includes("/payroll") || path.includes("/payslips")) {
    moduleName = "Phiếu lương";
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
      module: moduleName,
      targetName,
      description: `${actionLabel} đối tượng ${targetName}`,
    }),
  }).catch(() => {});
}

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Access token chỉ sống 15 phút; phiên dài hạn nằm ở cookie refresh (httpOnly,
 * JS không đọc được). Nhiều request 401 cùng lúc chỉ được đổi token MỘT lần,
 * nếu không mỗi tab/lỗi sẽ đốt thêm một vòng xoay vòng refresh token.
 */
async function tryRefreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${GATEWAY_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/** fetch qua gateway, tự thử lại đúng một lần sau khi cấp lại token. */
async function gatewayFetch(path: string, init: RequestInit): Promise<Response> {
  const res = await fetch(`${GATEWAY_URL}${path}`, init);
  // /api/auth/* trả 401 là kết quả đăng nhập sai, không phải phiên hết hạn.
  if (res.status !== 401 || path.startsWith("/api/auth/")) return res;
  const refreshed = await tryRefreshSession();
  if (!refreshed) return res;
  return fetch(`${GATEWAY_URL}${path}`, init);
}

/**
 * Khi gateway trả 401 (hết phiên làm việc giữa chừng): đánh dấu cờ vào
 * sessionStorage để trang login hiển thị toast, rồi đá về /login giữ ?from=.
 */
export function markSessionExpiredAndRedirect() {  if (typeof window === "undefined") return;
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
    const res = await gatewayFetch(path, {
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
    const res = await gatewayFetch(path, {
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
    const res = await gatewayFetch(path, {
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
    const res = await gatewayFetch(path, {
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
    const res = await gatewayFetch("/soap/payroll", {
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
