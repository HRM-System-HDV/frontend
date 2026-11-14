"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";
import NotificationPanel, { NotificationItem } from "./NotificationPanel";
import { apiGet, apiPut } from "@/lib/api";

interface TopbarProps {
  title?: string;
  headerActions?: React.ReactNode;
  userName: string;
  userRole: string;
  width: number;
  resizing: boolean;
  onLogout?: () => void;
  logoutHref?: string;
  rightExtra?: React.ReactNode;
}

export default function Topbar({
  title,
  headerActions,
  userName,
  userRole,
  width,
  resizing,
  onLogout,
  logoutHref = "/login",
  rightExtra,
}: TopbarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    let ignore = false;
    apiGet<NotificationItem[]>("/api/notifications")
      .then((data) => {
        if (!ignore && Array.isArray(data)) {
          setNotifications(data);
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await apiPut(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      /* ignore */
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiPut("/api/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      /* ignore */
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-20 h-14 bg-white border-b border-gray-200 shadow-2xs",
        resizing ? "" : "transition-all duration-300"
      )}
      style={{ left: width }}
    >
      <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {title && (
            <h1 className="text-base font-bold text-gray-900 tracking-tight truncate">
              {title}
            </h1>
          )}
          {title && rightExtra && <span className="h-4 w-[1px] bg-gray-300 mx-0.5 shrink-0" />}
          {rightExtra}
        </div>

        <div className="flex items-center gap-2 min-w-0">
          {/* Thanh cao cố định 56px: actions luôn ở một hàng và cuộn ngang khi
              hẹp, để tiêu đề không bị đẩy/tràn khỏi header.
              Các nút action chốt h-9 (36px) vì Button không đặt chiều cao tĩnh,
              nên height dao động 36-38px theo fontSize của icon bên trong. */}
          {headerActions && (
            <div
              key={pathname}
              className="flex items-center gap-2 mr-1 min-w-0 flex-nowrap overflow-x-auto [scrollbar-width:none] [&>div]:flex-nowrap [&>div>*]:shrink-0 [&>button]:h-9 [&>div>button]:h-9"
            >
              {headerActions}
            </div>
          )}

          {/* Notifications button & popover */}
          <div className="relative shrink-0">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative h-9 w-9 inline-flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Thông báo"
            >
              <FontAwesomeIcon icon={faBell} fontSize={16} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
            <NotificationPanel
              open={notifOpen}
              onClose={() => setNotifOpen(false)}
              notifications={notifications}
              onMarkRead={handleMarkRead}
              onMarkAllRead={handleMarkAllRead}
            />
          </div>

          {/* User menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-1.5 h-9 rounded-lg hover:bg-gray-100 cursor-pointer"
            >
              <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                {userName.charAt(0)}
              </span>
              <span className="hidden lg:block text-left">
                <span className="block text-sm font-semibold text-gray-800 leading-tight">{userName}</span>
                <span className="block text-xs text-gray-500 leading-tight">{userRole}</span>
              </span>
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-lg z-20 py-2">
                  <div className="px-4 py-2 border-b border-dashed border-gray-300 mb-1">
                    <div className="font-semibold text-gray-800 text-sm">{userName}</div>
                    <div className="text-xs text-gray-500">{userRole}</div>
                  </div>
                  <Link
                    href={logoutHref}
                    onClick={async (e) => {
                      if (onLogout) {
                        e.preventDefault();
                        await onLogout();
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                  >
                    <FontAwesomeIcon icon={faRightFromBracket} fontSize={18} />
                    Đăng xuất
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
