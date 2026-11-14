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
import { apiGet, apiPost, apiPut, apiDelete, GatewayError } from "@/lib/api";
import type { Department } from "@/types";
import DepartmentList from "@/features/departments/DepartmentList";
import DepartmentModal, { type DepartmentFormPayload } from "@/features/departments/DepartmentForm";
import { useCurrentUser } from "@/context/AuthContext";
import { canAccessPath, NoAccessNotice } from "@/lib/permissions";

export default function DepartmentsPage() {
  const { role } = useCurrentUser();
  // Ghi phòng ban (WRITE /api/departments) là nghiệp vụ vận hành: manager +
  // admin làm được, nhân viên không thấy control nào.
  const canWriteDepartments = role !== "staff";

  const [deptList, setDeptList] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "danger" } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [lockTarget, setLockTarget] = useState<Department | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  const showToast = (text: string, tone: "success" | "danger" = "success") => {
    setToast({ text, tone });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const deptData = await apiGet<Department[]>("/api/departments");
      const normalizedDepts = (deptData || []).map((d) => ({
        ...d,
        status: d.status || "hoạt động",
        manager: d.manager || "",
        staff: d.staff ?? 0,
      }));
      setDeptList(normalizedDepts);
    } catch (e: unknown) {
      const msg = e instanceof GatewayError ? e.message : "Không thể tải danh sách phòng ban";
      setError(msg);
      showToast(msg, "danger");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSave = async (data: DepartmentFormPayload) => {
    try {
      setActionInProgress(true);
      if (editing && editing.id) {
        const updated = await apiPut<Department>(`/api/departments/${encodeURIComponent(editing.id)}`, {
          name: data.name,
          managerId: data.managerId || null,
          status: data.status,
          departmentCode: data.departmentCode,
        });
        if (!updated?.id) throw new Error("Phản hồi phòng ban không hợp lệ");
        showToast("Cập nhật phòng ban thành công!", "success");
      } else {
        const created = await apiPost<Department>("/api/departments", {
          name: data.name,
          managerId: data.managerId || null,
          status: data.status || "hoạt động",
          departmentCode: data.departmentCode,
        });
        if (!created?.id) throw new Error("Phản hồi phòng ban không hợp lệ");
        showToast("Thêm phòng ban mới thành công!", "success");
      }
      setModalOpen(false);
      setEditing(null);
      await fetchData();
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi thao tác phòng ban";
      showToast(msg, "danger");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleConfirmLock = async () => {
    if (!lockTarget) return;
    try {
      setActionInProgress(true);
      const nextStatus = lockTarget.status === "hoạt động" ? "tạm dừng" : "hoạt động";
      await apiPut(`/api/departments/${encodeURIComponent(lockTarget.id)}`, {
        status: nextStatus,
      });
      // Đồng bộ lại danh sách từ server (số nhân sự/phòng ban có thể đã đổi).
      await fetchData();
      showToast(
        `Đã chuyển trạng thái "${lockTarget.name}" sang ${nextStatus === "hoạt động" ? "Hoạt động" : "Tạm dừng"}`,
        "success"
      );
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi đổi trạng thái phòng ban";
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
      await apiDelete(`/api/departments/${encodeURIComponent(deleteTarget.id)}`);
      await fetchData();
      showToast(`Đã xóa vĩnh viễn phòng ban "${deleteTarget.name}"`, "success");
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi xóa phòng ban";
      showToast(msg, "danger");
    } finally {
      setActionInProgress(false);
      setDeleteTarget(null);
    }
  };

  if (!canAccessPath(role, "/dashboard/departments")) {
    return <NoAccessNotice description="Cơ cấu phòng ban chỉ dành cho Quản trị viên và Quản lý Chi nhánh." />;
  }

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
        breadcrumb={[{ label: "HRM", href: "#" }, { label: "Phòng ban" }]}
        actions={
          canWriteDepartments ? (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setEditing(null);
                  setModalOpen(true);
                }}
                disabled={actionInProgress}
              >
                <FontAwesomeIcon icon={faPlus} fontSize={18} /> Thêm phòng ban mới
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
          <Button variant="white" size="sm" onClick={fetchData}>
            Thử lại
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
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
        <DepartmentList
          departments={deptList}
          onEdit={(d) => {
            if (canWriteDepartments) {
              setEditing(d);
              setModalOpen(true);
            }
          }}
        />
      )}

      {modalOpen && (
        <DepartmentModal
          key={editing?.id ?? "new"}
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          department={editing}
          onSave={handleSave}
          onLock={canWriteDepartments ? (d) => {
            setModalOpen(false);
            setEditing(null);
            setLockTarget(d);
          } : undefined}
          onDelete={canWriteDepartments ? (d) => {
            setModalOpen(false);
            setEditing(null);
            setDeleteTarget(d);
          } : undefined}
        />
      )}

      {/* Confirm Lock / Toggle status */}
      <ConfirmDialog
        open={!!lockTarget}
        title="Thay đổi trạng thái phòng ban"
        message={`Bạn có chắc muốn ${
          lockTarget?.status === "hoạt động" ? "tạm dừng hoạt động" : "kích hoạt lại"
        } "${lockTarget?.name}"?`}
        confirmLabel={lockTarget?.status === "hoạt động" ? "Tạm dừng" : "Kích hoạt"}
        tone="warning"
        onConfirm={handleConfirmLock}
        onCancel={() => setLockTarget(null)}
      />

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa phòng ban"
        message={`Xóa vĩnh viễn phòng ban "${deleteTarget?.name}"? Các nhân sự thuộc phòng ban này sẽ chuyển sang trạng thái chưa phân bổ phòng ban.`}
        confirmLabel="Xác nhận xóa"
        tone="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
