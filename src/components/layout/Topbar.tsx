"use client";

import { useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

interface TopbarProps {
  title?: string;
  headerActions?: React.ReactNode;
  userName: string;
  userRole: string;
  width: number;
  resizing: boolean;
  onLogout?: () => void;
  logoutHref?: string;
  rightExtra?: React.ReactNode; // vd: nút chuyển phân hệ (Web 2 R2)
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

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-20 h-14 bg-white border-b border-gray-200 shadow-2xs",
        resizing ? "" : "transition-all duration-300"
      )}
      style={{ left: width }}
    >
      <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {title && (
            <h1 className="text-base font-bold text-gray-900 tracking-tight whitespace-nowrap">
              {title}
            </h1>
          )}
          {title && rightExtra && <span className="h-4 w-[1px] bg-gray-300 mx-0.5" />}
          {rightExtra}
        </div>

        <div className="flex items-center gap-2">
          {headerActions && (
            <div className="flex items-center gap-2 mr-1">
              {headerActions}
            </div>
          )}

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-gray-100 cursor-pointer"
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
                    onClick={onLogout}
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
