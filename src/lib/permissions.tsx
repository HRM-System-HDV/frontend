import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faArrowRightArrowLeft,
  faBuildingColumns,
  faCalendarWeek,
  faChartPie,
  faClipboardList,
  faClockRotateLeft,
  faCoins,
  faGavel,
  faNewspaper,
  faSitemap,
  faStore,
  faUsers,
  faWifi,
  faBriefcase,
  faUserShield,
} from "@fortawesome/free-solid-svg-icons";
import type { SidebarGroup, SidebarItem } from "@/components/layout/Sidebar";

// Mô hình phân quyền chỉ có đúng 3 vai trò. Mỗi tầng liệt kê menu tường minh
// thay vì suy ra từ "không phải admin", nên staff không bao giờ inherit menu
// của manager. Nguồn thật của quyền là role của user đăng nhập; chuỗi `role` tự
// do trên hồ sơ nhân sự ("Trưởng phòng", "Giám đốc", "Kế toán") chỉ là nhãn
// chức danh, không phải bảng quyền.
export type AppRole = "admin" | "manager" | "staff";

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Quản trị viên",
  manager: "Quản lý Chi nhánh",
  staff: "Nhân viên",
};

export function normalizeRole(role: string): AppRole {
  return role === "admin" || role === "manager" ? role : "staff";
}

/** Nhãn quyền hiển thị cho người dùng, tách biệt với nhãn chức danh. */
export function roleLabel(role: string): string {
  return ROLE_LABELS[normalizeRole(role)];
}

function menu(label: string, href: string, icon: IconDefinition): SidebarItem {
  return { label, href, icon: <FontAwesomeIcon icon={icon} fontSize={20} strokeWidth={1.5} /> };
}

// Admin: toàn bộ tính năng, gồm cả tính năng hệ thống (chi nhánh, ngân hàng,
// Wi-Fi, SOAP, nhật ký thao tác).
const ADMIN_MENU: SidebarItem[] = [
  menu("Tổng quan Dashboard", "/dashboard", faChartPie),
  menu("Nhân sự toàn công ty", "/dashboard/employees", faUsers),
  menu("Quản lý Phòng ban", "/dashboard/departments", faSitemap),
  menu("Vị trí công việc", "/dashboard/positions", faBriefcase),
  menu("Tài khoản & Phân quyền", "/dashboard/accounts", faUserShield),
  menu("Quản lý Chi nhánh", "/dashboard/branches", faStore),
  menu("Phân ca làm việc", "/dashboard/shifts", faCalendarWeek),
  menu("Giao việc & Nhiệm vụ", "/dashboard/tasks", faClipboardList),
  menu("Phê duyệt yêu cầu", "/dashboard/requests", faArrowRightArrowLeft),
  menu("Phiếu lương toàn công ty", "/dashboard/payslips", faCoins),
  menu("Kết nối Ngân hàng", "/dashboard/bank", faBuildingColumns),
  menu("Bảng tin & Thông báo", "/dashboard/news", faNewspaper),
  menu("Nội quy & Quy định", "/dashboard/regulations", faGavel),
  menu("Cấu hình Wi-Fi", "/dashboard/wifi", faWifi),
  menu("Lịch sử thao tác", "/dashboard/backlog", faClockRotateLeft),
];

// Manager: nghiệp vụ vận hành chi nhánh. Bị chặn tính năng hệ thống nên mất
// "Kết nối Ngân hàng" (số tài khoản + lệnh chi + SOAP), "Thông tin Chi nhánh",
// "Wi-Fi chi nhánh" và "Lịch sử thao tác"; bảng lương chỉ còn chế độ xem vì
// ghi lương đã chuyển sang admin.
const MANAGER_MENU: SidebarItem[] = [
  menu("Tổng quan Dashboard", "/dashboard", faChartPie),
  menu("Nhân sự chi nhánh", "/dashboard/employees", faUsers),
  menu("Cơ cấu Phòng ban", "/dashboard/departments", faSitemap),
  menu("Vị trí công việc", "/dashboard/positions", faBriefcase),
  menu("Phân ca làm việc", "/dashboard/shifts", faCalendarWeek),
  menu("Giao việc & Nhiệm vụ", "/dashboard/tasks", faClipboardList),
  menu("Duyệt yêu cầu chi nhánh", "/dashboard/requests", faArrowRightArrowLeft),
  menu("Bảng công & Lương chi nhánh", "/dashboard/payslips", faCoins),
  menu("Bảng tin & Thông báo", "/dashboard/news", faNewspaper),
  menu("Nội quy & Quy định", "/dashboard/regulations", faGavel),
];

// Staff: chỉ luồng tự phục vụ mà gateway mở cho mọi vai trò — đọc bảng tin và
// nội quy, xem đơn của mình, cập nhật nhiệm vụ được giao, xem phiếu lương của
// chính mình (payroll-service tự scope theo employeeId).

const MENUS: Record<AppRole, { title: string; items: SidebarItem[] }> = {
  admin: { title: "QUẢN TRỊ TOÀN CÔNG TY", items: ADMIN_MENU },
  manager: { title: "VẬN HÀNH CHI NHÁNH", items: MANAGER_MENU },
  staff: { title: "", items: [] },
};

export function buildMenuItems(role: string): SidebarGroup[] {
  if (normalizeRole(role) === "staff") return [];
  const tier = MENUS[normalizeRole(role)];
  return [{ title: tier.title, items: tier.items }];
}

/**
 * Trang này có thuộc menu của vai trò không — dùng để chặn luôn route của các
 * trang đặc quyền thay vì chỉ ẩn link ở sidebar.
 */
export function canAccessPath(role: string, href: string): boolean {
  return MENUS[normalizeRole(role)].items.some((item) => item.href === href || (item.href !== "/dashboard" && href.startsWith(`${item.href}/`)));
}

/** Khối báo không có quyền, dùng chung cho các trang chỉ dành cho quản trị viên. */
export function NoAccessNotice({ description }: { description?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-2xs">
      <h2 className="text-base font-bold text-gray-900">Không có quyền truy cập</h2>
      <p className="text-sm text-gray-500 mt-1">
        {description ?? "Chức năng này chỉ dành cho Quản trị viên."}
      </p>
    </div>
  );
}
