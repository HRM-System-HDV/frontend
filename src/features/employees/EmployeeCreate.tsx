"use client";
import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Form";
import { getTodayVN } from "@/lib/utils";
import type { Employee, Branch, Department, Position } from "@/types";

interface CreateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: Partial<Employee>) => Promise<void>;
  isManager: boolean;
  /** Chỉ Admin được đổi quyền qua API tài khoản; hồ sơ mới mặc định Staff. */
  isAdmin: boolean;
  managerBranch: string;
  branches: Branch[];
  departments: Department[];
  positions: Position[];
  selectedFilterBranch?: string;
}

export default function CreateEmployeeDialog({
  open,
  onClose,
  onSubmit,
  isManager,
  isAdmin,
  managerBranch,
  branches,
  departments,
  positions,
  selectedFilterBranch = "all",
}: CreateModalProps) {
  const initialBranch = isManager
    ? (managerBranch || "")
    : (selectedFilterBranch && selectedFilterBranch !== "all" ? selectedFilterBranch : (branches[0]?.id || ""));
  const initialDept = departments[0]?.id || "";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");  const [branch, setBranch] = useState(initialBranch);
  const [department, setDepartment] = useState(initialDept);
  const [positionId, setPositionId] = useState("");
  const [systemRole, setSystemRole] = useState<"admin" | "manager" | "staff">("staff");
  const [salaryType, setSalaryType] = useState<"hourly" | "monthly">("monthly");
  const [baseSalary, setBaseSalary] = useState("8500000");
  const [hourlySalary, setHourlySalary] = useState("35000");
  const [standardWorkDays, setStandardWorkDays] = useState("");
  const [bankName, setBankName] = useState("Vietcombank");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) {
      setErrorMsg("Vui lòng nhập họ và tên nhân viên");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Vui lòng nhập địa chỉ email hợp lệ");
      return;
    }
    const targetBranch = (isManager ? managerBranch : branch).trim();
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
        branchId: targetBranch,
        departmentId: department,
        positionId: positionId || null,
        systemRole,
        salaryType,
        salary: salaryType === "monthly" ? baseSalary : hourlySalary,
        standardWorkDays: salaryType === "monthly" ? Number(standardWorkDays) : null,
        bankName,
        bankAccountNumber: bankAccountNumber.trim(),
        status: "đang làm",
        joinDate: getTodayVN(),
      });
      setName("");
      setPhone("");
      setEmail("");      setBankAccountNumber("");
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

        {isAdmin && (
          <Field label="Gán chi nhánh" required>
            {(() => {
              const isFilterLocked = !!selectedFilterBranch && selectedFilterBranch !== "all";
              const effectiveBranch = isFilterLocked ? selectedFilterBranch : branch;
              const matchedBranch = branches.find(
                (b) => (b.id || "") === (effectiveBranch || "")
              );
              const displayBranchName = matchedBranch ? matchedBranch.name : `Chi nhánh ${effectiveBranch}`;

              if (isFilterLocked) {
                return (
                  <div className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-bold text-gray-800 flex items-center justify-between">
                    <span>{displayBranchName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-primary-50 text-primary border border-primary-200">
                      Theo bộ lọc
                    </span>
                  </div>
                );
              }
              return null;
            })() || (branches.length === 0 ? (
              <div className="px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-700">
                Chưa có chi nhánh nào. Vui lòng tạo chi nhánh trước.
              </div>
            ) : (
              <Select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            ))}
          </Field>
        )}
        <Field label="Phòng ban" required>
          <Select
            value={department}
            onChange={(e) => { setDepartment(e.target.value); setPositionId(""); }}
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.departmentCode})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Vị trí / Chức vụ">
          <Select value={positionId} onChange={(e) => setPositionId(e.target.value)}>
            <option value="">— Chưa gán vị trí —</option>
            {positions.filter(p => !p.departmentId || p.departmentId === department).map(p => <option key={p.id} value={p.id}>{p.name} ({p.positionCode})</option>)}
          </Select>
        </Field>
        <Field label="Cấp vai trò hệ thống" required>
          <Select
            value={systemRole}
            onChange={(e) => setSystemRole(e.target.value as "admin" | "manager" | "staff")}
            disabled={!isAdmin}
          >
            <option value="staff">Nhân viên</option>
            <option value="manager">Quản lý Chi nhánh</option>
            <option value="admin">Quản trị viên</option>
          </Select>
          {!isAdmin && (
            <p className="text-[11px] text-gray-400 mt-1">
              Quản trị viên mới được cấp quyền hệ thống cho tài khoản
            </p>
          )}
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
        {salaryType === "monthly" && <Field label="Số công thỏa thuận" required>
          <Input type="number" value={standardWorkDays} onChange={e => setStandardWorkDays(e.target.value)} placeholder="Nhập số công thỏa thuận" />
        </Field>}
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
