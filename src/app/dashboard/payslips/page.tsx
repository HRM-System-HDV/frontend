"use client";
import { useCallback, useEffect, useState } from "react";
import type { Payslip } from "@/types";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { useCurrentUser } from "@/context/AuthContext";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Input } from "@/components/ui/Form";
import PayslipList from "@/features/payslips/PayslipList";
import GeneratePayslip, { type GenerateInput } from "@/features/payslips/PayslipGenerate";
import PayslipDetail from "@/features/payslips/PayslipEdit";
import { canConfirm, validMoney } from "@/features/payslips/model";
import { exportPayslipsToExcel } from "@/features/payslips/PayslipExport";
export default function PayslipsPage() {
    const { role, branchId } = useCurrentUser();
    const [slips, setSlips] = useState<Payslip[]>([]);
    const [employees, setEmployees] = useState<{
        id: string;
        name: string;
    }[]>([]);
    const [month, setMonth] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [generate, setGenerate] = useState(false);
    const [saving, setSaving] = useState(false);
    const [target, setTarget] = useState<Payslip | null>(null);
    const [confirmation, setConfirmation] = useState<Payslip | null>(null);
    const load = useCallback(async () => { try {
        const [rows, emps] = await Promise.all([apiGet<Payslip[]>(`/api/payroll/payslips${month ? `?month=${encodeURIComponent(month)}` : ""}`), apiGet<{
                id: string;
                name: string;
            }[]>("/api/employees")]);
        setSlips(rows);
        setEmployees(emps);
        setError("");
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Không tải được phiếu.");
    }
    finally {
        setLoading(false);
    } }, [month]);
    // Đồng bộ dữ liệu bên ngoài; các state được cập nhật sau yêu cầu HTTP.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void load(); }, [load]);
    async function create(input: GenerateInput) { if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month) || !validMoney(input.bonus)) {
        setError("Kỳ lương hoặc tiền thưởng không hợp lệ.");
        return;
    } setSaving(true); try {
        await apiPost("/api/payroll/payslips/generate", input);
        setGenerate(false);
        await load();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Không thể tạo phiếu.");
    }
    finally {
        setSaving(false);
    } }
    async function confirmSlip() { if (!confirmation || !canConfirm(confirmation, role, branchId))
        return; setSaving(true); try {
        await apiPost(`/api/payroll/payslips/${confirmation.id}/confirm`, {});
        setConfirmation(null);
        await load();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Không thể xác nhận.");
    }
    finally {
        setSaving(false);
    } }
    const visible = role === "manager" ? slips.filter(p => !!branchId && p.branchId === branchId) : slips;
    async function exportFile() {
        try { await exportPayslipsToExcel(visible, { names: new Map(employees.map(e => [e.id, e.name])) }); }
        catch (e) { setError(e instanceof Error ? e.message : "Không xuất được bảng lương."); }
    }
    return <div><PageHeader breadcrumb={[{ label: "HRM" }, { label: "Phiếu lương" }]} actions={role === "admin" ? <Button onClick={() => { setError(""); setGenerate(true); }}>Tạo phiếu lương tháng</Button> : undefined}/><div className="flex gap-3 mb-4"><Input type="month" aria-label="Lọc kỳ lương" value={month} onChange={e => setMonth(e.target.value)}/><Button variant="white" onClick={() => void load()} disabled={loading}>Làm mới</Button><Button variant="white" disabled={loading || !visible.length} onClick={exportFile}>Xuất Excel</Button></div>{error && <p role="alert" className="text-red-700 mb-4">{error}</p>}{loading && <p>Đang tải...</p>}
    <PayslipList slips={visible} names={new Map(employees.map(e => [e.id, e.name]))} onView={setTarget} onConfirm={role === "admin" || role === "manager" ? p => { if (canConfirm(p, role, branchId))
        setConfirmation(p); } : undefined}/>
    {generate && role === "admin" && <GeneratePayslip employees={employees} month={month || new Date().toISOString().slice(0, 7)} saving={saving} error={error} onClose={() => setGenerate(false)} onSave={create}/>}
    {target && <PayslipDetail key={target.id} slip={target} editable={role === "admin" && target.status === "pending_confirmation"} onClose={() => setTarget(null)} onSave={async (bonus) => { await apiPut(`/api/payroll/payslips/${target.id}`, { bonus }); await load(); }}/>}
    <Modal open={!!confirmation} onClose={() => setConfirmation(null)} title="Xác nhận phiếu lương" footer={<><Button variant="white" disabled={saving} onClick={() => setConfirmation(null)}>Hủy</Button><Button disabled={saving} onClick={confirmSlip}>Xác nhận</Button></>}><p>Phiếu giữ nguyên kết quả sau xác nhận và đủ điều kiện chi lương.</p>{error && <p role="alert" className="text-red-700">{error}</p>}</Modal></div>;
}
