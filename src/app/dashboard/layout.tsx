"use client";

import React from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import { useCurrentUser } from "@/context/AuthContext";
import { buildMenuItems } from "@/lib/permissions";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, logout } = useCurrentUser();
  const isAdmin = role === "admin";
  const roleName = isAdmin ? "Quản trị viên" : "Quản lý Chi nhánh";
  const groups = buildMenuItems(role);

  return (
    <DashboardShell
      brand="HRM System"
      groups={groups}
      userName={user.name}
      userRole={roleName}
      logoutHref="/login"
      onLogout={logout}
    >
      {children}
    </DashboardShell>
  );
}
