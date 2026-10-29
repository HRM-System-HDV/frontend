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
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Form";
import { apiGet, apiPost, apiPut, GatewayError, GATEWAY_URL } from "@/lib/api";
import type { Employee, Branch, Department } from "@/types";
import EmployeeSection from "@/features/employees/EmployeeList";
import DisableEmployeeDialog from "@/features/employees/EmployeeDisable";
import EmployeeDetailModal from "@/features/employees/EmployeeDetailModal";
import { useCurrentUser } from "@/context/AuthContext";

// Chuẩn hoá mã chi nhánh để so sánh (bỏ dấu gạch, không phân biệt hoa/thường).
const normalizeSlug = (value?: string | null) =>
  (value || "").toLowerCase().replace(/-/g, "");

// Chuẩn hoá bản ghi trả về từ DB (branchSlug -> branch) cho UI.
const normalizeEmployee = (e: any): Employee => ({
  ...e,
  branch: e?.branchSlug ?? e?.branch ?? "",
  department: e?.department || "",
  role: e?.role || "Nhân viên",
  systemRole: e?.systemRole || "staff",
  status: e?.status || "đang làm",
  phone: e?.phone || "",
  cccdFront: typeof e?.cccdFront === "string" ? e.cccdFront : "",
  cccdBack: typeof e?.cccdBack === "string" ? e.cccdBack : "",
  avatar: typeof e?.avatar === "string" ? e.avatar : "",
});

async function parseEnvelope(res: Response) {
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const err = (body as { error?: { code: string; message: string } } | null)?.error;
    throw new GatewayError(
      err?.code || `HTTP_${res.status}`,
      err?.message || `Lỗi hệ thống (${res.status})`,
      res.status
    );
  }
  if (body !== null && typeof body === "object" && "data" in body) {
    return (body as { data: unknown }).data;
  }
  return body;
}

