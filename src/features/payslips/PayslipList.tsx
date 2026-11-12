"use client";
import type { Payslip } from "@/types";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { money, labels } from "./model";
export default function PayslipList({ slips, names, onView, onConfirm }: {
    slips: Payslip[];
    names: Map<string, string>;
    onView: (p: Payslip) => void;
    onConfirm?: (p: Payslip) => void;
}) {
    return <Card><CardHeader><CardTitle>Phiếu lương theo tháng</CardTitle></CardHeader><CardBody><Table data={slips} rowKey={p => p.id} columns={[
            { key: "employeeId", header: "Nhân viên", render: p => names.get(p.employeeId) || p.employeeId }, { key: "month", header: "Kỳ lương" },
            { key: "baseSalary", header: "Lương tích lũy", render: p => money(p.baseSalary) }, { key: "bonus", header: "Thưởng", render: p => money(p.bonus) },
            { key: "totalPenalty", header: "Phạt", render: p => money(p.totalPenalty) }, { key: "netSalary", header: "Thực lĩnh", render: p => <strong>{money(p.netSalary)}</strong> },
            { key: "status", header: "Trạng thái", render: p => labels[p.status] },
            { key: "actions", header: "Thao tác", render: p => <div className="flex gap-2"><Button size="sm" variant="white" onClick={() => onView(p)}>Chi tiết</Button>{onConfirm && p.status === "pending_confirmation" && <Button size="sm" onClick={() => onConfirm(p)}>Xác nhận</Button>}</div> }
        ]}/></CardBody></Card>;
}
