"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faUtensils } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

export interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  badgeTone?: "danger" | "primary" | "warning" | "success";
  disabled?: boolean;
}

export interface SidebarGroup {
  title: string;
  items: SidebarItem[];
}

const MIN_WIDTH = 60;
const MAX_WIDTH = 400;

interface SidebarProps {
  brand: string;
  groups: SidebarGroup[];
  collapsed: boolean;
  width: number;
  resizing: boolean;
  onToggle: () => void;
  onLogoClick: () => void;
  onResize: (width: number) => void;
  onResizeStart: () => void;
  onResizeEnd: () => void;
  footer?: { icon: React.ReactNode; text: string };
}

export default function Sidebar({
  brand,
  groups,
  collapsed,
  width,
  resizing,
  onToggle,
  onLogoClick,
  onResize,
  onResizeStart,
  onResizeEnd,
  footer,
}: SidebarProps) {
  const pathname = usePathname();

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    onResizeStart();
    const startX = e.clientX;
    const startWidth = width;
    const handleMove = (ev: PointerEvent) => {
      onResize(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + (ev.clientX - startX))));
    };
    const handleUp = () => {
      onResizeEnd();
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full bg-white border-r border-dashed border-gray-300 z-30 flex flex-col",
        resizing ? "select-none" : "transition-all duration-300"
      )}
      style={{ width }}
    >
      {/* Header Sidebar: Logo + Brand + Nút thu nhỏ bên trong */}
      <div className="h-14 shrink-0 border-b border-dashed border-gray-300 flex items-center justify-between px-3.5">
        <button
          onClick={onLogoClick}
          className="flex items-center gap-2.5 cursor-pointer text-left hover:opacity-85 transition-opacity min-w-0"
          title={brand}
        >
          <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
            <FontAwesomeIcon icon={faUtensils} fontSize={18} />
          </span>
          {!collapsed && (
            <span className="font-bold text-lg text-gray-800 whitespace-nowrap truncate min-w-0">{brand}</span>
          )}
        </button>

        {!collapsed && (
          <button
            onClick={onToggle}
            className="w-7 h-7 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-50 flex items-center justify-center cursor-pointer transition-colors"
            title="Thu nhỏ sidebar"
          >
            <FontAwesomeIcon icon={faChevronLeft} fontSize={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
        {groups.map((group, gi) => (
          <div key={gi} className="mb-2">
            {!collapsed && group.title ? (
              <div className="px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500 truncate">
                {group.title}
              </div>
            ) : null}
            {collapsed && group.title ? <div className="mx-4 my-2 border-t border-gray-200" /> : null}
            <ul className="flex flex-col gap-0.5 px-2">
              {group.items.map((item) => {
                if (item.disabled) {
                  return (
                    <li key={item.href}>
                      <div
                        title={`${item.label} (Ca đã mở)`}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium whitespace-nowrap opacity-40 bg-gray-100 text-gray-400 cursor-not-allowed select-none border border-transparent"
                        )}
                      >
                        <span className="shrink-0">{item.icon}</span>
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate">{item.label}</span>
                            {item.badge && (
                              <span className="text-[10px] font-bold rounded-md px-1.5 py-0.5 bg-gray-200 text-gray-500">
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </li>
                  );
                }
                const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={item.label}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                        active
                          ? "bg-primary-100 text-primary-700"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                      )}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge && (
                            <span
                              className={cn(
                                "text-[10px] font-bold rounded-md px-1.5 py-0.5",
                                item.badgeTone === "danger" && "bg-danger-100 text-danger-700",
                                item.badgeTone === "warning" && "bg-warning-100 text-warning-700",
                                item.badgeTone === "success" && "bg-success-100 text-success-700",
                                (!item.badgeTone || item.badgeTone === "primary") && "bg-primary-100 text-primary-700"
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {footer && (
        <div
          className="border-t border-dashed border-gray-300 flex items-center gap-2 text-xs text-gray-400 p-4"
          title={footer.text}
        >
          {footer.icon}
          {!collapsed && <span className="truncate">{footer.text}</span>}
        </div>
      )}

      {/* Tay cầm kéo thả để chỉnh kích thước sidebar */}
      <div
        onPointerDown={startResize}
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize touch-none z-10 hover:bg-primary/30 active:bg-primary/50 transition-colors"
        title="Kéo để chỉnh kích thước sidebar"
      />
    </aside>
  );
}
