// Client Web dùng cookie HttpOnly qua Gateway; không ghi audit hoặc lưu token ở trình duyệt.
import type { Payout } from "@/types";
export const GATEWAY_URL = (process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000").replace(/\/$/, "");
export interface ApiErrorShape { code: string; message: string }
export class GatewayError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); this.name = "GatewayError"; }
}
let refreshInFlight: Promise<boolean> | null = null;
async function timedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, 10000);
  if (init.signal?.aborted) controller.abort();
  init.signal?.addEventListener("abort", abort, { once: true });
  try { return await fetch(`${GATEWAY_URL}${path}`, { ...init, credentials: "include", signal: controller.signal }); }
  catch (error) { throw new GatewayError(error instanceof Error && error.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR", error instanceof Error && error.name === "AbortError" ? "Yêu cầu quá thời gian chờ, vui lòng thử lại." : "Không kết nối được máy chủ. Vui lòng kiểm tra kết nối.", 0); }
  finally { clearTimeout(timer); init.signal?.removeEventListener("abort", abort); }
}
async function refresh(): Promise<boolean> {
  if (!refreshInFlight) refreshInFlight = timedFetch("/api/auth/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientPlatform: "web" }) }).then(res => res.ok).catch(() => false).finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}
async function gatewayFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await timedFetch(path, init);
  if (response.status !== 401 || /^\/api\/auth\/(login|refresh|forgot-password)(?:\?|$)/.test(path)) return response;
  return await refresh() ? timedFetch(path, init) : response;
}
export function markSessionExpiredAndRedirect() {
  if (typeof window === "undefined" || !window.location.pathname.startsWith("/dashboard")) return;
  try { sessionStorage.setItem("hrm_session_expired", "1"); window.location.replace(`/login?from=${encodeURIComponent(window.location.pathname + window.location.search)}`); } catch {}
}
async function parseEnvelope<T>(res: Response): Promise<T> {
  const raw = await res.text();
  let body: { data?: T; error?: ApiErrorShape } | null = null;
  try { body = raw ? JSON.parse(raw) : null; } catch { if (res.ok) throw new GatewayError("INVALID_RESPONSE", "Phản hồi máy chủ không hợp lệ.", res.status); }
  if (!res.ok) { if (res.status === 401) markSessionExpiredAndRedirect(); throw new GatewayError(body?.error?.code || `HTTP_${res.status}`, body?.error?.message || `Không xử lý được yêu cầu (${res.status}).`, res.status); }
  return (body && typeof body === "object" && "data" in body ? body.data : body) as T;
}
export async function apiGet<T>(path: string): Promise<T> { return parseEnvelope<T>(await gatewayFetch(path)); }
async function write<T>(method: string, path: string, payload?: unknown): Promise<T> {
  return parseEnvelope<T>(await gatewayFetch(path, { method, headers: { "Content-Type": "application/json" }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) }));
}
export const apiPost = <T,>(path: string, payload?: unknown) => write<T>("POST", path, payload);
export const apiPut = <T,>(path: string, payload?: unknown) => write<T>("PUT", path, payload);
export const apiDelete = <T,>(path: string) => write<T>("DELETE", path);
export interface PayoutPayload { idempotencyKey: string; payslipIds: string[]; debitAccountId?: string; debitAccount?: string; content?: string; totalAmount?: string | number; beneficiaryCount?: number }
export function createPayout(payload: PayoutPayload) { return apiPost<Payout>("/api/payroll/payouts", payload); }
export async function postSoapPayroll(xmlBody: string): Promise<string> {
  const res = await gatewayFetch("/soap/payroll", { method: "POST", headers: { "Content-Type": "text/xml; charset=utf-8" }, body: xmlBody });
  const text = await res.text();
  const xml = new DOMParser().parseFromString(text, "application/xml");
  const fault = xml.getElementsByTagNameNS("*", "Fault")[0];
  if (fault) throw new GatewayError("SOAP_FAULT", fault.getElementsByTagName("faultstring")[0]?.textContent || "Lệnh chi SOAP bị từ chối.", res.status);
  if (!res.ok) throw new GatewayError(`HTTP_${res.status}`, "Không thực hiện được lệnh chi SOAP.", res.status);
  if (xml.getElementsByTagName("parsererror").length) throw new GatewayError("INVALID_RESPONSE", "Phản hồi SOAP không hợp lệ.", res.status);
  return text;
}
export function gatewayHealth() { return apiGet<{ status: string; service: string; time: string }>("/health"); }
