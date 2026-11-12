export type { ShiftTemplate, Shift, ShiftRegistration, Attendance, AttendanceConfig } from "@/types";

export function dayValue(value?: string | null): string { return value?.slice(0, 10) || ""; }
export function employeeLabel(employee: { employeeCode: string; name: string }): string { return `${employee.employeeCode} · ${employee.name}`; }
export function templateLabel(template: { templateCode: string; name: string }): string { return `${template.templateCode} · ${template.name}`; }
export function displayDate(value?: string | null): string {
  const date = dayValue(value); return date ? date.split("-").reverse().join("/") : "—";
}
export function displayTimestamp(value?: string | null): string {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value)) : "—";
}
export function localTimestamp(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Ho_Chi_Minh" }).format(date);
  return parts.replace(" ", "T");
}
export function attendancePayload(checkIn: string, checkOut: string, penaltyNote: string) {
  if (!checkIn || !checkOut) throw new Error("Vui lòng chọn đủ giờ vào và giờ ra");
  const start = new Date(`${checkIn}:00+07:00`), end = new Date(`${checkOut}:00+07:00`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) throw new Error("Giờ ra phải từ giờ vào trở đi");
  if (start.getTime() > Date.now() || end.getTime() > Date.now()) throw new Error("Không thể chọn giờ chấm công trong tương lai");
  return { checkIn: start.toISOString(), checkOut: end.toISOString(), penaltyNote: penaltyNote.trim() };
}
export const inputClass = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none";