async function apiDelete<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${GATEWAY_URL}${path}`, {
      method: "DELETE",
      credentials: "include",
      signal: controller.signal,
    });
    return (await parseEnvelope(res)) as T;
  } finally {
    clearTimeout(timer);
  }
}

interface CreateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: Partial<Employee>) => Promise<void>;
  isManager: boolean;
  managerBranch: string;
  branches: Branch[];
  departments: Department[];
}

function CreateEmployeeDialog({
  open,
  onClose,
  onSubmit,
  isManager,
  managerBranch,
  branches,
  departments,
}: CreateModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [branch, setBranch] = useState(managerBranch || "");
  const [department, setDepartment] = useState("Phòng Kinh Doanh");
  const [role, setRole] = useState("Nhân viên");
  const [systemRole, setSystemRole] = useState<"admin" | "manager" | "staff">("staff");
  const [salaryType, setSalaryType] = useState<"hourly" | "monthly">("monthly");
  const [baseSalary, setBaseSalary] = useState("8500000");
  const [hourlySalary, setHourlySalary] = useState("35000");
  const [bankName, setBankName] = useState("Vietcombank");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (open) {
      // Manager: cố định chi nhánh phụ trách. Admin: mặc định chi nhánh đầu tiên,
      // không tự gán cứng khi chưa có chi nhánh nào.
      setBranch(isManager ? managerBranch || "" : branches[0]?.slug || "");
      // Mặc định phòng ban đầu tiên từ API thay vì tên cứng.
      setDepartment((prev) =>
        departments.some((d) => d.name === prev)
          ? prev
          : departments[0]?.name || ""
      );
      setErrorMsg("");
    }
  }, [open, isManager, managerBranch, branches, departments]);

  const handleCreate = async () => {
    if (!name.trim()) {
      setErrorMsg("Vui lòng nhập họ và tên nhân viên");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Vui lòng nhập địa chỉ email hợp lệ");
      return;
    }
    const targetBranch = (isManager ? managerBranch : branch).trim().toUpperCase();
    if (!targetBranch) {
      setErrorMsg(
        branches.length === 0
          ? "Chưa có chi nhánh nào trên hệ thống. Vui lòng tạo chi nhánh trước khi thêm nhân sự."
          : "Vui lòng chọn chi nhánh cho nhân sự."
      );
      return;
    }
    if (!department) {
      setErrorMsg("Chưa có phòng ban nào. Vui lòng tạo phòng ban trước khi thêm nhân sự.");
      return;
    }
    try {
      setSubmitting(true);
      setErrorMsg("");
      await onSubmit({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        branch: targetBranch,
        department,
        role,
        systemRole,
        salaryType,
        baseSalary: Number(baseSalary) || 0,
        hourlySalary: Number(hourlySalary) || 0,
        bankName,
        bankAccountNumber: bankAccountNumber.trim(),
        status: "đang làm",
        joinDate: new Date().toLocaleDateString("vi-VN").replace(/\//g, "-"),
      });
      setName("");
      setPhone("");
      setEmail("");
      setPassword("");
      setBankAccountNumber("");
      onClose();
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Không thể tạo tài khoản nhân viên");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo tài khoản nhân viên mới"
      size="lg"
      footer={
        <>
          <Button variant="white" onClick={onClose} disabled={submitting}>
            Hủy
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              submitting ||
              (isManager ? !managerBranch : branches.length === 0)
            }
          >
            {submitting ? "Đang tạo..." : "Tạo"}
          </Button>
        </>
      }
    >
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          {errorMsg}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
        <Field label="Họ tên" required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Họ và tên nhân viên"
          />
        </Field>
        <Field label="SĐT" required>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0901 234 567"
          />
        </Field>
        <Field label="Email" required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nv@company.com"
          />
        </Field>
        <Field label="Mật khẩu" required>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu ban đầu"
          />
        </Field>
        <Field label="Gán chi nhánh" required>
          {isManager ? (
            managerBranch ? (
              <div className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-bold text-gray-800 flex items-center justify-between">
                <span>Chi nhánh {managerBranch.toUpperCase()}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-primary-50 text-primary border border-primary-200">
                  Cố định
                </span>
              </div>
            ) : (
              <div className="px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-700">
                Tài khoản của bạn chưa được gán chi nhánh phụ trách.
              </div>
            )
          ) : branches.length === 0 ? (
            <div className="px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-700">
              Chưa có chi nhánh nào. Vui lòng tạo chi nhánh trước.
            </div>
          ) : (
            <Select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </Select>
          )}
          {isManager && managerBranch && (
            <p className="text-[11px] text-gray-400 mt-1">
              Tài khoản Manager chỉ tạo nhân viên cho chi nhánh phụ trách
            </p>
          )}
        </Field>
        <Field label="Phòng ban" required>
          <Select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name} ({d.code})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Vai trò" required>
          <Select
            value={role}
            onChange={(e) => {
              const val = e.target.value;
              setRole(val);
              if (val === "Quản trị viên") setSystemRole("admin");
              else if (val === "Quản lý") setSystemRole("manager");
              else setSystemRole("staff");
            }}
          >
            <option value="Nhân viên">Nhân viên</option>
            <option value="Trưởng nhóm">Trưởng nhóm</option>
            <option value="Quản lý">Quản lý</option>
            <option value="Nhân sự">Nhân sự</option>
            <option value="Kế toán">Kế toán</option>
            <option value="Quản trị viên">Quản trị viên</option>
          </Select>
        </Field>
        <Field label="Hình thức tính lương" required>
          <Select
            value={salaryType}
            onChange={(e) => setSalaryType(e.target.value as "hourly" | "monthly")}
          >
            <option value="hourly">Lương theo giờ</option>
            <option value="monthly">Lương cơ bản tháng</option>
          </Select>
        </Field>
        <Field label="Mức lương (VNĐ/giờ hoặc VNĐ/tháng)" required>
          <Input
            type="number"
            value={salaryType === "monthly" ? baseSalary : hourlySalary}
            onChange={(e) => {
              if (salaryType === "monthly") setBaseSalary(e.target.value);
              else setHourlySalary(e.target.value);
            }}
            placeholder="Ví dụ: 35000 hoặc 8500000"
          />
        </Field>
        <Field label="Ngân hàng" required>
          <Select
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
          >
            <option value="Vietcombank">Vietcombank</option>
            <option value="VietinBank">VietinBank</option>
            <option value="BIDV">BIDV</option>
            <option value="Techcombank">Techcombank</option>
            <option value="MBBank">MBBank</option>
            <option value="Agribank">Agribank</option>
          </Select>
        </Field>
        <Field label="Số tài khoản (STK)" required className="md:col-span-2">
          <Input
            value={bankAccountNumber}
            onChange={(e) => setBankAccountNumber(e.target.value)}
            placeholder="Số tài khoản ngân hàng nhận lương"
          />
        </Field>
      </div>
    </Modal>
  );
}

export default function EmployeesPage() {
  const { role, branchSlug } = useCurrentUser();
  const isManager = role === "manager";

  const [rawEmployees, setRawEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "danger" } | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [lockTarget, setLockTarget] = useState<Employee | null>(null);
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
      const queryParam = isManager && branchSlug ? `?branchSlug=${encodeURIComponent(branchSlug.toUpperCase())}` : "";
      const [data, branchesData, departmentsData] = await Promise.all([
        apiGet<Employee[]>(`/api/employees${queryParam}`),
        apiGet<Branch[]>("/api/branches").catch(() => [] as Branch[]),
        apiGet<Department[]>("/api/departments").catch(() => [] as Department[]),
      ]);
      setBranches(branchesData || []);
      setDepartments(departmentsData || []);
      setRawEmployees((data || []).map(normalizeEmployee));
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Không thể tải danh sách nhân sự từ server";
      setError(msg);
      showToast(msg, "danger");
    } finally {
      setLoading(false);
    }
  }, [isManager, branchSlug]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Nếu là Manager, lọc thêm ở client để đảm bảo chuẩn an toàn hiển thị
  const filteredEmployees = isManager
    ? rawEmployees.filter((e) => normalizeSlug(e.branch) === normalizeSlug(branchSlug))
    : rawEmployees;

  const currentBranchName = branches.find(
    (b) => normalizeSlug(b.slug) === normalizeSlug(branchSlug)
  )?.name;

  const pageTitle = isManager
    ? `Nhân sự ${
        currentBranchName ||
        (branchSlug ? `Chi nhánh ${branchSlug.toUpperCase()}` : "Chi nhánh chưa xác định")
      }`
    : "Danh sách Nhân sự Toàn công ty";

  const handleCreateEmployee = async (payload: Partial<Employee>) => {
    const targetBranch = (payload.branch || (isManager ? branchSlug : ""))
      .trim()
      .toUpperCase();
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
      await apiPost<Employee>("/api/employees", {
        ...payload,
        branchSlug: targetBranch,
      });
      showToast("Tạo nhân viên mới thành công!", "success");
      await fetchEmployees();
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
      // Chỉ gửi các field nghiệp vụ; bỏ các field chỉ đọc (id, createdAt, updatedAt...).
      const saved = await apiPut<any>(`/api/employees/${encodeURIComponent(updated.id)}`, {
        name: updated.name,
        phone: updated.phone,
        email: updated.email,
        gender: updated.gender,
        birthDate: updated.birthDate,
        province: updated.province,
        ward: updated.ward,
        street: updated.street,
        branchSlug: updated.branch ? updated.branch.toUpperCase() : null,
        department: updated.department,
        role: updated.role,
        systemRole: updated.systemRole,
        status: updated.status,
        joinDate: updated.joinDate,
        salaryType: updated.salaryType,
        hourlySalary: updated.hourlySalary,
        baseSalary: updated.baseSalary,
        bankName: updated.bankName,
        bankAccountNumber: updated.bankAccountNumber,
        bankAccountName: updated.bankAccountName,
        cccd: updated.cccd,
        issueDate: updated.issueDate,
        issuePlace: updated.issuePlace,
        cccdFront: typeof updated.cccdFront === "string" ? updated.cccdFront : "",
        cccdBack: typeof updated.cccdBack === "string" ? updated.cccdBack : "",
        avatar: typeof updated.avatar === "string" ? updated.avatar : "",
      });

      const normalized = normalizeEmployee(saved || updated);
      setRawEmployees((prev) => prev.map((e) => (e.id === normalized.id ? normalized : e)));
      setSelectedEmployee(normalized);
      showToast("Cập nhật thông tin nhân viên thành công!", "success");
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
    setSelectedEmployee(e);
    setDetailOpen(true);
    try {
      const fresh = await apiGet<any>(`/api/employees/${encodeURIComponent(e.id)}`);
      setSelectedEmployee((prev) =>
        prev && prev.id === e.id ? normalizeEmployee(fresh) : prev
      );
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
      showToast(`Đã vô hiệu hóa nhân viên "${lockTarget.name}"`, "success");
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi vô hiệu hóa nhân viên";
      showToast(msg, "danger");
    } finally {
      setActionInProgress(false);
      setLockTarget(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setActionInProgress(true);
      await apiDelete(`/api/employees/${deleteTarget.id}`);
      setRawEmployees((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      showToast(`Đã xóa vĩnh viễn nhân viên "${deleteTarget.name}"`, "success");
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi xóa nhân viên";
      showToast(msg, "danger");
    } finally {
      setActionInProgress(false);
      setDeleteTarget(null);
    }
  };

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
        title={pageTitle}
        breadcrumb={[{ label: "HRM", href: "#" }, { label: "Nhân sự" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => setCreateOpen(true)} disabled={actionInProgress}>
              <FontAwesomeIcon icon={faPlus} fontSize={18} /> Thêm nhân viên mới
            </Button>
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
          onLock={setLockTarget}
          onDelete={setDeleteTarget}
          isManager={isManager}
          managerBranch={branchSlug.toUpperCase()}
        />
      )}

      <EmployeeDetailModal
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedEmployee(null);
        }}
        employee={selectedEmployee}
        branches={branches}
        departments={departments}
        onSave={handleSaveEmployee}
        onDelete={!isManager ? (emp) => {
          setDetailOpen(false);
          setSelectedEmployee(null);
          setDeleteTarget(emp);
        } : undefined}
        isManager={isManager}
        managerBranch={branchSlug.toUpperCase()}
      />

      <CreateEmployeeDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreateEmployee}
        isManager={isManager}
        managerBranch={branchSlug.toUpperCase()}
        branches={branches}
        departments={departments}
      />

      <DisableEmployeeDialog
        employee={lockTarget}
        onConfirm={handleConfirmDisable}
        onCancel={() => setLockTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa nhân viên"
        message={`Xóa vĩnh viễn "${deleteTarget?.name}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xác nhận xóa"
        tone="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
