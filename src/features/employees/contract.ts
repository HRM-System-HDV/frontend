import type { Employee, Department, Position, UserRole } from "@/types";
import { apiGet, apiPut } from "@/lib/api";
import { toInputDate } from "@/lib/utils";

export interface EmployeeAccount { id: string; employeeId: string | null; systemRole: UserRole }

export function normalizeEmployee(row: Employee, departments: Department[], positions: Position[], accounts: EmployeeAccount[] = []): Employee {
  const account = accounts.find(item => item.employeeId === row.id);
  return { ...row, phone: row.phone || "", branchId: row.branchId ?? null,
    department: departments.find(item => item.id === row.departmentId)?.name || "",
    role: positions.find(item => item.id === row.positionId)?.name || "",
    systemRole: account?.systemRole, accountId: account?.id,
    baseSalary: row.salaryType === "monthly" ? Number(row.salary) : 0,
    hourlySalary: row.salaryType === "hourly" ? Number(row.salary) : 0,
    cccdFront: row.cccdFront || "",
    cccdBack: row.cccdBack || "",
  };
}

// BE chỉ nhận ngày dạng YYYY-MM-DD; chuỗi hiển thị DD/MM/YYYY phải đổi qua trước khi gửi.
const DATE_FIELDS = ["birthDate", "issueDate", "joinDate", "resignedAt"] as const;
const DATE_LABELS: Record<(typeof DATE_FIELDS)[number], string> = {
  birthDate: "Ngày sinh",
  issueDate: "Ngày cấp CCCD",
  joinDate: "Ngày vào làm",
  resignedAt: "Ngày nghỉ việc",
};

// Chỉ các trường organization-service chấp nhận; tên hiển thị và quyền tài khoản không gửi chung.
export function employeePayload(row: Partial<Employee>, isAdmin: boolean, creating = false) {
  const salary = row.salary ?? String(row.salaryType === "hourly" ? row.hourlySalary ?? "" : row.baseSalary ?? "");
  if (!/^\d{1,15}$/.test(salary)) throw new Error("Mức lương phải là số nguyên VNĐ không âm, tối đa 15 chữ số.");
  if (row.salaryType === "monthly" && (!Number.isInteger(row.standardWorkDays) || Number(row.standardWorkDays) <= 0)) throw new Error("Vui lòng nhập số công thỏa thuận là số nguyên lớn hơn 0.");
  const fields = ["name", "phone", "gender", "province", "ward", "street", "bankName", "bankAccountNumber", "bankAccountName", "cccd", "issuePlace", "cccdFront", "cccdBack", "avatar"] as const;
  const payload: Record<string, unknown> = {};
  for (const key of fields) if (row[key] !== undefined) payload[key] = row[key];
  for (const key of DATE_FIELDS) if (row[key] !== undefined) {
    if (!row[key]) { payload[key] = null; continue; }
    const iso = toInputDate(row[key]);
    if (!iso) throw new Error(`${DATE_LABELS[key]} không hợp lệ — vui lòng nhập ngày theo định dạng DD/MM/YYYY.`);
    payload[key] = iso;
  }
  Object.assign(payload, { departmentId: row.departmentId || null, positionId: row.positionId || null,
    salaryType: row.salaryType, salary, standardWorkDays: row.salaryType === "monthly" ? row.standardWorkDays : null, status: row.status });
  if (isAdmin || creating) Object.assign(payload, { email: row.email, branchId: row.branchId || null });
  return payload;
}

// Hồ sơ đã được lưu trước khi cấp quyền. Trả lỗi riêng để không tạo trùng khi thử lại.
export async function assignEmployeeRole(employeeId: string, role: UserRole) {
  const accounts = await apiGet<EmployeeAccount[]>("/api/auth/users");
  const account = accounts.find(item => item.employeeId === employeeId);
  if (!account) throw new Error("Hồ sơ đã lưu nhưng chưa có tài khoản đồng bộ. Vui lòng thử cấp quyền lại sau.");
  if (account.systemRole !== role) return apiPut<EmployeeAccount>(`/api/auth/users/${encodeURIComponent(account.id)}`, { systemRole: role });
  return account;
}
