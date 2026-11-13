import type { RequestRecord, RequestType } from "@/types";
export const requestLabels: Record<RequestType, string> = { leave: "Nghỉ phép", advance: "Tạm ứng", shift_swap: "Đổi ca / Nhờ làm thay", work_supplement: "Bổ sung công" };
export const requestStatus = { pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Từ chối" };
export function canReviewRequest(row: RequestRecord, role: string, branchId?: string | null) {
  return row.status === "pending" && (role === "admin" || role === "manager" && !!branchId && row.branchId === branchId && !(row.type === "shift_swap" && row.shiftSwapMode === "mutual_acceptance"));
}
