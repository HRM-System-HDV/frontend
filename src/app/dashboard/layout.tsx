"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";
import { useCurrentUser } from "@/context/AuthContext";
import { buildMenuItems, canAccessPath, NoAccessNotice, roleLabel } from "@/lib/permissions";
import { apiGet } from "@/lib/api";
import type { Branch } from "@/types";
import Button from "@/components/ui/Button";
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, role, branchId, logout, loading, authenticated, error, reloadSession } = useCurrentUser();
  const pathname = usePathname(); const [branchName, setBranchName] = useState("");
  useEffect(() => { let active = true; if (!authenticated || !branchId) return; apiGet<Branch[]>("/api/branches").then(rows => { if (active) setBranchName(rows.find(row => row.id === branchId)?.name || ""); }).catch(() => { if (active) setBranchName(""); }); return () => { active = false; }; }, [authenticated, branchId]);
  if (loading) return <div className="min-h-screen grid place-items-center text-sm text-gray-500">Đang xác thực phiên đăng nhập…</div>;
  if (error) return <div className="min-h-screen grid place-items-center p-6"><div role="alert" className="space-y-4 text-center"><p>{error}</p><Button onClick={() => void reloadSession()}>Thử lại</Button></div></div>;
  if (!authenticated || role === "staff") return null;
  return <DashboardShell brand="HRM System" groups={buildMenuItems(role)} userName={user.name} userRole={roleLabel(role)} logoutHref="/login" onLogout={logout} sidebarFooter={branchId ? { icon: <span aria-hidden>●</span>, text: branchName || "Chi nhánh được phân công" } : undefined}>
    {canAccessPath(role, pathname) ? children : <NoAccessNotice description="Bạn không có quyền truy cập chức năng này." />}
  </DashboardShell>;
}
