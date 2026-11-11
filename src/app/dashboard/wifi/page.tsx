"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import type { WifiConfig } from "@/types";
import WifiTableSection from "@/features/wifi/WifiList";
import { useCurrentUser } from "@/context/AuthContext";
import { apiGet, apiDelete, GatewayError } from "@/lib/api";

export default function WifiPage() {
  const { role, branchSlug } = useCurrentUser();
  const isManager = role === "manager";
  const [configs, setConfigs] = useState<WifiConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    apiGet<WifiConfig[]>("/api/wifi-configs")
      .then((data) => {
        if (!ignore) {
          setConfigs(data || []);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!ignore) {
          setError(e instanceof GatewayError ? e.message : "Lỗi tải cấu hình Wi-Fi");
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const handleRefetch = () => {
    setLoading(true);
    setError(null);
    apiGet<WifiConfig[]>("/api/wifi-configs")
      .then((data) => {
        setConfigs(data || []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof GatewayError ? e.message : "Lỗi tải cấu hình Wi-Fi");
        setLoading(false);
      });
  };

  const handleDelete = async (id: string) => {
    try {
      await apiDelete(`/api/wifi-configs/${id}`);
      setConfigs((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa Wi-Fi");
    }
  };

  const filteredConfigs = useMemo(
    () => (isManager ? configs.filter((c) => c.branch.toLowerCase().replace("-", "") === branchSlug.replace("-", "")) : configs),
    [configs, isManager, branchSlug]
  );

  return (
    <div>
      <PageHeader
        breadcrumb={[{ label: "HR", href: "#" }, { label: "Wi-Fi chấm công" }]}
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button variant="white" onClick={handleRefetch} className="text-xs shrink-0">
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
          <WifiTableSection configs={filteredConfigs} onDelete={handleDelete} />
        )}
      </div>
    </div>
  );
}
