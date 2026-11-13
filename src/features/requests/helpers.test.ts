import { describe, expect, it } from "vitest";
import { canReviewRequest } from "./helpers";
import type { RequestRecord } from "@/types";
const request: RequestRecord = { id: "r", type: "shift_swap", employeeId: "e", branchId: "branch-a", title: "Đổi ca", content: "Nhờ làm thay", status: "pending", shiftSwapMode: "mutual_acceptance", createdAt: "2026-11-13T00:00:00Z" };
describe("Request review permission", () => {
  it("leaves mutual acceptance to the target employee while allowing admin", () => { expect(canReviewRequest(request, "manager", "branch-a")).toBe(false); expect(canReviewRequest(request, "admin")).toBe(true); });
  it("restricts managers to pending forms in their branch", () => { const row = { ...request, type: "leave" as const }; expect(canReviewRequest(row, "manager", "branch-a")).toBe(true); expect(canReviewRequest(row, "manager", "branch-b")).toBe(false); expect(canReviewRequest({ ...row, status: "approved" }, "admin")).toBe(false); expect(canReviewRequest(row, "staff", "branch-a")).toBe(false); });
});
