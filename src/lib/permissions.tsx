import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightArrowLeft,
  faBuildingColumns,
  faCalendarWeek,
  faChartPie,
  faClipboardList,
  faCoins,
  faGavel,
  faNewspaper,
  faSitemap,
  faStore,
  faUsers,
  faWifi,
} from "@fortawesome/free-solid-svg-icons";
import type { SidebarGroup } from "@/components/layout/Sidebar";

export function buildMenuItems(role: string): SidebarGroup[] {
  const isAdmin = role === "admin";

  const hrMenuItems = isAdmin
    ? [
        { label: "Tổng quan Dashboard", href: "/dashboard", icon: <FontAwesomeIcon icon={faChartPie} fontSize={20} strokeWidth={1.5} /> },
        { label: "Nhân sự toàn công ty", href: "/dashboard/employees", icon: <FontAwesomeIcon icon={faUsers} fontSize={20} strokeWidth={1.5} /> },
        { label: "Quản lý Phòng ban", href: "/dashboard/departments", icon: <FontAwesomeIcon icon={faSitemap} fontSize={20} strokeWidth={1.5} /> },
        { label: "Quản lý Chi nhánh", href: "/dashboard/branches", icon: <FontAwesomeIcon icon={faStore} fontSize={20} strokeWidth={1.5} /> },
        { label: "Phân ca làm việc", href: "/dashboard/shifts", icon: <FontAwesomeIcon icon={faCalendarWeek} fontSize={20} strokeWidth={1.5} /> },
        { label: "Giao việc & Nhiệm vụ", href: "/dashboard/tasks", icon: <FontAwesomeIcon icon={faClipboardList} fontSize={20} strokeWidth={1.5} /> },
        { label: "Phê duyệt yêu cầu", href: "/dashboard/requests", icon: <FontAwesomeIcon icon={faArrowRightArrowLeft} fontSize={20} strokeWidth={1.5} /> },
        { label: "Phiếu lương toàn công ty", href: "/dashboard/payslips", icon: <FontAwesomeIcon icon={faCoins} fontSize={20} strokeWidth={1.5} /> },
        { label: "Kết nối Ngân hàng", href: "/dashboard/bank", icon: <FontAwesomeIcon icon={faBuildingColumns} fontSize={20} strokeWidth={1.5} /> },
        { label: "Bảng tin & Thông báo", href: "/dashboard/news", icon: <FontAwesomeIcon icon={faNewspaper} fontSize={20} strokeWidth={1.5} /> },
        { label: "Nội quy & Quy định", href: "/dashboard/regulations", icon: <FontAwesomeIcon icon={faGavel} fontSize={20} strokeWidth={1.5} /> },
        { label: "Cấu hình Wi-Fi", href: "/dashboard/wifi", icon: <FontAwesomeIcon icon={faWifi} fontSize={20} strokeWidth={1.5} /> },
      ]
    : [
        { label: "Tổng quan Dashboard", href: "/dashboard", icon: <FontAwesomeIcon icon={faChartPie} fontSize={20} strokeWidth={1.5} /> },
        { label: "Nhân sự chi nhánh", href: "/dashboard/employees", icon: <FontAwesomeIcon icon={faUsers} fontSize={20} strokeWidth={1.5} /> },
        { label: "Cơ cấu Phòng ban", href: "/dashboard/departments", icon: <FontAwesomeIcon icon={faSitemap} fontSize={20} strokeWidth={1.5} /> },
        { label: "Phân ca làm việc", href: "/dashboard/shifts", icon: <FontAwesomeIcon icon={faCalendarWeek} fontSize={20} strokeWidth={1.5} /> },
        { label: "Giao việc & Nhiệm vụ", href: "/dashboard/tasks", icon: <FontAwesomeIcon icon={faClipboardList} fontSize={20} strokeWidth={1.5} /> },
        { label: "Duyệt yêu cầu chi nhánh", href: "/dashboard/requests", icon: <FontAwesomeIcon icon={faArrowRightArrowLeft} fontSize={20} strokeWidth={1.5} /> },
        { label: "Bảng công & Lương CN", href: "/dashboard/payslips", icon: <FontAwesomeIcon icon={faCoins} fontSize={20} strokeWidth={1.5} /> },
        { label: "Kết nối Ngân hàng", href: "/dashboard/bank", icon: <FontAwesomeIcon icon={faBuildingColumns} fontSize={20} strokeWidth={1.5} /> },
        { label: "Bảng tin & Thông báo", href: "/dashboard/news", icon: <FontAwesomeIcon icon={faNewspaper} fontSize={20} strokeWidth={1.5} /> },
        { label: "Nội quy & Quy định", href: "/dashboard/regulations", icon: <FontAwesomeIcon icon={faGavel} fontSize={20} strokeWidth={1.5} /> },
        { label: "Thông tin Chi nhánh", href: "/dashboard/branches", icon: <FontAwesomeIcon icon={faStore} fontSize={20} strokeWidth={1.5} /> },
        { label: "Wi-Fi chi nhánh", href: "/dashboard/wifi", icon: <FontAwesomeIcon icon={faWifi} fontSize={20} strokeWidth={1.5} /> },
      ];

  return [
    {
      title: isAdmin ? "QUẢN TRỊ TOÀN CÔNG TY" : "VẬN HÀNH CHI NHÁNH",
      items: hrMenuItems,
    },
  ];
}
