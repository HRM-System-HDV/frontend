"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear, faPencil, faLock, faFileExcel } from "@fortawesome/free-solid-svg-icons";
import { useApiDetail, DetailLoadStatus } from "@/hooks/useApiDetail";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import type { Payslip, Branch } from "@/types";
import PayslipSection from "@/features/payslips/PayslipList";
import BulkClosePayslipModal from "@/features/payslips/PayslipClose";
import ExportPayslipModal from "@/features/payslips/PayslipExport";
import GeneratePayslipModal, { type GenerateInput } from "@/features/payslips/PayslipGenerate";
import AttendanceConfigModal, { type AttendanceConfigState } from "@/features/shifts/AttendanceForm";
import { configQuery, mapApiToConfig, mapConfigToApi } from "@/features/shifts/attendanceConfig";
import { EditPayslipModal, ConfirmClosePayslipDialog, PayslipDetailModal } from "@/features/payslips/PayslipEdit";
import { useCurrentUser } from "@/context/AuthContext";
import { useLocalStorageState } from "@/hooks/useLocalStorage";
import { apiGet, apiPost, apiPut, GatewayError } from "@/lib/api";

interface PayslipRow {
  id: string;
  employeeId: string;
  month: string;
  baseSalary: number;
  bonus: number;
  totalPenalty: number;
  netSalary: number;
  status: string;
  branchId: string | null;
  salaryType: "monthly" | "hourly";
  workedHours: number | string | null;
  workedShifts: number | null;
  penaltyOverride: number | string | null;
  issuedAt: string;
  adjustmentReason?: string | null;
}

interface EmployeeRow {
  id: string;
  name: string;
  // API /api/employees chỉ trả branchId (không có field branch)
  branchId?: string;
  status?: string;
}

// Kỳ lương mặc định theo định dạng BE yêu cầu: YYYY-MM (payroll-validator.js).
const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

function mapPayslip(r: PayslipRow, emp?: EmployeeRow): Payslip {
  return {
    id: r.id,
    employee: emp?.name || r.employeeId,
    branch: r.branchId || undefined,
    month: r.month,
    days: r.workedShifts,
    salaryType: r.salaryType,
    workedHours: r.workedHours == null ? null : Number(r.workedHours),
    penaltyOverride: r.penaltyOverride == null ? null : Number(r.penaltyOverride),
    salary: Number(r.baseSalary) || 0,
    bonus: Number(r.bonus) || 0,
    penalty: Number(r.totalPenalty) || 0,
    total: Number(r.netSalary) || 0,
    reason: r.adjustmentReason || undefined,
    status: (["confirmed", "paid"].includes(r.status) ? "đã chốt" : "chưa chốt") as Payslip["status"],
  };
}

