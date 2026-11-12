"use client";
import { useMemo, useState } from "react";
import type { BankAccount, Payslip } from "@/types";
import { createPayout, postSoapPayroll } from "@/lib/api";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";
import { money } from "@/features/payslips/model";
import { eligibleSlips, payoutPayload, payoutXml } from "./model";
export default function PayoutCreate({ accounts, slips, onClose, onPaid }: {
    accounts: BankAccount[];
    slips: Payslip[];
    onClose: () => void;
    onPaid: () => Promise<void>;
}) {
    const eligible = useMemo(() => eligibleSlips(slips), [slips]);
    const [ids, setIds] = useState<string[]>([]);
    const [accountId, setAccountId] = useState(accounts.find(a => a.isPrimary)?.id || accounts[0]?.id || "");
    const [content, setContent] = useState("Chi lương");
    const [transport, setTransport] = useState("rest");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [response, setResponse] = useState("");
    const selected = eligible.filter(p => ids.includes(p.id));
    const signature = JSON.stringify({ ids: [...ids].sort(), accountId, content });
    const idempotencyKey = useMemo(() => { void signature; return crypto.randomUUID(); }, [signature]);
    const payload = payoutPayload(selected, accountId, idempotencyKey, content);
    const account = accounts.find(a => a.id === accountId);
    async function pay() { if (!account || !selected.length || saving)
        return; setSaving(true); setError(""); let paid = false; try {
        if (transport === "soap") {
            const xml = await postSoapPayroll(payoutXml(payload, account.accountNumber));
            setResponse(xml);
        }
        else {
            const result = await createPayout(payload);
            setResponse(JSON.stringify(result, null, 2));
        }
        paid = true;
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Không tạo được lệnh chi. Có thể thử lại cùng yêu cầu.");
    }
    finally {
        setSaving(false);
    } if (paid) {
        await onPaid();
        onClose();
    } }
    return <Modal open onClose={onClose} title="Tạo lệnh chi lương" size="lg" footer={<><Button variant="white" disabled={saving} onClick={onClose}>Đóng</Button><Button disabled={saving || !selected.length || !account} onClick={pay}>{saving ? "Đang xử lý..." : "Xác nhận chi lương"}</Button></>}>
    <Field label="Tài khoản nguồn"><Select value={accountId} onChange={e => setAccountId(e.target.value)} disabled={saving}>{accounts.map(a => <option key={a.id} value={a.id}>{a.bankName} · {a.accountNumber} · {money(a.balance)}</option>)}</Select></Field>
    <Field label="Nội dung"><Input value={content} onChange={e => setContent(e.target.value)} disabled={saving}/></Field><Field label="Phương thức"><Select value={transport} onChange={e => setTransport(e.target.value)} disabled={saving}><option value="rest">REST</option><option value="soap">SOAP</option></Select></Field>
    <p className="text-sm text-gray-500">Chỉ chi phiếu đã xác nhận, chưa thanh toán và có thực lĩnh lớn hơn 0.</p><div className="max-h-64 overflow-auto my-3">{eligible.map(p => <label key={p.id} className="flex items-center gap-3 border-b py-2 text-sm"><input type="checkbox" disabled={saving} checked={ids.includes(p.id)} onChange={e => setIds(e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id))}/><span>{p.employeeId} · {p.month}</span><strong>{money(p.netSalary)}</strong></label>)}</div>
    <p>{selected.length} phiếu · {payload.beneficiaryCount} người · <strong>{money(String(payload.totalAmount))}</strong></p><p className="text-xs text-gray-500 break-all mt-2">Khóa chống trùng: {idempotencyKey}</p>{error && <p role="alert" className="text-red-700">{error}</p>}{response && <pre className="text-xs overflow-auto">{response}</pre>}</Modal>;
}
