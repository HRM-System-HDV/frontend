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
import type { Branch, BranchManagerCandidate } from "@/types";
import BranchSection from "@/features/branches/BranchList";
import BranchModal, { type BranchFormPayload } from "@/features/branches/BranchForm";
import { useCurrentUser } from "@/context/AuthContext";
import { canAccessPath, NoAccessNotice } from "@/lib/permissions";

export default function BranchesPage() {
  const { role, branchId } = useCurrentUser();
  // BE kiểm tra phạm vi chi nhánh khi Manager sửa hoặc xóa.
  const isAdmin = role === "admin";
  const canWriteBranches = isAdmin || role === "manager";

  const [list, setList] = useState<Branch[]>([]);
  const [managerCandidates, setManagerCandidates] = useState<BranchManagerCandidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesError, setCandidatesError] = useState("");
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
    if (!canAccessPath(role, "/dashboard/branches")) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<Branch[]>("/api/branches");
      const normalized = (data || []).map((b) => ({
        ...b,
        status: b.status || "hoạt động",
        staff: b.staff ?? 0,
      }));
      setList(normalized);
    } catch (e: unknown) {
      const msg = e instanceof GatewayError ? e.message : "Không thể tải danh sách chi nhánh";
      setError(msg);
      showToast(msg, "danger");
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    void fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    if (!modalOpen || !editing || (!isAdmin && editing.id !== branchId)) { setManagerCandidates([]); setCandidatesLoading(false); setCandidatesError(""); return; }
    let active = true;
    setCandidatesLoading(true); setCandidatesError(""); setManagerCandidates([]);
    apiGet<BranchManagerCandidate[]>(`/api/branches/${encodeURIComponent(editing.id)}/manager-candidates`)
      .then(rows => { if (active) setManagerCandidates(rows); })
      .catch(error => { if (active) setCandidatesError(error instanceof Error ? error.message : "Không tải được danh sách quản lý"); })
      .finally(() => { if (active) setCandidatesLoading(false); });
    return () => { active = false; };
  }, [modalOpen, editing?.id, isAdmin, branchId]);

  const handleSave = async (data: BranchFormPayload) => {
    try {
      setActionInProgress(true);
      if (editing && editing.id) {
        // Cập nhật chi nhánh hiện có qua PUT /api/branches/:branchId
        const updated = await apiPut<Branch>(`/api/branches/${encodeURIComponent(editing.id)}`, {
          name: data.name,
          address: data.address,
          managerId: data.managerId,
          status: data.status,
        });
        if (!updated?.id) throw new Error("Phản hồi chi nhánh không hợp lệ");
        showToast("Cập nhật chi nhánh thành công!", "success");
      } else {
        // Tạo chi nhánh mới qua POST /api/branches
        const created = await apiPost<Branch>("/api/branches", {
          name: data.name,
          address: data.address,
          managerId: data.managerId,
          status: data.status || "hoạt động",
        });
        if (!created?.id) throw new Error("Phản hồi chi nhánh không hợp lệ");
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
      await apiPut(`/api/branches/${encodeURIComponent(lockTarget.id)}`, {
        status: "vô hiệu hóa",
      });
      await fetchBranches();
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
      await apiDelete(`/api/branches/${encodeURIComponent(deleteTarget.id)}`);
      await fetchBranches();
      showToast(`Đã xóa vĩnh viễn chi nhánh "${deleteTarget.name}"`, "success");
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi xóa chi nhánh";
      showToast(msg, "danger");
    } finally {
      setActionInProgress(false);
      setDeleteTarget(null);
    }
  };

  if (!canAccessPath(role, "/dashboard/branches")) {
    return <NoAccessNotice />;
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
        breadcrumb={[{ label: "HRM", href: "#" }, { label: "Chi nhánh" }]}
        actions={
          canWriteBranches ? (
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
            if (canWriteBranches) {
              setEditing(b);
              setModalOpen(true);
            }
          }}
        />
      )}

      {modalOpen && (
        <BranchModal
          key={editing?.id ?? "new"}
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          branch={editing}
          employees={managerCandidates}
          candidatesLoading={candidatesLoading}
          candidatesError={candidatesError}
          readOnly={Boolean(editing) && !isAdmin && editing?.id !== branchId}
          saving={actionInProgress}
          onSave={handleSave}
          onLock={(isAdmin || editing?.id === branchId) ? (b) => {
            setModalOpen(false);
            setEditing(null);
            setLockTarget(b);
          } : undefined}
          onDelete={(isAdmin || editing?.id === branchId) ? (b) => {
            setModalOpen(false);
            setEditing(null);
            setDeleteTarget(b);
          } : undefined}
        />
      )}

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
