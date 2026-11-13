"use client";
import { useMemo, useRef, useState } from "react";
import type { BankAccount, Payslip } from "@/types";
import { createPayout, postSoapPayroll } from "@/lib/api";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";
import { money } from "@/features/payslips/model";
import { eligibleSlips, payoutPayload, payoutXml } from "./model";

export default function PayoutCreate({ accounts, slips, names, onClose, onPaid }: {
    accounts: BankAccount[];
    slips: Payslip[];
    names: Map<string, string>;
    onClose: () => void;
    onPaid: () => Promise<void>;
}) {
    const eligible = useMemo(() => eligibleSlips(slips), [slips]);
    const [ids, setIds] = useState<string[]>([]);
    const [accountId, setAccountId] = useState(accounts.find(a => a.isPrimary)?.id || accounts[0]?.id || "");
    const [content, setContent] = useState("Chi lương");
    const [transport, setTransport] = useState("rest");
    const [saving, setSaving] = useState(false);
    const [paid, setPaid] = useState(false);
    const [error, setError] = useState("");
    const inFlight = useRef(false);
    const selected = eligible.filter(p => ids.includes(p.id));
    const signature = JSON.stringify({ ids: [...ids].sort(), accountId, content });
    const idempotencyKey = useMemo(() => { void signature; return crypto.randomUUID(); }, [signature]);
    const payload = payoutPayload(selected, accountId, idempotencyKey, content);
    const account = accounts.find(a => a.id === accountId);

    async function pay() {
        if (!account || !selected.length || inFlight.current || paid) return;
        inFlight.current = true;
        setSaving(true);
        setError("");
        try {
            if (transport === "soap") await postSoapPayroll(payoutXml(payload, account.accountNumber));
            else await createPayout(payload);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Không tạo được lệnh chi. Có thể thử lại cùng yêu cầu.");
            inFlight.current = false;
            setSaving(false);
            return;
        }
        setPaid(true);
        try {
            await onPaid();
            onClose();
        } catch {
            setError("Đã chi lương thành công. Hãy đóng cửa sổ và làm mới để tải lại lịch sử, số dư và phiếu lương.");
        } finally {
            inFlight.current = false;
            setSaving(false);
        }
    }

    const close = () => { if (!inFlight.current) onClose(); };
    return <Modal open onClose={close} title="Tạo lệnh chi lương" size="lg" footer={<>
        <Button variant="white" disabled={saving} onClick={close}>Đóng</Button>
        <Button disabled={saving || paid || !selected.length || !account} onClick={pay}>{saving ? "Đang xử lý..." : "Xác nhận chi lương"}</Button>
    </>}>
        <Field label="Tài khoản nguồn"><Select value={accountId} onChange={e => setAccountId(e.target.value)} disabled={saving || paid}>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.bankName} · {a.accountNumber} · {money(a.balance)}</option>)}
        </Select></Field>
        <Field label="Nội dung"><Input value={content} onChange={e => setContent(e.target.value)} disabled={saving || paid}/></Field>
        <Field label="Phương thức"><Select value={transport} onChange={e => setTransport(e.target.value)} disabled={saving || paid}><option value="rest">REST</option><option value="soap">SOAP</option></Select></Field>
        <p className="text-sm text-gray-500">Chỉ chi phiếu đã xác nhận, chưa thanh toán và có thực lĩnh không âm.</p>
        <div className="max-h-64 overflow-auto my-3">{eligible.map(p => <label key={p.id} className="flex items-center gap-3 border-b py-2 text-sm">
            <input type="checkbox" disabled={saving || paid} checked={ids.includes(p.id)} onChange={e => setIds(e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id))}/>
            <span>{names.get(p.employeeId) || "Nhân viên chưa có tên"} · {p.month}</span><strong>{money(p.netSalary)}</strong>
        </label>)}</div>
        <p>{selected.length} phiếu · {payload.beneficiaryCount} người · <strong>{money(String(payload.totalAmount))}</strong></p>
        {paid && <p role="status" className="text-emerald-700">Đã chi lương thành công.</p>}
        {error && <p role="alert" className="text-red-700">{error}</p>}
    </Modal>;
}
