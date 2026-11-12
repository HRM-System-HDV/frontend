"use client";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";
export interface GenerateInput {
    employeeId: string;
    month: string;
    bonus: string;
}
export default function GeneratePayslip({ employees, month: initialMonth, saving, error, onClose, onSave }: {
    employees: {
        id: string;
        name: string;
    }[];
    month: string;
    saving: boolean;
    error: string;
    onClose: () => void;
    onSave: (p: GenerateInput) => void;
}) {
    const [employeeId, setEmployeeId] = useState("");
    const [month, setMonth] = useState(initialMonth);
    const [bonus, setBonus] = useState("0");
    return <Modal open onClose={onClose} title="Tạo phiếu lương tháng" footer={<><Button variant="white" disabled={saving} onClick={onClose}>Hủy</Button><Button disabled={saving || !employeeId} onClick={() => onSave({ employeeId, month, bonus })}>Tạo phiếu</Button></>}>
    <Field label="Nhân viên"><Select value={employeeId} disabled={saving} onChange={e => setEmployeeId(e.target.value)}><option value="">Chọn nhân viên</option>{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</Select></Field>
    <Field label="Kỳ lương"><Input type="month" value={month} disabled={saving} onChange={e => setMonth(e.target.value)}/></Field><Field label="Thưởng (VNĐ)"><Input value={bonus} disabled={saving} onChange={e => setBonus(e.target.value)}/></Field>
    <p className="text-sm text-gray-500">Lương và phạt được tổng hợp từ chấm công hợp lệ.</p>{error && <p role="alert" className="text-red-700">{error}</p>}</Modal>;
}
