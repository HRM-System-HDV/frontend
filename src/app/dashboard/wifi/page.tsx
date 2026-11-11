"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import type { WifiConfig, Branch } from "@/types";
import WifiTableSection from "@/features/wifi/WifiList";
import { useCurrentUser } from "@/context/AuthContext";
import { canAccessPath, NoAccessNotice } from "@/lib/permissions";
import { apiGet, apiDelete, GatewayError } from "@/lib/api";

export default function WifiPage() {
  const { role } = useCurrentUser();
  const isAdmin = role === "admin";
  const [configs, setConfigs] = useState<WifiConfig[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    apiGet<Branch[]>("/api/branches")
      .then((data) => {
        if (!ignore) setBranches(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

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

  // Cấu hình Wi-Fi là tính năng hệ thống (gateway: WRITE wifi-configs = admin)
  // nên admin xem toàn bộ chi nhánh, không có chế độ lọc theo chi nhánh.
  if (!canAccessPath(role, "/dashboard/wifi")) {
    return <NoAccessNotice />;
  }

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
          <WifiTableSection
            configs={configs}
            onDelete={isAdmin ? handleDelete : undefined}
            branchLabel={(slug) =>
              branches.find((b) => b.slug.toLowerCase() === slug.toLowerCase())?.name || slug
            }
          />
        )}
      </div>
    </div>
  );
}
