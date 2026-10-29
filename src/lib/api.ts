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
    return (await parseEnvelope(res)) as T;
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
    return (await parseEnvelope(res)) as T;
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