export default function PayslipsPage() {
  const { role, branchId, name: currentUserName } = useCurrentUser();
  const isManager = role === "manager";
  // Ghi lương (tạo bảng công, chỉnh phiếu, chốt) là thao tác ngân hàng: gateway
  // chặn WRITE /api/payroll cho admin. Cấu hình chấm công vẫn thuộc manager.
  const isAdmin = role === "admin";
  const canWritePayroll = isAdmin;
  const canConfigureAttendance = role !== "staff";

  const [slips, setSlips] = useState<Payslip[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useLocalStorageState<string>("hrm_payslips_selected_month", "all");

  const [closeSlipOpen, setCloseSlipOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateSaving, setGenerateSaving] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  // Admin chọn cấu hình mặc định hệ thống ("") hoặc từng chi nhánh; manager bị ghim chi nhánh mình.
  const [attBranch, setAttBranch] = useState("");
  const effectiveAttBranch = isManager ? branchId || "" : attBranch;
  const [editSlipTarget, setEditSlipTarget] = useState<Payslip | null>(null);
  const [editBonusStr, setEditBonusStr] = useState("");
  const [editPenaltyStr, setEditPenaltyStr] = useState("");
  const [editReasonStr, setEditReasonStr] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const detail = useApiDetail();
  const [detailSlipTarget, setDetailSlipTarget] = useState<Payslip | null>(null);
  const [confirmCloseSlipTarget, setConfirmCloseSlipTarget] = useState<Payslip | null>(null);
  const [closingOne, setClosingOne] = useState(false);
  const [attConfigSaving, setAttConfigSaving] = useState(false);
  const [attConfig, setAttConfig] = useState<AttendanceConfigState>({
    gracePeriod: "5",
    shiftSwapMode: "manager_approval",
    requireReasonSwap: true,
    allowDoubleCheckin: true,
    latePenaltyPct: "10",
    earlyLeavePenaltyPct: "10",
    earlyCheckinMinutes: "15",
    checkoutWindowMinutes: "60",
    doubleCheckinEarlyMinutes: "0",
    doubleCheckinLateMinutes: "0",
  });

  const fetchConfig = useCallback(async () => {
    try {
      const c = await apiGet<any>(`/api/attendance/config${configQuery(effectiveAttBranch)}`);
      if (c) setAttConfig((prev) => mapApiToConfig(c, prev));
    } catch {
      // giữ mặc định, hiện lỗi qua toast của fetchData nếu cần
    }
  }, [effectiveAttBranch]);

  const fetchData = useCallback(async (month: string) => {
    try {
      setLoading(true);
      setError(null);
      const query = month !== "all" ? `?month=${encodeURIComponent(month)}` : "";
      const [rows, emps] = await Promise.all([
        apiGet<PayslipRow[]>(`/api/payroll/payslips${query}`),
        apiGet<EmployeeRow[]>("/api/employees"),
      ]);
      const nameById = new Map(emps.map((e) => [e.id, e] as const));
      setEmployees(emps);
      setSlips(
        (rows || []).map((r) => {
          const emp = nameById.get(r.employeeId);
          return mapPayslip(r, emp);
        })
      );
    } catch (e) {
      setError(e instanceof GatewayError ? e.message : "Lỗi tải phiếu lương");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData(selectedMonth);
  }, [selectedMonth, fetchData]);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  // Manager chỉ thấy phiếu của chi nhánh mình (lọc theo branch của employee).
  // Phiếu không xác định được chi nhánh thì không hiển thị cho manager.
  const visibleSlips = useMemo(() => {
    if (!isManager) return slips;
    const norm = (s: string) => s;
    return slips.filter((p) => p.branch && norm(p.branch) === norm(branchId));
  }, [slips, isManager, branchId]);

  // Danh sách chi nhánh để map branchId -> tên cho nhãn hiển thị (selector, Excel).
  useEffect(() => {
    let ignore = false;
    apiGet<Branch[]>("/api/branches")
      .then((d) => {
        if (!ignore) setBranches(d || []);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  const getBranchDisplayName = (branchId: string): string =>
    branches.find(
      (b) =>
        (b.id || "") ===
        branchId
    )?.name || branchId;

  const monthOptions = useMemo(
    () => Array.from(new Set(slips.map((s) => s.month))).sort().reverse(),
    [slips]
  );

  const pendingOfMonth = (month: string) =>
    slips.filter((s) => s.month === month && s.status === "chưa chốt");

  const handleSavePayslipEdit = async () => {
    if (!editSlipTarget || savingEdit) return;
    if (![editBonusStr, editPenaltyStr].every(value => /^\d{1,15}$/.test(value.trim()))) {
      alert("Thưởng và phạt phải là số nguyên VNĐ không âm, tối đa 15 chữ số.");
      return;
    }
    const bonusVal = Number(editBonusStr);
    const penaltyVal = Number(editPenaltyStr);
    if ((bonusVal > 0 || penaltyVal > 0) && !editReasonStr.trim()) {
      alert("Vui lòng nhập lý do điều chỉnh khi có tiền thưởng hoặc phạt!");
      return;
    }
    setSavingEdit(true);
    try {
      const updated = await apiPut<PayslipRow>(`/api/payroll/payslips/${editSlipTarget.id}`, {
        bonus: bonusVal,
        totalPenalty: penaltyVal,
        adjustmentReason: editReasonStr.trim() || null,
      });
      setSlips((prev) =>
        prev.map((s) =>
          s.id === editSlipTarget.id
            ? {
                ...s,
                bonus: Number(updated.bonus) || 0,
                salary: Number(updated.baseSalary) || 0,
                penalty: Number(updated.totalPenalty) || 0,
                total: Number(updated.netSalary) || 0,
                reason: updated.adjustmentReason || undefined,
              }
            : s
        )
      );
      setEditSlipTarget(null);
    } catch (e) {
      alert(e instanceof GatewayError ? e.message : "Lỗi điều chỉnh phiếu lương.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmCloseOne = async () => {
    if (!confirmCloseSlipTarget || closingOne) return;
    setClosingOne(true);
    try {
      await apiPost(`/api/payroll/payslips/${confirmCloseSlipTarget.id}/confirm`, {});
      setSlips((prev) => prev.map((s) => (s.id === confirmCloseSlipTarget.id ? { ...s, status: "đã chốt" as const } : s)));
      setConfirmCloseSlipTarget(null);
    } catch (e) {
      alert(e instanceof GatewayError ? e.message : "Lỗi chốt phiếu lương.");
    } finally {
      setClosingOne(false);
    }
  };

  const handleBulkClose = async (month: string) => {
    const targets = pendingOfMonth(month);
    if (targets.length === 0) {
      alert(`Kỳ ${month} không còn phiếu chưa chốt.`);
      return;
    }
    setBulkSaving(true);
    try {
      const results = await Promise.allSettled(
        targets.map((t) => apiPost(`/api/payroll/payslips/${t.id}/confirm`, {}))
      );
      const okCount = results.filter((r) => r.status === "fulfilled").length;
      await fetchData(selectedMonth);
      setCloseSlipOpen(false);
      alert(`Đã chốt ${okCount}/${targets.length} phiếu kỳ ${month}.`);
    } finally {
      setBulkSaving(false);
    }
  };

  const handleGenerate = async (input: GenerateInput) => {
    if (!input.employeeId) {
      setGenerateError("Vui lòng chọn nhân viên.");
      return;
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month.trim())) {
      setGenerateError("Kỳ lương phải đúng định dạng YYYY-MM (ví dụ 2026-10).");
      return;
    }
    setGenerateSaving(true);
    setGenerateError(null);
    try {
      if (input.employeeId === "all") {
        const activeEmployees = employees.filter((e) => e.status === "đang làm");
        if (activeEmployees.length === 0) {
          setGenerateError("Không có nhân viên nào để tạo phiếu lương.");
          return;
        }

        const results = await Promise.allSettled(
          activeEmployees.map((emp) =>
            apiPost("/api/payroll/payslips/generate", {
              employeeId: emp.id,
              month: input.month.trim(),
              bonus: input.bonus,
            })
          )
        );

        let createdCount = 0;
        let skippedCount = 0;
        const failedErrors: string[] = [];

        results.forEach((res) => {
          if (res.status === "fulfilled") {
            createdCount++;
          } else {
            const reason = res.reason;
            if (reason instanceof GatewayError && reason.code === "DUPLICATE_RESOURCE") {
              skippedCount++;
            } else {
              failedErrors.push(reason instanceof Error ? reason.message : "Lỗi không xác định");
            }
          }
        });

        if (createdCount === 0 && skippedCount > 0 && failedErrors.length === 0) {
          setGenerateError(`Toàn bộ nhân viên (${skippedCount}) đã có phiếu lương trong kỳ ${input.month}.`);
          return;
        }

        if (createdCount === 0 && failedErrors.length > 0) {
          setGenerateError(`Lỗi tạo phiếu lương: ${failedErrors[0]}`);
          return;
        }

        setGenerateOpen(false);
        await fetchData(selectedMonth);

        let msg = `Đã tạo ${createdCount} phiếu lương cho kỳ ${input.month}.`;
        if (skippedCount > 0) {
          msg += ` (Bỏ qua ${skippedCount} nhân viên đã có phiếu).`;
        }
        if (failedErrors.length > 0) {
          msg += ` (${failedErrors.length} nhân viên phát sinh lỗi).`;
        }
        alert(msg);
      } else {
        await apiPost("/api/payroll/payslips/generate", {
          employeeId: input.employeeId,
          month: input.month.trim(),
          bonus: input.bonus,
        });
        setGenerateOpen(false);
        await fetchData(selectedMonth);
        alert("Đã tạo phiếu lương tháng.");
      }
    } catch (e) {
      if (e instanceof GatewayError && e.code === "DUPLICATE_RESOURCE") {
        setGenerateError("Phiếu lương của nhân sự trong tháng đã tồn tại.");
      } else {
        setGenerateError(e instanceof GatewayError ? e.message : "Lỗi tạo phiếu lương.");
      }
    } finally {
      setGenerateSaving(false);
    }
  };

  return (
    <div>
      <DetailLoadStatus loading={detail.loading} error={detail.error} />
      <PageHeader
        breadcrumb={[{ label: "HRM", href: "#" }, { label: "Phiếu lương" }]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {canWritePayroll && (
              <>
                <Button
                  variant="white"
                  onClick={() => {
                    setGenerateError(null);
                    setGenerateOpen(true);
                  }}
                >
                  <FontAwesomeIcon icon={faPencil} fontSize={14} /> Tạo phiếu lương tháng
                </Button>
                <Button onClick={() => setCloseSlipOpen(true)}>
                  <FontAwesomeIcon icon={faLock} fontSize={14} /> Chốt phiếu lương
                </Button>
              </>
            )}
            <Button
              variant="white"
              onClick={() => setExportOpen(true)}
              className="flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200"
            >
              <FontAwesomeIcon icon={faFileExcel} className="text-emerald-600" fontSize={15} /> Xuất file
            </Button>
            {canConfigureAttendance && (
              <Button variant="white" onClick={() => setAttendanceOpen(true)}>
                <FontAwesomeIcon icon={faGear} fontSize={16} /> Cấu hình chấm công
              </Button>
            )}
          </div>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button variant="white" onClick={() => fetchData(selectedMonth)} className="text-xs shrink-0">
            Thử lại
          </Button>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse space-y-3">
          <div className="h-4 bg-gray-100 rounded w-1/3" />
          <div className="h-8 bg-gray-100 rounded w-full" />
          <div className="h-8 bg-gray-100 rounded w-full" />
          <div className="text-xs text-gray-500">Đang tải phiếu lương qua Gateway...</div>
        </div>
      ) : (
        <PayslipSection
          payslips={visibleSlips}
          onView={(p) => {
            void detail.loadDetail<PayslipRow>(`/api/payroll/payslips/${encodeURIComponent(p.id)}`, (row) => {
              const fresh = mapPayslip(row, employees.find((employee) => employee.id === row.employeeId));
              setSlips((items) => items.map((item) => item.id === fresh.id ? fresh : item));
              if (canWritePayroll && fresh.status !== "đã chốt") {
                setEditSlipTarget(fresh);
                setEditBonusStr(fresh.bonus ? String(fresh.bonus) : "");
                setEditPenaltyStr(fresh.penalty ? String(fresh.penalty) : "");
                setEditReasonStr(fresh.reason ?? "");
              } else {
                setDetailSlipTarget(fresh);
              }
            });
          }}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          monthOptions={monthOptions}
        />
      )}

      {closeSlipOpen && (
        <BulkClosePayslipModal
          key="bulk-close-modal"
          open={closeSlipOpen}
          onClose={() => setCloseSlipOpen(false)}
          defaultMonth={selectedMonth !== "all" ? selectedMonth : (monthOptions[0] ?? "")}
          months={monthOptions}
          pendingCount={pendingOfMonth(selectedMonth !== "all" ? selectedMonth : (monthOptions[0] ?? "")).length}
          saving={bulkSaving}
          onConfirm={handleBulkClose}
        />
      )}
      {generateOpen && (
        <GeneratePayslipModal
          key="generate-modal"
          open={generateOpen}
          onClose={() => {
            setGenerateOpen(false);
            setGenerateError(null);
          }}
          employees={employees.map((e) => ({
            id: e.id,
            name: e.name,
            status: e.status,
          }))}
          defaultMonth={selectedMonth !== "all" ? selectedMonth : currentPeriod()}
          saving={generateSaving}
          error={generateError}
          onConfirm={handleGenerate}
        />
      )}
      <AttendanceConfigModal
        open={attendanceOpen}
        onClose={() => setAttendanceOpen(false)}
        onSave={async () => {
          try {
            setAttConfigSaving(true);
            await apiPut(`/api/attendance/config${configQuery(effectiveAttBranch)}`, mapConfigToApi(attConfig));
            setAttendanceOpen(false);
          } catch {
            // ignore
          } finally {
            setAttConfigSaving(false);
          }
        }}
        saving={attConfigSaving}
        config={attConfig}
        setConfig={setAttConfig}
        configBranchId={effectiveAttBranch}
        onConfigBranchChange={setAttBranch}
        configBranchLocked={isManager}
        branchOptions={isManager ? branches.filter((b) => b.id === branchId) : branches}
      />

      <EditPayslipModal
        payslip={editSlipTarget}
        bonusStr={editBonusStr}
        penaltyStr={editPenaltyStr}
        reasonStr={editReasonStr}
        onBonusChange={setEditBonusStr}
        onPenaltyChange={setEditPenaltyStr}
        onReasonChange={setEditReasonStr}
        onClose={() => setEditSlipTarget(null)}
        onSave={handleSavePayslipEdit}
        onClosePayslip={
          canWritePayroll
            ? () => {
                const target = editSlipTarget;
                setEditSlipTarget(null);
                if (target) setConfirmCloseSlipTarget(target);
              }
            : undefined
        }
      />
      <ConfirmClosePayslipDialog
        payslip={confirmCloseSlipTarget}
        onConfirm={handleConfirmCloseOne}
        onCancel={() => setConfirmCloseSlipTarget(null)}
      />
      <PayslipDetailModal payslip={detailSlipTarget} onClose={() => setDetailSlipTarget(null)} />
      <ExportPayslipModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        payslips={visibleSlips}
        months={monthOptions}
        defaultMonth={selectedMonth}
        userName={currentUserName || "Quản trị viên"}
        branchLabel={getBranchDisplayName}
      />
    </div>
  );
}
