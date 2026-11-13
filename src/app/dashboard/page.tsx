"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import type { Employee, Shift, Payslip, RequestRecord } from "@/types";
import { useCurrentUser } from "@/context/AuthContext";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
interface Metric { label: string; href: string; value: number | null; error?: string }
export default function DashboardPage() {
  const { user, role } = useCurrentUser(); const [metrics, setMetrics] = useState<Metric[]>([]); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); const date = today();
    const definitions = [
      { label: "Nhân viên đang làm", href: "/dashboard/employees", fetch: () => apiGet<Employee[]>("/api/employees").then(rows => rows.filter(row => row.status === "đang làm").length) },
      { label: "Ca được phân hôm nay", href: "/dashboard/shifts", fetch: () => apiGet<Shift[]>(`/api/shifts?workDate=${date}`).then(rows => rows.filter(row => row.status !== "đã hủy").length) },
      { label: "Đơn chờ xử lý", href: "/dashboard/requests", fetch: () => apiGet<RequestRecord[]>("/api/requests?status=pending").then(rows => rows.length) },
      { label: "Phiếu chờ xác nhận tháng này", href: "/dashboard/payslips", fetch: () => apiGet<Payslip[]>(`/api/payroll/payslips?month=${date.slice(0, 7)}`).then(rows => rows.filter(row => row.status === "pending_confirmation").length) },
    ];
    const result = await Promise.allSettled(definitions.map(item => item.fetch()));
    setMetrics(definitions.map((item, index) => { const outcome = result[index]; return { label: item.label, href: item.href, value: outcome.status === "fulfilled" ? outcome.value : null, error: outcome.status === "rejected" ? (outcome.reason instanceof Error ? outcome.reason.message : "Không tải được dữ liệu") : undefined }; })); setLoading(false);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial server data load; also reused by the refresh button.
  useEffect(() => { void load(); }, [load]);
  return <div className="space-y-6"><PageHeader title="Tổng quan" actions={<Button onClick={() => void load()} disabled={loading}>{loading ? "Đang tải…" : "Làm mới"}</Button>} />
    <div className="rounded-2xl bg-primary text-white p-6"><p className="text-sm opacity-80">{role === "admin" ? "Quản trị toàn công ty" : "Vận hành chi nhánh"}</p><h2 className="text-2xl font-semibold mt-1">Xin chào, {user.name}</h2><p className="mt-2 text-sm opacity-90">Theo dõi nhân sự, ca làm và các hồ sơ cần xử lý.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{(loading && !metrics.length ? Array.from({ length: 4 }, () => ({ label: "Đang tải dữ liệu", href: "#", value: null, error: undefined })) : metrics).map((item, index) => <Link key={index} href={item.href} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-primary"><p className="text-sm text-gray-500">{item.label}</p><p className="text-3xl font-semibold my-3">{loading ? "…" : item.value ?? "—"}</p>{item.error ? <p role="alert" className="text-xs text-red-600">{item.error}</p> : <p className="text-xs text-primary">Xem chi tiết →</p>}</Link>)}</div>
    <section className="rounded-xl border border-gray-200 bg-white p-6"><h2 className="font-semibold">Quy trình làm việc</h2><div className="mt-4 grid gap-4 md:grid-cols-3">{[{ href: "/dashboard/shifts", title: "1. Kiểm tra lịch và công", text: "Chỉ ca hoàn thành đủ giờ vào–ra hợp lệ mới tích lũy lương." }, { href: "/dashboard/requests", title: "2. Xử lý đề nghị", text: "Duyệt mẫu đơn không tự thay đổi lịch, công hoặc thanh toán." }, { href: "/dashboard/payslips", title: "3. Xác nhận phiếu lương", text: "Phiếu đã xác nhận mới đủ điều kiện chi trả." }].map(step => <Link key={step.href} href={step.href} className="rounded-lg bg-gray-50 p-4 hover:bg-primary-50"><h3 className="font-medium text-sm">{step.title}</h3><p className="text-sm text-gray-500 mt-2">{step.text}</p></Link>)}</div></section>
  </div>;
}
