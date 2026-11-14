"use client";

import { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTriangleExclamation, faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { useApiDetail, DetailLoadStatus } from "@/hooks/useApiDetail";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { apiGet, apiPost, apiPut, apiDelete, GatewayError } from "@/lib/api";
import type { Department, Position } from "@/types";
import PositionList from "@/features/positions/PositionList";
import PositionModal from "@/features/positions/PositionForm";
import { useCurrentUser } from "@/context/AuthContext";
import { canAccessPath, NoAccessNotice } from "@/lib/permissions";
import { getTodayVN } from "@/lib/utils";

const errorMessage = (e: unknown, fallback: string) =>
  e instanceof GatewayError ? e.message : fallback;

const normalizePosition = (p: Position): Position => ({
  ...p,
  status: (p.status || "hoạt động") as Position["status"],
  departmentId: p.departmentId || null,
  staff: p.staff ?? 0,
  createdAt: p.createdAt || getTodayVN(),
});

export default function PositionsPage() {
  const { role } = useCurrentUser();
  // Trang admin-only: organization-service chặn ghi danh mục vị trí bằng
  // assertAdmin nên không có nhánh "manager chỉ đọc" ở đây. Manager và nhân viên
  // vẫn chọn chức danh trực tiếp trên hồ sơ (GET /api/positions để mở).
  const [positionList, setPositionList] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "danger" } | null>(null);

  const detail = useApiDetail();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [lockTarget, setLockTarget] = useState<Position | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Position | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  const showToast = (text: string, tone: "success" | "danger" = "success") => {
    setToast({ text, tone });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    try {
      const [positionData, departmentData] = await Promise.all([
        apiGet<Position[]>("/api/positions"),
        apiGet<Department[]>("/api/departments"),
      ]);
      setPositionList((positionData || []).map(normalizePosition));
      setDepartments(departmentData || []);
      setError(null);
    } catch (e: unknown) {
      const msg = errorMessage(e, "Không thể tải danh mục vị trí");
      setError(msg);
      showToast(msg, "danger");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    Promise.all([apiGet<Position[]>("/api/positions"), apiGet<Department[]>("/api/departments")])
      .then(([positionData, departmentData]) => {
        if (ignore) return;
        setPositionList((positionData || []).map(normalizePosition));
        setDepartments(departmentData || []);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (ignore) return;
        const msg = errorMessage(e, "Không thể tải danh mục vị trí");
        setError(msg);
        showToast(msg, "danger");
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const handleSave = async (data: Omit<Position, "id"> & { id?: string }) => {
    try {
      setActionInProgress(true);
      const payload = {
        name: data.name,
        positionCode: data.positionCode,
        departmentId: data.departmentId || null,
        status: data.status,
      };
      if (editing?.id) {
        await apiPut<Position>(`/api/positions/${encodeURIComponent(editing.id)}`, payload);
        showToast("Cập nhật vị trí thành công!", "success");
      } else {
        await apiPost<Position>("/api/positions", payload);
        showToast("Thêm vị trí mới thành công!", "success");
      }
      setModalOpen(false);
      setEditing(null);
      await fetchData();
    } catch (e: unknown) {
      showToast(errorMessage(e, "Lỗi thao tác vị trí"), "danger");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleConfirmLock = async () => {
    if (!lockTarget) return;
    try {
      setActionInProgress(true);
      const nextStatus = lockTarget.status === "hoạt động" ? "tạm dừng" : "hoạt động";
      await apiPut(`/api/positions/${encodeURIComponent(lockTarget.id)}`, { status: nextStatus });
      await fetchData();
      showToast(
        `Đã chuyển trạng thái "${lockTarget.name}" sang ${nextStatus === "hoạt động" ? "Hoạt động" : "Tạm dừng"}`,
        "success"
      );
    } catch (e: unknown) {
      showToast(errorMessage(e, "Lỗi khi đổi trạng thái vị trí"), "danger");
    } finally {
      setActionInProgress(false);
      setLockTarget(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setActionInProgress(true);
      await apiDelete(`/api/positions/${encodeURIComponent(deleteTarget.id)}`);
      await fetchData();
      showToast(`Đã xóa vĩnh viễn vị trí "${deleteTarget.name}"`, "success");
    } catch (e: unknown) {
      showToast(errorMessage(e, "Lỗi khi xóa vị trí"), "danger");
    } finally {
      setActionInProgress(false);
      setDeleteTarget(null);
    }
  };

  if (!canAccessPath(role, "/dashboard/positions")) {
    return (
      <NoAccessNotice description="Danh mục vị trí chỉ dành cho Quản trị viên. Quản lý và nhân viên chọn chức danh trực tiếp trên hồ sơ nhân sự." />
    );
  }

  return (
    <div className="space-y-4">
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
          <button onClick={() => setToast(null)} className="ml-2 text-xs opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      <DetailLoadStatus loading={detail.loading} error={detail.error} />
      <PageHeader
        breadcrumb={[{ label: "HRM", href: "#" }, { label: "Vị trí" }]}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            disabled={actionInProgress}
          >
            <FontAwesomeIcon icon={faPlus} fontSize={18} /> Thêm vị trí mới
          </Button>
        }
      />

      {error && !loading && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50/80 flex items-center justify-between text-sm text-red-700">
          <div className="flex items-center gap-2.5">
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500 text-base" />
            <span>{error}</span>
          </div>
          <Button variant="white" size="sm" onClick={fetchData}>
            Thử lại
          </Button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="h-6 w-44 bg-gray-200 rounded animate-pulse" />
            <div className="h-9 w-60 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 bg-gray-100/80 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <PositionList
          positions={positionList}
          departments={departments}
          onEdit={(p) => {
            void detail.loadDetail<Position>(`/api/positions/${encodeURIComponent(p.id)}`, (row) => {
              setEditing(normalizePosition(row));
              setModalOpen(true);
            });
          }}
        />
      )}

      {modalOpen && (
        <PositionModal
          key={editing?.id ?? "new"}
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          position={editing}
          departments={departments}
          onSave={handleSave}
          onLock={(p) => {
            setModalOpen(false);
            setEditing(null);
            setLockTarget(p);
          }}
          onDelete={(p) => {
            setModalOpen(false);
            setEditing(null);
            setDeleteTarget(p);
          }}
        />
      )}

      <ConfirmDialog
        open={!!lockTarget}
        title="Thay đổi trạng thái vị trí"
        message={`Bạn có chắc muốn ${
          lockTarget?.status === "hoạt động" ? "tạm dừng" : "kích hoạt lại"
        } "${lockTarget?.name}"? Vị trí tạm dừng vẫn nằm trong ${
          lockTarget?.staff ?? 0
        } hồ sơ đang dùng và không bị gỡ khỏi nhân sự.`}
        confirmLabel={lockTarget?.status === "hoạt động" ? "Tạm dừng" : "Kích hoạt"}
        tone="warning"
        onConfirm={handleConfirmLock}
        onCancel={() => setLockTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa vị trí / chức danh"
        message={
          (deleteTarget?.staff ?? 0) > 0
            ? `${deleteTarget?.staff} hồ sơ nhân sự đang dùng chức danh này. Xóa sẽ bỏ trống chức danh của họ (kể cả hồ sơ đã nghỉ việc) và không thể hoàn tác. Xác nhận xóa "${deleteTarget?.name}"?`
            : `Xóa vĩnh viễn vị trí "${deleteTarget?.name}"? Không có hồ sơ nhân sự nào đang dùng chức danh này.`
        }
        confirmLabel="Xác nhận xóa"
        tone="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
