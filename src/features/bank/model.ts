import type { Payslip } from "@/types";
import type { PayoutPayload } from "@/lib/api";
export const eligibleSlips = (slips: Payslip[]) => slips.filter(p => p.status === "confirmed" && !p.payoutId && !!p.confirmedBy && !!p.confirmedAt && BigInt(p.netSalary) >= BigInt(0));
export function payoutPayload(slips: Payslip[], debitAccountId: string, idempotencyKey: string, content: string): PayoutPayload {
    return { payslipIds: slips.map(p => p.id).sort(), debitAccountId, idempotencyKey, content, totalAmount: slips.reduce((sum, p) => sum + BigInt(p.netSalary), BigInt(0)).toString(), beneficiaryCount: new Set(slips.map(p => p.employeeId)).size };
}
export const escapeXml = (value: string = "") => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
export function payoutXml(payload: PayoutPayload, accountNumber: string) {
    return `<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><PayoutRequest><idempotencyKey>${escapeXml(payload.idempotencyKey)}</idempotencyKey><debitAccount>${escapeXml(accountNumber)}</debitAccount><content>${escapeXml(payload.content)}</content><totalAmount>${payload.totalAmount}</totalAmount><beneficiaryCount>${payload.beneficiaryCount}</beneficiaryCount>${payload.payslipIds.map(id => `<payslipId>${escapeXml(id)}</payslipId>`).join("")}</PayoutRequest></soap:Body></soap:Envelope>`;
}
