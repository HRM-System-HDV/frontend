import { describe, expect, it } from "vitest";
import { buildMenuItems, canAccessPath, normalizeRole } from "./permissions";
describe("Quyền điều hướng Web", () => {
    it("staff và vai trò không hợp lệ không có menu hay quyền truy cập", () => {
        for (const role of ["staff", "", "Trưởng phòng", "ADMIN"]) {
            expect(buildMenuItems(role)).toEqual([]);
            expect(canAccessPath(role, "/dashboard")).toBe(false);
            expect(canAccessPath(role, "/dashboard/payslips")).toBe(false);
        }
        expect(normalizeRole("Trưởng phòng")).toBe("staff");
    });
    it("manager được xem lương chi nhánh nhưng không vào quản trị", () => {
        expect(canAccessPath("manager", "/dashboard/payslips")).toBe(true);
        for (const path of ["/dashboard/bank", "/dashboard/accounts", "/dashboard/wifi", "/dashboard/backlog", "/dashboard/branches"]) expect(canAccessPath("manager", path)).toBe(false);
    });
    it("admin vào được ngân hàng, tài khoản và màn hình con hợp lệ", () => {
        expect(canAccessPath("admin", "/dashboard/bank")).toBe(true);
        expect(canAccessPath("admin", "/dashboard/accounts")).toBe(true);
        expect(canAccessPath("admin", "/dashboard/employees/11111111-1111-4111-8111-111111111111")).toBe(true);
        expect(canAccessPath("manager", "/dashboard/bank-extra")).toBe(false);
        expect(canAccessPath("admin", "/dashboard/unknown")).toBe(false);
    });
});

