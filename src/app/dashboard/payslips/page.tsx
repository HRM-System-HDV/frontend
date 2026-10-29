"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import type { Payslip } from "@/types";
import PayslipSection from "@/features/payslips/PayslipList";
import BulkClosePayslipModal from "@/features/payslips/PayslipClose";
import GeneratePayslipModal, { type GenerateInput } from "@/features/payslips/PayslipGenerate";
import AttendanceConfigModal, { type AttendanceConfigState } from "@/features/shifts/AttendanceForm";
import { EditPayslipModal, ConfirmClosePayslipDialog, PrintPayslipModal } from "@/features/payslips/PayslipEdit";
import { useCurrentUser } from "@/context/AuthContext";
import { apiGet, apiPost, GATEWAY_URL, GatewayError } from "@/lib/api";

// api.ts dùng chung chưa có apiPut (quy tắc phân công: chỉ đọc, không sửa)
// nên đặt helper PUT cục bộ trong trang, giống tiền lệ trang employees của Agent 1.
async function apiPut<T>(path: string, payload: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${GATEWAY_URL}${path}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    if (!res.ok) {
      const err = (body as { error?: { code: string; message: string } } | null)?.error;
      throw new GatewayError(err?.code || `HTTP_${res.status}`, err?.message || `Lỗi hệ thống (${res.status})`, res.status);
    }
    if (body !== null && typeof body === "object" && "data" in body) {
      return (body as { data: T }).data;
    }
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

interface PayslipRow {
  id: string;
  employeeId: string;
  month: string;
  baseSalary: number;
  bonus: number;
  totalPenalty: number;
  netSalary: number;
  status: string;
  issuedAt: string;
}

interface EmployeeRow {
  id: string;
  name: string;
  branch: string;
}

export default function PayslipsPage() {
  const { role, branchSlug } = useCurrentUser();
  const isManager = role === "manager";

  const [slips, setSlips] = useState<Payslip[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("all");

  const [closeSlipOpen, setCloseSlipOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateSaving, setGenerateSaving] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [editSlipTarget, setEditSlipTarget] = useState<Payslip | null>(null);
  const [editBonusStr, setEditBonusStr] = useState("");
  const [editPenaltyStr, setEditPenaltyStr] = useState("");
  const [editReasonStr, setEditReasonStr] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [printSlipTarget, setPrintSlipTarget] = useState<Payslip | null>(null);
  const [confirmCloseSlipTarget, setConfirmCloseSlipTarget] = useState<Payslip | null>(null);
  const [closingOne, setClosingOne] = useState(false);
  const [attConfig, setAttConfig] = useState<AttendanceConfigState>({
    gracePeriod: "5",
    shiftSwapMode: "manager",
    requireReasonSwap: true,
    allowDoubleCheckin: true,
    latePenaltyPct: "10",
    earlyLeavePenaltyPct: "10",
    earlyCheckinMinutes: "15",
    maxPenaltiesPerMonth: "10 lần",
    deductOnCheckout: true,
    maxCheckinsPerDay: "3 lần",
    maxSwapsPerMonth: "3 lần",
  });

  const fetchConfig = useCallback(async () => {
    try {
      const c = await apiGet<any>("/api/attendance/config");
      if (c) {
        setAttConfig((prev) => ({
          ...prev,
          gracePeriod: String(c.gracePeriodMinutes ?? c.gracePeriod ?? prev.gracePeriod),
          shiftSwapMode: c.shiftSwapMode || prev.shiftSwapMode,
          requireReasonSwap: c.requireReasonSwap ?? prev.requireReasonSwap,
          allowDoubleCheckin: c.allowDoubleCheckin ?? prev.allowDoubleCheckin,
          latePenaltyPct: String(c.latePenaltyPct ?? prev.latePenaltyPct),
          earlyLeavePenaltyPct: String(c.earlyLeavePenaltyPct ?? prev.earlyLeavePenaltyPct),
          earlyCheckinMinutes: String(c.earlyCheckinMinutes ?? prev.earlyCheckinMinutes),
          maxPenaltiesPerMonth: c.maxPenaltiesPerMonth != null ? `${c.maxPenaltiesPerMonth} lần` : prev.maxPenaltiesPerMonth,
          deductOnCheckout: c.deductOnCheckout ?? prev.deductOnCheckout,
          maxCheckinsPerDay: c.maxCheckinsPerDay != null ? `${c.maxCheckinsPerDay} lần` : prev.maxCheckinsPerDay,
          maxSwapsPerMonth: c.maxSwapsPerMonth != null ? `${c.maxSwapsPerMonth} lần` : prev.maxSwapsPerMonth,
        }));
      }
    } catch {
      // giữ mặc định, hiện lỗi qua toast của fetchData nếu cần
    }
  }, []);

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
          return {
            id: r.id,
            employee: emp?.name || r.employeeId,
            branch: emp?.branch,
            month: r.month,
            days: 0,
            salary: Number(r.baseSalary) || 0,
            bonus: Number(r.bonus) || 0,
            penalty: Number(r.totalPenalty) || 0,
            total: Number(r.netSalary) || 0,
            status: (r.status === "đã chốt" ? "đã chốt" : "chưa chốt") as Payslip["status"],
          };
        })
      );
    } catch (e) {
      setError(e instanceof GatewayError ? e.message : "Lỗi tải phiếu lương");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedMonth);
  }, [fetchData, selectedMonth]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Manager chỉ thấy phiếu của chi nhánh mình (lọc theo branch của employee).
  const visibleSlips = useMemo(() => {
    if (!isManager) return slips;
    const norm = (s: string) => s.toLowerCase().replace("-", "");
    return slips.filter((p) => !p.branch || norm(p.branch) === norm(branchSlug));
  }, [slips, isManager, branchSlug]);

  const monthOptions = useMemo(
    () => Array.from(new Set(slips.map((s) => s.month))).sort().reverse(),
    [slips]
  );

  const pendingOfMonth = (month: string) =>
    slips.filter((s) => s.month === month && s.status === "chưa chốt");

  const handleSavePayslipEdit = async () => {
    if (!editSlipTarget || savingEdit) return;
    const bonusVal = Math.max(0, Number(editBonusStr) || 0);
    const penaltyVal = Math.max(0, Number(editPenaltyStr) || 0);
    if ((bonusVal > 0 || penaltyVal > 0) && !editReasonStr.trim()) {
      alert("Vui lòng nhập lý do điều chỉnh khi có tiền thưởng hoặc phạt!");
      return;
    }
    setSavingEdit(true);
    try {
      const updated = await apiPut<PayslipRow>(`/api/payroll/payslips/${editSlipTarget.id}`, {
        bonus: bonusVal,
        totalPenalty: penaltyVal,
      });
      setSlips((prev) =>
        prev.map((s) =>
          s.id === editSlipTarget.id
            ? {
                ...s,
                bonus: Number(updated.bonus) || 0,
                penalty: Number(updated.totalPenalty) || 0,
                total: Number(updated.netSalary) || 0,
                reason: editReasonStr.trim() || undefined,
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
      await apiPut(`/api/payroll/payslips/${confirmCloseSlipTarget.id}/status`, { status: "đã chốt" });
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
        targets.map((t) => apiPut(`/api/payroll/payslips/${t.id}/status`, { status: "đã chốt" }))
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
    if (!/^\d{2}-\d{4}$/.test(input.month.trim())) {
      setGenerateError("Kỳ lương phải đúng định dạng MM-YYYY (ví dụ 10-2026).");
      return;
    }
    setGenerateSaving(true);
    setGenerateError(null);
    try {
      await apiPost("/api/payroll/payslips/generate", {
        employeeId: input.employeeId,
        month: input.month.trim(),
        baseSalary: input.baseSalary,
        bonus: input.bonus,
        sumPenalty: input.sumPenalty,
      });
      setGenerateOpen(false);
      await fetchData(selectedMonth);
      alert("Đã tạo phiếu lương tháng.");
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
      <PageHeader
        title={isManager ? "Bảng lương Chi nhánh Hoàn Kiếm (HN-1)" : "Bảng lương & Chốt công Toàn công ty"}
        breadcrumb={[{ label: "HRM", href: "#" }, { label: "Phiếu lương" }]}
        actions={
          !isManager ? (
            <div className="flex items-center gap-2">
              <Button variant="white" onClick={() => setAttendanceOpen(true)}>
                <FontAwesomeIcon icon={faGear} fontSize={15} /> Cấu hình chấm công
              </Button>
            </div>
          ) : undefined
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
          onEdit={(p) => {
            setEditSlipTarget(p);
            setEditBonusStr(p.bonus ? String(p.bonus) : "");
            setEditPenaltyStr(p.penalty ? String(p.penalty) : "");
            setEditReasonStr(p.reason ?? "");
          }}
          onCloseOne={setConfirmCloseSlipTarget}
          onPrint={setPrintSlipTarget}
          onBulkClose={!isManager ? () => setCloseSlipOpen(true) : undefined}
          onGenerate={!isManager ? () => { setGenerateError(null); setGenerateOpen(true); } : undefined}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          monthOptions={monthOptions}
        />
      )}

      <BulkClosePayslipModal
        open={closeSlipOpen}
        onClose={() => setCloseSlipOpen(false)}
        defaultMonth={selectedMonth !== "all" ? selectedMonth : (monthOptions[0] ?? "")}
        months={monthOptions}
        pendingCount={pendingOfMonth(selectedMonth !== "all" ? selectedMonth : (monthOptions[0] ?? "")).length}
        saving={bulkSaving}
        onConfirm={handleBulkClose}
      />
      <GeneratePayslipModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        employees={employees.map((e) => ({ id: e.id, name: e.name }))}
        defaultMonth={selectedMonth !== "all" ? selectedMonth : "10-2026"}
        saving={generateSaving}
        error={generateError}
        onConfirm={handleGenerate}
      />
      <AttendanceConfigModal open={attendanceOpen} onClose={async () => {
        setAttendanceOpen(false);
        try {
          await apiPut("/api/attendance/config", {
            gracePeriodMinutes: parseInt(attConfig.gracePeriod, 10) || 5,
            shiftSwapMode: attConfig.shiftSwapMode,
            requireReasonSwap: attConfig.requireReasonSwap,
            allowDoubleCheckin: attConfig.allowDoubleCheckin,
            latePenaltyPct: parseInt(attConfig.latePenaltyPct, 10) || 0,
            earlyLeavePenaltyPct: parseInt(attConfig.earlyLeavePenaltyPct, 10) || 0,
            earlyCheckinMinutes: parseInt(attConfig.earlyCheckinMinutes, 10) || 0,
            maxPenaltiesPerMonth: parseInt(attConfig.maxPenaltiesPerMonth, 10) || 0,
            deductOnCheckout: attConfig.deductOnCheckout,
            maxCheckinsPerDay: parseInt(attConfig.maxCheckinsPerDay, 10) || 0,
            maxSwapsPerMonth: parseInt(attConfig.maxSwapsPerMonth, 10) || 0,
          });
        } catch {
          // ignore — giữ config local nếu API lỗi
        }
      }} config={attConfig} setConfig={setAttConfig} />

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
      />
      <ConfirmClosePayslipDialog
        payslip={confirmCloseSlipTarget}
        onConfirm={handleConfirmCloseOne}
        onCancel={() => setConfirmCloseSlipTarget(null)}
      />
      <PrintPayslipModal payslip={printSlipTarget} onClose={() => setPrintSlipTarget(null)} />
    </div>
  );
}
