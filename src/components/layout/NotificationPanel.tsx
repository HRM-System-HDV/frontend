"use client";

import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faCheckDouble, faXmark } from "@fortawesome/free-solid-svg-icons";
import { cn, formatDateTime } from "@/lib/utils";

// Trường đúng với bản ghi notification mà integration-service trả về qua gateway:
// body / createdAt / isRead (không phải content / time / read).
interface NotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  tone?: string;
}

export type { NotificationItem };

const toneDot: Record<string, string> = {
  primary: "bg-primary",
  info: "bg-info-700",
  danger: "bg-danger",
  warning: "bg-warning-700",
  success: "bg-success",
};

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  error?: string;
  busy?: boolean;
}

export default function NotificationPanel({
  open,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  error,
  busy,
}: NotificationPanelProps) {
  const [tab, setTab] = useState<"all" | "unread">("all");
  const items = notifications;

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const list = tab === "all" ? items : items.filter((n) => !n.isRead);
  const unreadCount = items.filter((n) => !n.isRead).length;

  const markAllRead = () => {
    onMarkAllRead?.();
  };

  const markRead = (id: string) => {
    onMarkRead?.(id);
  };

  return (
    <>
      {/* Invisible backdrop overlay to catch clicks outside */}
      <div
        className="fixed inset-0 z-20 cursor-default"
        onClick={onClose}
        aria-hidden
      />

      {/* Popover Dropdown panel anchored under icon */}
      <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-gray-200 shadow-2xl z-30 flex flex-col max-h-[480px] overflow-hidden">
        {/* Popover Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faBell} fontSize={18} className="text-gray-700" />
            <h5 className="mb-0 font-semibold text-sm text-gray-900">Thông báo</h5>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger-100 text-danger-700">
                {unreadCount} mới
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={busy}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
                title="Đánh dấu tất cả là đã đọc"
              >
                <FontAwesomeIcon icon={faCheckDouble} fontSize={15} />
                Đã đọc tất cả
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
              aria-label="Đóng"
            >
              <FontAwesomeIcon icon={faXmark} fontSize={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-2 flex gap-2 border-b border-gray-200 bg-gray-50/50">
          {(["all", "unread"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "pb-2 px-2.5 text-xs font-medium border-b-2 -mb-px transition-colors cursor-pointer flex items-center gap-1.5",
                tab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              <span>{t === "all" ? "Tất cả" : "Chưa đọc"}</span>
              {t === "unread" && unreadCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-danger text-white text-[9px] flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notification Item List */}
        {error && <p role="alert" className="px-4 py-2 text-xs text-red-700 bg-red-50">{error}</p>}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {list.length === 0 ? (
            <div className="text-center py-10 px-4 text-gray-400">
              <FontAwesomeIcon icon={faBell} fontSize={32} className="mx-auto mb-1.5 opacity-30" />
              <p className="text-xs font-medium">Không có thông báo nào</p>
            </div>
          ) : (
            list.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                disabled={busy || n.isRead}
                className={cn(
                  "w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer block",
                  !n.isRead ? "bg-primary-50/30" : "bg-white"
                )}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          n.isRead ? "bg-gray-300" : toneDot[n.tone ?? "primary"]
                        )}
                      />
                      <div className="text-xs font-semibold text-gray-900 truncate">{n.title}</div>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-normal line-clamp-2">{n.body}</p>
                    <div className="text-[10px] text-gray-400 mt-1">
                      {formatDateTime(n.createdAt) || n.createdAt}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
