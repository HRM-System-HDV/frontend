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

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Access token chỉ sống 15 phút; phiên dài hạn nằm ở cookie refresh (httpOnly,
 * JS không đọc được). Nhiều request 401 cùng lúc chỉ được đổi token MỘT lần,
 * nếu không mỗi tab/lỗi sẽ đốt thêm một vòng xoay vòng refresh token.
 * Trang login cũng phải đi qua cửa này: tự gọi /api/auth/refresh ở nơi khác sẽ
 * làm lộ vòng xoay vòng và giết luôn phiên đang còn tốt.
 */
export function refreshSession(): Promise<boolean> {
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
  const refreshed = await refreshSession();
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
    window.location.replace(`/login?expired=1&from=${encodeURIComponent(next)}`);
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

export async function apiDownload(path: string): Promise<Blob> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await gatewayFetch(path, { credentials: "include", signal: controller.signal });
    if (!res.ok) await parseEnvelope(res);
    return await res.blob();
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
    const data = (await parseEnvelope(res)) as T;    return data;
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
    const data = (await parseEnvelope(res)) as T;    return data;
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
    const data = (await parseEnvelope(res)) as T;    return data;
  } finally {
    clearTimeout(timer);
  }
}

export interface PayoutPayload {
  idempotencyKey: string;
  /** BE bắt buộc >= 1 payslipId UUID, chỉ nhận phiếu confirmed chưa có payoutId. */
  payslipIds: string[];
  debitAccount: string;
  content: string;
  totalAmount: number;
  /** Số employeeId duy nhất trong payslipIds — BE đối chiếu, gửi sai là 400. */
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
