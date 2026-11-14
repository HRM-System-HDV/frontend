import type { AttendanceConfigState } from "./AttendanceForm";

// Cấu hình chấm công lưu theo chi nhánh: branchId "" = cấu hình mặc định toàn hệ
// thống (chỉ admin sửa được), khác "" = cấu hình riêng của chi nhánh đó.
export function configQuery(branchId: string) {
  return branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
}

// API -> form state; thiếu trường nào giữ giá trị cũ của form.
export function mapApiToConfig(c: any, prev: AttendanceConfigState): AttendanceConfigState {
  return {
    gracePeriod: String(c.gracePeriodMinutes ?? prev.gracePeriod),
    shiftSwapMode: c.shiftSwapMode ?? prev.shiftSwapMode,
    requireReasonSwap: c.requireReasonSwap ?? prev.requireReasonSwap,
    allowDoubleCheckin: c.allowDoubleCheckin ?? prev.allowDoubleCheckin,
    latePenaltyPct: String(c.latePenaltyPct ?? prev.latePenaltyPct),
    earlyLeavePenaltyPct: String(c.earlyLeavePenaltyPct ?? prev.earlyLeavePenaltyPct),
    earlyCheckinMinutes: String(c.earlyCheckinMinutes ?? prev.earlyCheckinMinutes),
    checkoutWindowMinutes: String(c.checkoutWindowMinutes ?? prev.checkoutWindowMinutes),
    doubleCheckinEarlyMinutes: String(c.doubleCheckinEarlyMinutes ?? prev.doubleCheckinEarlyMinutes),
    doubleCheckinLateMinutes: String(c.doubleCheckinLateMinutes ?? prev.doubleCheckinLateMinutes),
  };
}

// Form state -> payload gửi PUT (đúng danh sách trường BE chấp nhận).
export function mapConfigToApi(cfg: AttendanceConfigState) {
  const num = (v: string) => parseInt(v, 10) || 0;
  return {
    gracePeriodMinutes: num(cfg.gracePeriod),
    shiftSwapMode: cfg.shiftSwapMode,
    requireReasonSwap: cfg.requireReasonSwap,
    allowDoubleCheckin: cfg.allowDoubleCheckin,
    latePenaltyPct: num(cfg.latePenaltyPct),
    earlyLeavePenaltyPct: num(cfg.earlyLeavePenaltyPct),
    earlyCheckinMinutes: num(cfg.earlyCheckinMinutes),
    checkoutWindowMinutes: num(cfg.checkoutWindowMinutes),
    doubleCheckinEarlyMinutes: num(cfg.doubleCheckinEarlyMinutes),
    doubleCheckinLateMinutes: num(cfg.doubleCheckinLateMinutes),
  };
}
