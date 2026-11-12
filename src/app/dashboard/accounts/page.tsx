"use client";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { useCurrentUser } from "@/context/AuthContext";
import { NoAccessNotice, roleLabel } from "@/lib/permissions";
import type { UserAccount, UserRole, Branch } from "@/types";
export default function AccountsPage() {
  const { role, user, reloadSession } = useCurrentUser();
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<UserAccount | null>(null);
  const [nextRole, setNextRole] = useState<UserRole>("staff");
  const [resetting, setResetting] = useState<UserAccount | null>(null);
  const [temporary, setTemporary] = useState<{ email: string; tempPassword: string } | null>(null);
  const load = useCallback(async () => {
    if (role !== "admin") return;
    setLoading(true); setError("");
    try { const [users, units] = await Promise.all([apiGet<UserAccount[]>("/api/auth/users"), apiGet<Branch[]>("/api/branches")]); setAccounts(users); setBranches(units); }
    catch (e) { setError(e instanceof Error ? e.message : "Không tải được tài khoản."); }
    finally { setLoading(false); }
  }, [role]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Load accounts after authorization.
  useEffect(() => { void load(); }, [load]);
  async function updateRole() {
    if (!editing) return;
    setBusy(true); setError("");
    try {
      const updated = await apiPut<UserAccount>(`/api/auth/users/${editing.id}`, { systemRole: nextRole });
      setAccounts(previous => previous.map(account => account.id === updated.id ? updated : account));
      setEditing(null);
      if (updated.id === user.userId) await reloadSession();
    } catch (e) { setError(e instanceof Error ? e.message : "Không cập nhật được quyền."); }
    finally { setBusy(false); }
  }
  async function resetPassword() {
    if (!resetting) return;
    setBusy(true); setError("");
    try { const result = await apiPost<{ email: string; tempPassword: string }>("/api/auth/reset-password", { email: resetting.email }); setResetting(null); setTemporary(result); }
    catch (e) { setError(e instanceof Error ? e.message : "Không cấp lại được mật khẩu."); }
    finally { setBusy(false); }
  }
  if (role !== "admin") return <NoAccessNotice />;
  const visible = accounts.filter(account => `${account.name} ${account.email}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")));
  return <div className="space-y-4">
    <PageHeader breadcrumb={[{ label: "Hệ thống" }, { label: "Tài khoản & Phân quyền" }]} />
    <p className="text-sm text-gray-500">Tài khoản được đồng bộ từ hồ sơ nhân viên. Nhân viên sử dụng Mobile; quản lý và quản trị viên sử dụng được Web.</p>
    <div className="flex gap-3 rounded-xl border border-gray-200 bg-white p-4"><input aria-label="Tìm tài khoản" placeholder="Tìm tên hoặc email…" className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm" value={search} onChange={e => setSearch(e.target.value)} /><Button variant="outline" disabled={loading} onClick={load}>Tải lại</Button></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading ? <p className="p-6 text-sm text-gray-500">Đang tải tài khoản…</p> : <div className="overflow-hidden rounded-xl border border-gray-200 bg-white"><Table data={visible} rowKey={account => account.id} columns={[
      { key: "name", header: "Tài khoản", render: account => <div>{account.name}<small className="block text-gray-500">{account.email}</small></div> },
      { key: "systemRole", header: "Quyền", render: account => roleLabel(account.systemRole) },
      { key: "branchId", header: "Chi nhánh", render: account => branches.find(branch => branch.id === account.branchId)?.name || "—" },
      { key: "actions", header: "Thao tác", render: account => <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => { setError(""); setEditing(account); setNextRole(account.systemRole); }}>Phân quyền</Button><Button size="sm" variant="white" disabled={account.id === user.userId} onClick={() => { setError(""); setResetting(account); }}>Cấp lại mật khẩu</Button></div> },
    ]} /></div>}
    <Modal open={!!editing} onClose={() => { if (!busy) setEditing(null); }} title="Phân quyền tài khoản" footer={<><Button variant="white" disabled={busy} onClick={() => setEditing(null)}>Hủy</Button><Button disabled={busy || nextRole === editing?.systemRole} onClick={updateRole}>{busy ? "Đang lưu…" : "Lưu quyền"}</Button></>}>
      <p className="mb-3 text-sm">{editing?.name} — {editing?.email}</p>
      <select aria-label="Quyền tài khoản" className="w-full rounded-lg border border-gray-200 p-3 text-sm" value={nextRole} onChange={e => setNextRole(e.target.value as UserRole)}>{(["staff", "manager", "admin"] as const).map(value => <option value={value} key={value}>{roleLabel(value)}</option>)}</select>
      <p className="mt-3 text-sm text-gray-500">Thay đổi quyền sẽ thu hồi các phiên đăng nhập của tài khoản này.</p>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </Modal>
    <Modal open={!!resetting} onClose={() => { if (!busy) setResetting(null); }} title="Cấp lại mật khẩu" footer={<><Button variant="white" disabled={busy} onClick={() => setResetting(null)}>Hủy</Button><Button disabled={busy} onClick={resetPassword}>{busy ? "Đang xử lý…" : "Cấp lại"}</Button></>}>
      <p className="text-sm">Cấp mật khẩu tạm cho {resetting?.email} và thu hồi các phiên đăng nhập hiện tại?</p>{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </Modal>
    <Modal open={!!temporary} onClose={() => setTemporary(null)} title="Mật khẩu tạm" footer={<Button onClick={() => setTemporary(null)}>Đã ghi nhận</Button>}>
      <p className="mb-3 text-sm">Gửi trực tiếp cho {temporary?.email}. Mật khẩu chỉ hiển thị tại đây cho đến khi đóng hộp thoại.</p><code className="block select-all rounded-lg bg-gray-100 p-4 text-base">{temporary?.tempPassword}</code>
    </Modal>
  </div>;
}
