"use client";
import { useCallback, useEffect, useState } from "react";
import type { BankAccount, Branch, Payout, Payslip, SoapGatewayConfig } from "@/types";
import { apiGet } from "@/lib/api";
import { useCurrentUser } from "@/context/AuthContext";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import BankForm from "@/features/bank/BankForm";
import PayoutCreate from "@/features/bank/PayoutCreate";
import SoapConfig from "@/features/bank/SoapConfig";
import { money } from "@/features/payslips/model";
export default function BankPage() {
    const { role } = useCurrentUser();
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [slips, setSlips] = useState<Payslip[]>([]);
    const [names, setNames] = useState<Map<string, string>>(new Map());
    const [config, setConfig] = useState<SoapGatewayConfig | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<BankAccount | null | undefined>(undefined);
    const [pay, setPay] = useState(false);
    const load = useCallback(async () => { if (role !== "admin")
        return; try {
        const [a, b, p, s, c, employees] = await Promise.all([apiGet<BankAccount[]>("/api/payroll/bank-accounts"), apiGet<Branch[]>("/api/branches"), apiGet<Payout[]>("/api/payroll/payouts"), apiGet<Payslip[]>("/api/payroll/payslips"), apiGet<SoapGatewayConfig | null>("/api/soap-config"), apiGet<{id: string; name: string}[]>("/api/employees")]);
        setAccounts(a);
        setBranches(b);
        setPayouts(p);
        setSlips(s);
        setNames(new Map(employees.map(e => [e.id, e.name])));
        setConfig(c);
        setError("");
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Không tải được dữ liệu ngân hàng.");
        throw e;
    }
    finally {
        setLoading(false);
    } }, [role]);
    // Đồng bộ dữ liệu bên ngoài; các state được cập nhật sau yêu cầu HTTP.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void load().catch(() => { }); }, [load]);
    if (role !== "admin")
        return <p className="text-red-700">Chỉ quản trị viên được truy cập ngân hàng.</p>;
    return <div className="space-y-5"><PageHeader breadcrumb={[{ label: "HRM" }, { label: "Ngân hàng" }]} actions={<div className="flex gap-2"><Button variant="white" onClick={() => setEditing(null)}>Thêm tài khoản</Button><Button disabled={!accounts.length || loading} onClick={() => setPay(true)}>Tạo lệnh chi</Button><Button variant="white" disabled={loading} onClick={() => void load().catch(() => { })}>Làm mới</Button></div>}/>{error && <p role="alert" className="text-red-700">{error}</p>}{loading && <p>Đang tải...</p>}
    <Card><CardHeader><CardTitle>Tài khoản nguồn mô phỏng</CardTitle></CardHeader><CardBody><Table data={accounts} rowKey={a => a.id} columns={[{ key: "bankName", header: "Ngân hàng" }, { key: "accountNumber", header: "Số tài khoản" }, { key: "accountName", header: "Chủ tài khoản" }, { key: "branchId", header: "Chi nhánh", render: a => branches.find(b => b.id === a.branchId)?.name || "Toàn công ty" }, { key: "balance", header: "Số dư", render: a => money(a.balance) }, { key: "isPrimary", header: "Tài khoản chính", render: a => a.isPrimary ? "Có" : "Không" }, { key: "actions", header: "Thao tác", render: a => <Button size="sm" variant="white" onClick={() => setEditing(a)}>Sửa</Button> }]}/></CardBody></Card>
    <Card><CardHeader><CardTitle>Lịch sử lệnh chi</CardTitle></CardHeader><CardBody>{payouts.length === 0 ? <p className="text-sm text-gray-500">Chưa có lệnh chi.</p> : payouts.map(p => <div id={p.id} key={p.id} className="border-b py-4 text-sm scroll-mt-5"><div className="flex justify-between"><strong>{p.bankReference}</strong><strong>{money(p.totalAmount)}</strong></div><p>{p.content} · {p.beneficiaryCount} người · {p.status === "success" ? "Thành công" : p.status}</p><p>Tài khoản nguồn: {p.debitAccountNumber} · {new Date(p.createdAt).toLocaleString("vi-VN")}</p>{p.payslips && <p className="text-xs">{p.payslips.length} phiếu lương trong lệnh chi</p>}</div>)}</CardBody></Card>
    <SoapConfig key={config?.id || "new"} config={config} onSaved={load}/>{editing !== undefined && <BankForm account={editing} branches={branches} onClose={() => setEditing(undefined)} onSaved={load}/>}
    {pay && <PayoutCreate accounts={accounts} slips={slips} names={names} onClose={() => setPay(false)} onPaid={load}/>}</div>;
}
