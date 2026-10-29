"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Sidebar, { SidebarGroup } from "./Sidebar";
import Topbar from "./Topbar";
import { TopbarProvider, useTopbar } from "@/context/TopbarContext";
import { cn } from "@/lib/utils";

interface SidebarWidths {
  width: number;
  expanded: number;
}

const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// Cache snapshot theo giá trị localStorage — bắt buộc để getSnapshot
// trả về cùng tham chiếu khi dữ liệu không đổi (tránh infinite loop)
let cachedRaw: string | null = null;
let cachedSnapshot: SidebarWidths | null = null;

function readWidths(): SidebarWidths | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem("sidebar-width");
    const savedExpanded = localStorage.getItem("sidebar-expanded-width");
    const raw = `${saved ?? ""}|${savedExpanded ?? ""}`;
    if (raw === cachedRaw) return cachedSnapshot;
    cachedRaw = raw;
    if (!saved && !savedExpanded) {
      cachedSnapshot = null;
      return null;
    }
    const width = saved ? parseInt(saved, 10) : 0;
    const expanded = savedExpanded ? parseInt(savedExpanded, 10) : width;
    if (Number.isNaN(width) || Number.isNaN(expanded)) {
      cachedSnapshot = null;
      return null;
    }
    cachedSnapshot = { width, expanded };
    return cachedSnapshot;
  } catch {
    cachedSnapshot = null;
    return null;
  }
}

function persistWidths({ width, expanded }: SidebarWidths) {
  try {
    localStorage.setItem("sidebar-width", String(width));
    if (width > 90) localStorage.setItem("sidebar-expanded-width", String(width));
    else if (expanded > 90) localStorage.setItem("sidebar-expanded-width", String(expanded));
    listeners.forEach((l) => l());
  } catch {
    /* ignore */
  }
}

interface DashboardShellProps {
  brand: string;
  groups: SidebarGroup[];
  userName: string;
  userRole: string;
  notifications?: { id: string; title: string; content: string; time: string; read: boolean; tone?: string }[];
  logoutHref: string;
  sidebarFooter?: { icon: React.ReactNode; text: string };
  rightExtra?: React.ReactNode;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}

function DashboardShellContent({
  brand,
  groups,
  userName,
  userRole,
  logoutHref,
  sidebarFooter,
  rightExtra,
  defaultCollapsed = true,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const saved = useSyncExternalStore(subscribe, readWidths, () => null);
  const fallbackWidth = defaultCollapsed ? 60 : 250;
  const width = saved?.width ?? fallbackWidth;
  const expandedWidth = saved?.expanded ?? 250;
  const [resizing, setResizing] = useState(false);
  const { headerTitle, headerActions } = useTopbar();

  const collapsed = width <= 90;

  // Tìm title của trang hiện tại dựa vào pathname và groups (fallback khi PageHeader không set title)
  let activeTitle = headerTitle ?? "";
  if (!activeTitle) {
    for (const group of groups) {
      const item = group.items.find(
        (it) => pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href))
      );
      if (item) {
        activeTitle = item.label;
        break;
      }
    }
  }

  // Spec: bấm logo → mở rộng sidebar (+ về dashboard qua link logo)
  const handleLogoClick = () => persistWidths({ width: expandedWidth, expanded: expandedWidth });
  const handleToggle = () => {
    if (width <= 90) {
      persistWidths({ width: expandedWidth, expanded: expandedWidth });
    } else {
      persistWidths({ width: 60, expanded: width });
    }
  };

  return (
    <div>
      <Sidebar
        brand={brand}
        groups={groups}
        collapsed={collapsed}
        width={width}
        resizing={resizing}
        onToggle={handleToggle}
        onLogoClick={handleLogoClick}
        onResize={(w) => persistWidths({ width: w, expanded: w > 90 ? w : expandedWidth })}
        onResizeStart={() => setResizing(true)}
        onResizeEnd={() => setResizing(false)}
        footer={sidebarFooter}
      />
      <div
        className={cn(
          "min-h-screen pt-14 px-4 lg:px-6 pb-3",
          resizing ? "" : "transition-all duration-300"
        )}
        style={{ marginLeft: width }}
      >
        <Topbar
          title={activeTitle}
          headerActions={headerActions}
          userName={userName}
          userRole={userRole}
          width={width}
          resizing={resizing}
          logoutHref={logoutHref}
          rightExtra={rightExtra}
        />
        <main className="pt-4">{children}</main>
        <footer className="text-xs text-gray-400 text-center mt-4 pb-2">
          © 2026 HR System — Hệ thống quản lý Nhân sự chung
        </footer>
      </div>
    </div>
  );
}

export default function DashboardShell(props: DashboardShellProps) {
  return (
    <TopbarProvider>
      <DashboardShellContent {...props} />
    </TopbarProvider>
  );
}
