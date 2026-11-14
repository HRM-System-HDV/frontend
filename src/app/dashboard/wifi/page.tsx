"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import type { WifiConfig, Branch } from "@/types";
import WifiTableSection from "@/features/wifi/WifiList";
import { useCurrentUser } from "@/context/AuthContext";
import { canAccessPath, NoAccessNotice } from "@/lib/permissions";
import { apiGet, apiDelete, GatewayError } from "@/lib/api";

const errorMessage = (e: unknown, fallback: string) =>
  e instanceof GatewayError ? e.message : fallback;

export default function WifiPage() {
  const { role } = useCurrentUser();
  const isAdmin = role === "admin";
  const allowed = canAccessPath(role, "/dashboard/wifi");
  const [configs, setConfigs] = useState<WifiConfig[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "danger" } | null>(null);

  const showToast = (text: string, tone: "success" | "danger" = "success") => {
    setToast({ text, tone });
    setTimeout(() => setToast(null), 4000);
  };

  const refetch = () => setReloadToken((token) => token + 1);

  useEffect(() => {
    // integration-service trả 403 cho vai trò ngoài admin: đừng gọi API khi trang
    // đã chặn — nếu không bảng lỗi hiện ra sau màn "Không có quyền truy cập".
    if (!allowed) return undefined;
    let ignore = false;
    Promise.all([
      apiGet<WifiConfig[]>("/api/wifi-configs"),
      apiGet<Branch[]>("/api/branches").catch(() => [] as Branch[]),
    ])
      .then(([wifiData, branchData]) => {
        if (ignore) return;
        setConfigs(wifiData || []);
        setBranches(Array.isArray(branchData) ? branchData : []);
        setError(null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (ignore) return;
        setError(errorMessage(e, "Lỗi tải cấu hình Wi-Fi"));
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [reloadToken, allowed]);

  const handleDelete = async (id: string) => {
    try {
      await apiDelete(`/api/wifi-configs/${encodeURIComponent(id)}`);
      showToast("Đã xóa cấu hình Wi-Fi");
      refetch();
    } catch (e: unknown) {
      showToast(errorMessage(e, "Không thể xóa Wi-Fi"), "danger");
    }
  };

  // Trang chỉ có đọc + xóa, không có thêm/sửa: SSID/BSSID chỉ đọc được từ thiết bị
  // đang bắt sóng nên màn hình quản trị Wi-Fi nằm ở app Mobile
  // (mobile/lib/src/features/wifi_config, docs/SERVICES_FEATURES.md:127).
  // Web là nơi admin kiểm tra danh sách đã cấu hình, nên chỉ cần đọc và gỡ cấu hình sai.
  if (!allowed) {
    return <NoAccessNotice />;
  }

  return (
    <div>
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium ${
            toast.tone === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <FontAwesomeIcon
            icon={toast.tone === "success" ? faCircleCheck : faTriangleExclamation}
            className="text-base"
          />
          <span>{toast.text}</span>
        </div>
      )}

      <PageHeader
        breadcrumb={[{ label: "HR", href: "#" }, { label: "Wi-Fi chấm công" }]}
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button variant="white" onClick={refetch} className="text-xs shrink-0">
            Thử lại
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse space-y-3">
            <div className="h-4 bg-gray-100 rounded w-1/3" />
            <div className="h-8 bg-gray-100 rounded w-full" />
            <div className="text-xs text-gray-500">Đang tải cấu hình Wi-Fi qua Gateway...</div>
          </div>
        ) : (
          <WifiTableSection
            configs={configs}
            onDelete={isAdmin ? handleDelete : undefined}
            branchLabel={(branchId) => branches.find((b) => b.id === branchId)?.name || branchId}
          />
        )}
      </div>
    </div>
  );
}
