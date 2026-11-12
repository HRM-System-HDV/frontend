import type { Payslip } from "@/types";
export const labels = { pending_confirmation: "Chờ xác nhận", confirmed: "Đã xác nhận", paid: "Đã thanh toán" };
export const money = (value: string) => `${BigInt(value).toLocaleString("vi-VN")} đ`;
export const validMoney = (value: string) => /^\d{1,15}$/.test(value);
export const canConfirm = (p: Payslip, role: string, branchId?: string | null) => p.status === "pending_confirmation" && (role === "admin" || (role === "manager" && !!branchId && p.branchId === branchId));
