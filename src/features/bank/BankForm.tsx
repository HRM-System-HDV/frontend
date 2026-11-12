"use client";
import { useState } from "react";
import type { BankAccount, Branch } from "@/types";
import { apiPost, apiPut, apiDelete } from "@/lib/api";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";
import { validMoney } from "@/features/payslips/model";
export default function BankForm({ account, branches, onClose, onSaved }: {
    account: BankAccount | null;
    branches: Branch[];
    onClose: () => void;
    onSaved: () => Promise<void>;
}) {
    const [number, setNumber] = useState(account?.accountNumber || "");
    const [name, setName] = useState(account?.accountName || "");
    const [bank, setBank] = useState(account?.bankName || "");
    const [branchId, setBranchId] = useState(account?.branchId || "");
    const [balance, setBalance] = useState("0");
    const [primary, setPrimary] = useState(account?.isPrimary || false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    async function save() { if (!number.trim() || !name.trim() || !bank.trim() || (!account && !validMoney(balance))) {
        setError("Nhập đầy đủ thông tin và số dư nguyên không âm, tối đa 15 chữ số.");
        return;
    } setSaving(true); try {
        const payload = { accountName: name.trim(), bankName: bank.trim(), branchId: branchId || null, isPrimary: primary };
        if (account)
            await apiPut(`/api/payroll/bank-accounts/${account.id}`, payload);
        else
            await apiPost("/api/payroll/bank-accounts", { ...payload, accountNumber: number.trim(), balance });
        await onSaved();
        onClose();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Không lưu được tài khoản.");
    }
    finally {
        setSaving(false);
    } }
    async function remove() { if (!account || !window.confirm("Xóa tài khoản nguồn này?"))
        return; setSaving(true); try {
        await apiDelete(`/api/payroll/bank-accounts/${account.id}`);
        await onSaved();
        onClose();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Không xóa được tài khoản.");
    }
    finally {
        setSaving(false);
    } }
    return <Modal open onClose={onClose} title={account ? "Sửa tài khoản nguồn" : "Thêm tài khoản nguồn"} footer={<><Button variant="white" disabled={saving} onClick={onClose}>Hủy</Button>{account && <Button variant="danger" disabled={saving} onClick={remove}>Xóa tài khoản</Button>}<Button disabled={saving} onClick={save}>Lưu</Button></>}>
    <Field label="Ngân hàng"><Input value={bank} onChange={e => setBank(e.target.value)} disabled={saving}/></Field><Field label="Số tài khoản"><Input value={number} onChange={e => setNumber(e.target.value)} disabled={saving || !!account}/></Field><Field label="Chủ tài khoản"><Input value={name} onChange={e => setName(e.target.value)} disabled={saving}/></Field>
    <Field label="Chi nhánh"><Select value={branchId} onChange={e => setBranchId(e.target.value)} disabled={saving}><option value="">Toàn công ty</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
    {!account && <Field label="Số dư mô phỏng ban đầu (VNĐ)"><Input value={balance} onChange={e => setBalance(e.target.value)} disabled={saving}/></Field>}<label className="flex gap-2 text-sm"><input type="checkbox" checked={primary} onChange={e => setPrimary(e.target.checked)} disabled={saving}/>Tài khoản chính</label>{error && <p role="alert" className="text-red-700">{error}</p>}</Modal>;
}
