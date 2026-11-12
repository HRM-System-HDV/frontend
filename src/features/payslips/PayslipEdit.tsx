"use client";
import { useState } from "react";
import Link from "next/link";
import type { Payslip } from "@/types";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { money, labels, validMoney } from "./model";
export default function PayslipDetail({ slip, editable, onClose, onSave }: {
    slip: Payslip;
    editable: boolean;
    onClose: () => void;
    onSave: (bonus: string) => Promise<void>;
}) {
    const [bonus, setBonus] = useState(slip.bonus);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    async function save() { if (!validMoney(bonus)) {
        setError("Tiền thưởng phải nguyên không âm, tối đa 15 chữ số.");
        return;
    } setSaving(true); try {
        await onSave(bonus);
        onClose();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Không lưu được phiếu.");
    }
    finally {
        setSaving(false);
    } }
    return <Modal open onClose={onClose} title={`Phiếu lương ${slip.month}`} footer={<><Button variant="white" disabled={saving} onClick={onClose}>Đóng</Button>{editable && <Button disabled={saving} onClick={save}>Lưu thưởng</Button>}</>}><div className="space-y-3 text-sm">
    <p>{labels[slip.status]}</p><p>Kiểu lương: {slip.salaryType === "hourly" ? "Theo giờ" : "Theo tháng"} · Mức thỏa thuận: {money(slip.salaryRate)}</p>{slip.workedHours != null && <p>Giờ làm: {slip.workedHours}</p>}<p>Lương tích lũy: {money(slip.baseSalary)}</p><p>Phạt: {money(slip.totalPenalty)}</p><p>Thực lĩnh: <strong>{money(slip.netSalary)}</strong></p>
    {editable ? <Field label="Thưởng (VNĐ)"><Input value={bonus} onChange={e => setBonus(e.target.value)} disabled={saving}/></Field> : <p>Thưởng: {money(slip.bonus)}</p>}
    {slip.confirmedAt && <p>Xác nhận: {new Date(slip.confirmedAt).toLocaleString("vi-VN")} · {slip.confirmedBy}</p>}{slip.payoutId && <Link className="text-primary" href={`/dashboard/bank#${slip.payoutId}`}>Lệnh chi {slip.payoutId}</Link>}{error && <p role="alert" className="text-red-700">{error}</p>}</div></Modal>;
}
