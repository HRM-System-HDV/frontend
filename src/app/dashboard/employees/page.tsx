"use client";

import { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTriangleExclamation,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { apiGet, apiPost, apiPut, GatewayError } from "@/lib/api";
import type { Employee, Branch, Department, Position } from "@/types";
import { normalizeEmployee, employeePayload, assignEmployeeRole, type EmployeeAccount } from "@/features/employees/contract";
import CreateEmployeeDialog from "@/features/employees/EmployeeCreate";
import EmployeeSection from "@/features/employees/EmployeeList";
import DisableEmployeeDialog from "@/features/employees/EmployeeDisable";
import EmployeeDeleteModal from "@/features/employees/EmployeeDeleteModal";
import EmployeeDetailModal from "@/features/employees/EmployeeDetailModal";
import ResetPasswordModal from "@/features/employees/PasswordReset";
import { useCurrentUser } from "@/context/AuthContext";
import { canAccessPath, NoAccessNotice } from "@/lib/permissions";
import { useLocalStorageState } from "@/hooks/useLocalStorage";

// ID chi nhánh được giữ nguyên như dữ liệu backend trả về.
const normalizeBranchId = (value?: string | null) =>
  (value || "");

export default function EmployeesPage() {
  const { role, branchId, user } = useCurrentUser();
  const userId = user?.userId;
  const email = user?.email;
  const isManager = role === "manager";
  // Quyền tài khoản, email và chuyển chi nhánh chỉ dành cho Admin.
  const isAdmin = role === "admin";
  // Ghi hồ sơ nhân sự (POST/PUT/DELETE /api/employees, reset mật khẩu) chỉ
  // manager + admin; nhân viên tự sửa hồ sơ của mình qua màn hình khác.
  const canWriteHr = role !== "staff";

  const [rawEmployees, setRawEmployees] = useState<Employee[]>([]);
  const [savedBranchFilter, setSavedBranchFilter] = useLocalStorageState<string>(
    "hrm_employees_branch_filter_by_id",
    "all"
  );
  const activeBranchFilter = isManager && branchId ? branchId : savedBranchFilter;
  const setActiveBranchFilter = useCallback(
    (b: string) => {
      if (!isManager) setSavedBranchFilter(b);
    },
    [isManager, setSavedBranchFilter]
  );
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [accounts, setAccounts] = useState<EmployeeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "danger" } | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [lockTarget, setLockTarget] = useState<Employee | null>(null);
  const [resetTarget, setResetTarget] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  const showToast = (text: string, tone: "success" | "danger" = "success") => {
    setToast({ text, tone });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParam = isManager && branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
      const [data, branchesData, departmentsData, positionsData, accountsData] = await Promise.all([
        apiGet<Employee[]>(`/api/employees${queryParam}`),
        apiGet<Branch[]>("/api/branches"),
        apiGet<Department[]>("/api/departments"),
        apiGet<Position[]>("/api/positions"),
        isAdmin ? apiGet<EmployeeAccount[]>("/api/auth/users") : Promise.resolve([]),
      ]);
      setBranches(branchesData || []);
      setDepartments(departmentsData || []);
      setPositions(positionsData); setAccounts(accountsData);
      setRawEmployees(data.map(row => normalizeEmployee(row, departmentsData, positionsData, accountsData)));
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Không thể tải danh sách nhân sự từ server";
      setError(msg);
      showToast(msg, "danger");
    } finally {
      setLoading(false);
    }
  }, [isManager, isAdmin, branchId]);

  useEffect(() => { void fetchEmployees(); }, [fetchEmployees]);

  // Nếu là Manager, lọc thêm ở client để đảm bảo chuẩn an toàn hiển thị
  const filteredEmployees = isManager
    ? rawEmployees.filter((e) => normalizeBranchId(e.branchId) === normalizeBranchId(branchId))
    : rawEmployees;

  const handleCreateEmployee = async (payload: Partial<Employee>) => {
    const targetBranch = (payload.branchId || (isManager ? branchId : ""))
      .trim();
    if (!targetBranch) {
      const msg =
        branches.length === 0
          ? "Chưa có chi nhánh nào trên hệ thống. Vui lòng tạo chi nhánh trước khi thêm nhân sự."
          : "Vui lòng chọn chi nhánh cho nhân sự";
      showToast(msg, "danger");
      throw new Error(msg);
    }
    try {
      setActionInProgress(true);
      const created = await apiPost<Employee>("/api/employees", employeePayload({ ...payload, branchId: targetBranch }, isAdmin, true));
      let roleError = "";
      if (isAdmin && payload.systemRole && payload.systemRole !== "staff") {
        try { await assignEmployeeRole(created.id, payload.systemRole); }
        catch (error) { roleError = error instanceof Error ? error.message : "Không cấp được quyền tài khoản"; }
      }
      await fetchEmployees();
      showToast(roleError ? `Đã tạo hồ sơ. Chưa cấp được quyền: ${roleError}` : "Tạo nhân viên mới thành công!", roleError ? "danger" : "success");
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi tạo nhân viên";
      showToast(msg, "danger");
      throw e;
    } finally {
      setActionInProgress(false);
    }
  };

  const handleSaveEmployee = async (updated: Employee): Promise<Employee> => {
    try {
      setActionInProgress(true);
      const saved = await apiPut<Employee>(`/api/employees/${encodeURIComponent(updated.id)}`, employeePayload(updated, isAdmin));
      let currentAccounts = accounts;
      let roleError = "";
      if (isAdmin && updated.systemRole && updated.systemRole !== accounts.find(a => a.employeeId === updated.id)?.systemRole) {
        try {
          const account = await assignEmployeeRole(updated.id, updated.systemRole);
          currentAccounts = [...accounts.filter(a => a.employeeId !== updated.id), account];
          setAccounts(currentAccounts);
        } catch (error) { roleError = error instanceof Error ? error.message : "Không đổi được quyền tài khoản"; }
      }
      const normalized = normalizeEmployee(saved, departments, positions, currentAccounts);
      setRawEmployees((prev) => prev.map((e) => (e.id === normalized.id ? normalized : e)));
      setSelectedEmployee(normalized);
      showToast(roleError ? `Đã lưu hồ sơ. Chưa đổi được quyền: ${roleError}` : "Cập nhật thông tin nhân viên thành công!", roleError ? "danger" : "success");
      return normalized;
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi cập nhật nhân viên";
      showToast(msg, "danger");
      // Ném lại để modal giữ chế độ chỉnh sửa và hiển thị lỗi.
      throw e;
    } finally {
      setActionInProgress(false);
    }
  };

  // Lấy bản ghi mới nhất từ DB mỗi lần mở hồ sơ, không dùng dữ liệu danh sách cũ.
  const handleOpenDetail = async (e: Employee) => {
    try {
      const [fresh, currentAccounts] = await Promise.all([
        apiGet<Employee>(`/api/employees/${encodeURIComponent(e.id)}`),
        isAdmin ? apiGet<EmployeeAccount[]>("/api/auth/users") : Promise.resolve(accounts),
      ]);
      setAccounts(currentAccounts);
      setSelectedEmployee(normalizeEmployee(fresh, departments, positions, currentAccounts));
      setDetailOpen(true);
    } catch (err: any) {
      const msg =
        err instanceof GatewayError ? err.message : err?.message || "Không thể tải hồ sơ nhân viên từ server";
      showToast(msg, "danger");
    }
  };

  const handleConfirmDisable = async () => {
    if (!lockTarget) return;
    try {
      setActionInProgress(true);
      await apiPut(`/api/employees/${lockTarget.id}`, { status: "vô hiệu hóa" });
      setRawEmployees((prev) =>
        prev.map((e) =>
          e.id === lockTarget.id ? { ...e, status: "vô hiệu hóa" as const } : e
        )
      );
      // Đồng bộ lại danh sách từ server (số liệu tổng đã bị backend tính lại).
      await fetchEmployees();
      showToast(`Đã vô hiệu hóa nhân viên "${lockTarget.name}"`, "success");
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi vô hiệu hóa nhân viên";
      showToast(msg, "danger");
    } finally {
      setActionInProgress(false);
      setLockTarget(null);
    }
  };

  if (!canAccessPath(role, "/dashboard/employees")) {
    return <NoAccessNotice description="Trang nhân sự chỉ dành cho Quản trị viên và Quản lý Chi nhánh." />;
  }

  return (
    <div className="space-y-4">
      {/* Toast thông báo nổi */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all ${
            toast.tone === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <FontAwesomeIcon
            icon={toast.tone === "success" ? faCircleCheck : faTriangleExclamation}
            className="text-base"
          />
          <span>{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      <PageHeader
        breadcrumb={[{ label: "HRM", href: "#" }, { label: "Nhân sự" }]}
        actions={
          <div className="flex items-center gap-2">
            {canWriteHr && (
              <Button onClick={() => setCreateOpen(true)} disabled={actionInProgress}>
                <FontAwesomeIcon icon={faPlus} fontSize={18} /> Thêm nhân viên mới
              </Button>
            )}
          </div>
        }
      />

      {/* Hiển thị lỗi fetch nếu có */}
      {error && !loading && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50/80 flex items-center justify-between text-sm text-red-700">
          <div className="flex items-center gap-2.5">
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500 text-base" />
            <span>{error}</span>
          </div>
          <Button variant="white" size="sm" onClick={fetchEmployees}>
            Thử lại
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-9 w-64 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="space-y-3 pt-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-100/80 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <EmployeeSection
          employees={filteredEmployees}
          branches={branches}
          departments={departments}
          onOpenDetail={handleOpenDetail}
          isManager={isManager}
          managerBranch={branchId}
        />
      )}

      {detailOpen && selectedEmployee && (
        <EmployeeDetailModal
          key={selectedEmployee.id}
          open={detailOpen}
          onClose={() => {
            setDetailOpen(false);
            setSelectedEmployee(null);
          }}
          employee={selectedEmployee}
          branches={branches}
          departments={departments}
          onSave={handleSaveEmployee}
          positions={positions}
          onDelete={canWriteHr ? (emp) => {
            setDetailOpen(false);
            setSelectedEmployee(null);
            setDeleteTarget(emp);
          } : undefined}
          onLock={canWriteHr ? (emp) => {
            setDetailOpen(false);
            setSelectedEmployee(null);
            setLockTarget(emp);
          } : undefined}
          onResetPassword={isAdmin ? (emp) => setResetTarget(emp) : undefined}
          isManager={isManager}
          managerBranch={branchId}
        />
      )}

      {createOpen && (
        <CreateEmployeeDialog
          key={createOpen ? "create-open" : "create-closed"}
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreateEmployee}
          isManager={isManager}
          isAdmin={isAdmin}
          managerBranch={branchId}
          selectedFilterBranch={activeBranchFilter}
          branches={branches}
          departments={departments}
          positions={positions}
        />
      )}

      <DisableEmployeeDialog
        employee={lockTarget}
        onConfirm={handleConfirmDisable}
        onCancel={() => setLockTarget(null)}
      />

      <ResetPasswordModal employee={resetTarget} onClose={() => setResetTarget(null)} />

      <EmployeeDeleteModal
        key={deleteTarget?.id || "none"}
        open={!!deleteTarget}
        employee={deleteTarget}
        branches={branches}
        departments={departments}
        currentUserId={userId}
        currentUserEmail={email}
        onClose={() => setDeleteTarget(null)}
        onDeleted={(emp) => {
          setRawEmployees((prev) => prev.map(e => e.id === emp.id ? normalizeEmployee(emp, departments, positions, accounts) : e));
          showToast(`Đã ghi nhận nhân viên "${emp.name}" nghỉ việc`, "success");
          setDeleteTarget(null);
          // Đồng bộ lại danh sách từ server.
          fetchEmployees();
        }}
      />
    </div>
  );
}
