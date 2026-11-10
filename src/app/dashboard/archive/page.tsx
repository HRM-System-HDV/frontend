"use client";

import ArchiveHub from "@/features/archive/ArchiveHub";
import { useCurrentUser } from "@/context/AuthContext";

export default function ArchivePage() {
  const { role } = useCurrentUser();

  if (role !== "admin") {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-2xs">
        <h2 className="text-base font-bold text-gray-900">Không có quyền truy cập</h2>
        <p className="text-sm text-gray-500 mt-1">
          Chức năng lưu trữ dữ liệu chỉ dành cho Quản trị viên.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ArchiveHub />
    </div>
  );
}