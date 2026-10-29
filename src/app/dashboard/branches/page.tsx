"use client";

import { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTriangleExclamation,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { apiGet, apiPost, GatewayError, GATEWAY_URL } from "@/lib/api";
import type { Branch, Employee } from "@/types";
import BranchSection from "@/features/branches/BranchList";
import BranchModal from "@/features/branches/BranchForm";
import { useCurrentUser } from "@/context/AuthContext";

async function parseEnvelope(res: Response) {
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const err = (body as { error?: { code: string; message: string } } | null)?.error;
    throw new GatewayError(
      err?.code || `HTTP_${res.status}`,
      err?.message || `Lỗi hệ thống (${res.status})`,
      res.status
    );
  }
  if (body !== null && typeof body === "object" && "data" in body) {
    return (body as { data: unknown }).data;
  }
  return body;
}

async function apiPut<T>(path: string, payload?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${GATEWAY_URL}${path}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
      signal: controller.signal,
    });
    return (await parseEnvelope(res)) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function apiDelete<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${GATEWAY_URL}${path}`, {
      method: "DELETE",
      credentials: "include",
      signal: controller.signal,
    });
    return (await parseEnvelope(res)) as T;
  } finally {
    clearTimeout(timer);
  }
}

export default function BranchesPage() {
  const { role } = useCurrentUser();
  const isManager = role === "manager";

  const [list, setList] = useState<Branch[]>([]);
  const [empList, setEmpList] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "danger" } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [lockTarget, setLockTarget] = useState<Branch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  const showToast = (text: string, tone: "success" | "danger" = "success") => {
    setToast({ text, tone });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, empData] = await Promise.all([
        apiGet<Branch[]>("/api/branches"),
        apiGet<Employee[]>("/api/employees").catch(() => []),
      ]);
      const normalized = (data || []).map((b: any) => ({
        ...b,
        status: b.status || "hoạt động",
        staff: b.staff ?? 0,
      }));
      setList(normalized);
      setEmpList(empData || []);
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Không thể tải danh sách chi nhánh";
      setError(msg);
      showToast(msg, "danger");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const handleSave = async (data: Omit<Branch, "id"> & { id?: string }) => {
    try {
      setActionInProgress(true);
      if (editing && editing.slug) {
        // Cập nhật chi nhánh hiện có qua PUT /api/branches/:slug
        const updated = await apiPut<Branch>(`/api/branches/${encodeURIComponent(editing.slug)}`, {
          name: data.name,
          address: data.address,
          manager: data.manager,
          status: data.status,
          staff: data.staff,
        });
        setList((prev) =>
          prev.map((b) => (b.slug === editing.slug ? (updated || { ...b, ...data }) : b))
        );
        showToast("Cập nhật chi nhánh thành công!", "success");
      } else {
        // Tạo chi nhánh mới qua POST /api/branches
        const created = await apiPost<Branch>("/api/branches", {
          name: data.name,
          address: data.address,
          manager: data.manager,
          status: data.status || "hoạt động",
          staff: data.staff ?? 0,
        });
        setList((prev) => [...prev, created || { id: `br-${Date.now()}`, ...data, staff: data.staff ?? 0 }]);
        showToast("Thêm chi nhánh mới thành công!", "success");
      }
      setModalOpen(false);
      setEditing(null);
      await fetchBranches();
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi thao tác chi nhánh";
      showToast(msg, "danger");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleConfirmLock = async () => {
    if (!lockTarget) return;
    try {
      setActionInProgress(true);
      await apiPut(`/api/branches/${encodeURIComponent(lockTarget.slug)}`, {
        status: "vô hiệu hóa",
      });
      setList((prev) =>
        prev.map((b) => (b.id === lockTarget.id ? { ...b, status: "vô hiệu hóa" as const } : b))
      );
      showToast(`Đã vô hiệu hóa chi nhánh "${lockTarget.name}"`, "success");
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi vô hiệu hóa chi nhánh";
      showToast(msg, "danger");
    } finally {
      setActionInProgress(false);
      setLockTarget(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setActionInProgress(true);
      await apiDelete(`/api/branches/${encodeURIComponent(deleteTarget.slug)}`);
      setList((prev) => prev.filter((e) => e.slug !== deleteTarget.slug));
      showToast(`Đã xóa vĩnh viễn chi nhánh "${deleteTarget.name}"`, "success");
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi xóa chi nhánh";
      showToast(msg, "danger");
    } finally {
      setActionInProgress(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast thông báo nổi */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all ${
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
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      <PageHeader
        title={isManager ? "Thông tin Hệ thống Chi nhánh" : "Quản lý Chi nhánh Doanh nghiệp"}
        breadcrumb={[{ label: "HRM", href: "#" }, { label: "Chi nhánh" }]}
        actions={
          !isManager ? (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setEditing(null);
                  setModalOpen(true);
                }}
                disabled={actionInProgress}
              >
                <FontAwesomeIcon icon={faPlus} fontSize={18} /> Thêm chi nhánh mới
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Hiển thị lỗi tải nếu có */}
      {error && !loading && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50/80 flex items-center justify-between text-sm text-red-700">
          <div className="flex items-center gap-2.5">
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500 text-base" />
            <span>{error}</span>
          </div>
          <Button variant="white" size="sm" onClick={fetchBranches}>
            Thử lại
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-4 w-44 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-36 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <BranchSection
          branches={list}
          onEdit={(b) => {
            if (!isManager) {
              setEditing(b);
              setModalOpen(true);
            }
          }}
          onLock={!isManager ? setLockTarget : undefined}
          onDelete={!isManager ? setDeleteTarget : undefined}
        />
      )}

      <BranchModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        branch={editing}
        employees={empList}
        onSave={handleSave}
        onDelete={!isManager ? (b) => {
          setModalOpen(false);
          setEditing(null);
          setDeleteTarget(b);
        } : undefined}
      />

      <ConfirmDialog
        open={!!lockTarget}
        title="Khóa chi nhánh"
        message={`Khóa "${lockTarget?.name}"? Chi nhánh sẽ chuyển sang trạng thái vô hiệu hóa.`}
        confirmLabel="Xác nhận khóa"
        tone="warning"
        onConfirm={handleConfirmLock}
        onCancel={() => setLockTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa chi nhánh"
        message={`Xóa vĩnh viễn "${deleteTarget?.name}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xác nhận xóa"
        tone="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
