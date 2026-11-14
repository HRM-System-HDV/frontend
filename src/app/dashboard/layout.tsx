"use client";

import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocationDot } from "@fortawesome/free-solid-svg-icons";
import DashboardShell from "@/components/layout/DashboardShell";
import { useCurrentUser } from "@/context/AuthContext";
import { buildMenuItems, roleLabel } from "@/lib/permissions";
import { apiGet } from "@/lib/api";
import type { Branch } from "@/types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, branchId, logout, loading } = useCurrentUser();
  const groups = buildMenuItems(role);
  const label = roleLabel(role);
  // identity-service đặt roleTitle đúng bằng nhãn quyền khi tài khoản là
  // admin/manager, nên chức danh chỉ được hiển thị khi nó thực khác nhãn quyền;
  // nếu không header thành "Quản trị viên - Quản trị viên".
  const jobTitle = (user.roleTitle || "").trim();
  const roleName =
    jobTitle && jobTitle.toLowerCase() !== label.toLowerCase()
      ? `${label} - ${jobTitle}`
      : label;

  // Manager/staff bị ghim một chi nhánh nên mọi bộ lọc chi nhánh đã ẩn; tên chi
  // nhánh chỉ hiện một lần ở footer sidebar. DB lưu branchId ⇒ map qua /api/branches.
  const [branchName, setBranchName] = useState("");
  useEffect(() => {
    if (!branchId) {
      setBranchName("");
      return;
    }
    let alive = true;
    apiGet<Branch[]>("/api/branches")
      .then((rows) => {
        if (alive) setBranchName(rows.find((b) => b.id === branchId)?.name || "");
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [branchId]);

  return (
    <DashboardShell
      brand="HRM System"
      groups={groups}
      userName={user.name}
      userRole={roleName}
      logoutHref="/login"
      onLogout={logout}
      sidebarFooter={
        branchId
          ? {
              icon: <FontAwesomeIcon icon={faLocationDot} fontSize={12} />,
              text: `Chi nhánh ${branchName || branchId}`,
            }
          : undefined
      }
    >
      {/* Chờ xác định phiên: chưa render nội dung trang để không nháy
          "Không có quyền truy cập" khi role còn là placeholder. */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-sm text-gray-500">
          Đang tải dữ liệu phiên làm việc...
        </div>
      ) : (
        children
      )}
    </DashboardShell>
  );
}
