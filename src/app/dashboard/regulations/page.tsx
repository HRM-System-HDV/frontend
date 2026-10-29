"use client";

import { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import type { Regulation } from "@/types";
import RegulationSection from "@/features/regulations/RegulationList";
import RegulationDetailModal from "@/features/regulations/RegulationDetail";
import RegulationFormModal, { type RegulationFormInput } from "@/features/regulations/RegulationForm";
import { apiGet, apiPost, GATEWAY_URL, GatewayError } from "@/lib/api";

// api.ts dùng chung chưa có apiPut/apiDelete (quy tắc phân công: chỉ đọc, không sửa)
// nên đặt helper cục bộ trong trang, giống tiền lệ các trang employees/payslips/news.
async function parseEnvelope<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const err = (body as { error?: { code: string; message: string } } | null)?.error;
    throw new GatewayError(err?.code || `HTTP_${res.status}`, err?.message || `Lỗi hệ thống (${res.status})`, res.status);
  }
  if (body !== null && typeof body === "object" && "data" in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

async function apiPut<T>(path: string, payload: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${GATEWAY_URL}${path}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return await parseEnvelope<T>(res);
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
    return await parseEnvelope<T>(res);
  } finally {
    clearTimeout(timer);
  }
}

function todayStr(): string {
  return new Date().toLocaleDateString("vi-VN").replace(/\//g, "-");
}

export default function RegulationsManagementPage() {
  const [items, setItems] = useState<Regulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal xem chi tiết
  const [viewingItem, setViewingItem] = useState<Regulation | null>(null);

  // Modal tạo / chỉnh sửa
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Regulation | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<Regulation[]>("/api/regulations");
      setItems(data || []);
    } catch (e) {
      setError(e instanceof GatewayError ? e.message : "Lỗi tải nội quy");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Mở modal tạo mới
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setIsEditModalOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (item: Regulation) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  // Từ modal xem chi tiết → mở modal chỉnh sửa
  const handleEditFromView = (item: Regulation) => {
    setViewingItem(null);
    handleOpenEditModal(item);
  };

  // Lưu tạo mới hoặc cập nhật qua API thật
  const handleSaveItem = async (input: RegulationFormInput) => {
    setSaving(true);
    try {
      if (editingItem) {
        const updated = await apiPut<Regulation>(`/api/regulations/${editingItem.id}`, {
          code: input.code.trim() || editingItem.code,
          title: input.title.trim(),
          category: input.category,
          summary: input.summary.trim() || input.title.trim(),
          content: input.content.trim(),
          status: input.status,
          scope: input.scope,
          effectiveDate: input.effectiveDate,
          author: input.author,
          version: input.version,
          pinned: input.pinned,
        });
        setItems((prev) => prev.map((i) => (i.id === editingItem.id ? updated : i)));
        if (viewingItem?.id === editingItem.id) setViewingItem(updated);
      } else {
        const created = await apiPost<Regulation>("/api/regulations", {
          code: input.code.trim() || `NQ-2026-${String(Date.now()).slice(-6)}`,
          title: input.title.trim(),
          category: input.category,
          summary: input.summary.trim() || input.title.trim(),
          content: input.content.trim(),
          status: input.status,
          scope: input.scope,
          effectiveDate: input.effectiveDate || todayStr(),
          author: input.author.trim() || "Ban Giám Đốc",
          version: input.version || "1.0",
          pinned: input.pinned,
          attachments: 0,
        });
        setItems((prev) => [created, ...prev]);
      }
      setIsEditModalOpen(false);
      setEditingItem(null);
    } catch (e) {
      alert(e instanceof GatewayError ? e.message : "Lỗi lưu văn bản nội quy.");
    } finally {
      setSaving(false);
    }
  };

  // Bật/tắt ghim qua API thật
  const handleTogglePin = async (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    try {
      const updated = await apiPut<Regulation>(`/api/regulations/${id}`, { pinned: !target.pinned });
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
      if (viewingItem?.id === id) setViewingItem(updated);
    } catch (e) {
      alert(e instanceof GatewayError ? e.message : "Lỗi ghim văn bản.");
    }
  };

  // Xóa nội quy qua API thật
  const handleDeleteItem = async (id: string, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa văn bản nội quy "${title}" không?`)) return;
    try {
      await apiDelete(`/api/regulations/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (viewingItem?.id === id) setViewingItem(null);
    } catch (e) {
      alert(e instanceof GatewayError ? e.message : "Lỗi xóa văn bản.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Nội quy & Quy định"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5"
            >
              <FontAwesomeIcon icon={faPlus} fontSize={18} />
              Tạo văn bản nội quy mới
            </Button>
          </div>
        }
      />

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button variant="white" onClick={fetchData} className="text-xs shrink-0">
            Thử lại
          </Button>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse space-y-3">
          <div className="h-4 bg-gray-100 rounded w-1/3" />
          <div className="h-8 bg-gray-100 rounded w-full" />
          <div className="h-8 bg-gray-100 rounded w-full" />
          <div className="text-xs text-gray-500">Đang tải nội quy qua Gateway...</div>
        </div>
      ) : (
        <RegulationSection
          items={items}
          onView={setViewingItem}
          onEdit={handleOpenEditModal}
          onDelete={handleDeleteItem}
          onTogglePin={handleTogglePin}
        />
      )}

      {/* MODAL 1: XEM TOÀN VĂN QUY ĐỊNH */}
      <RegulationDetailModal item={viewingItem} onClose={() => setViewingItem(null)} onEdit={handleEditFromView} />

      {/* MODAL 2: TẠO MỚI / CHỈNH SỬA VĂN BẢN */}
      {isEditModalOpen && (
        <RegulationFormModal
          initial={editingItem}
          defaultCode={`NQ-2026-${String(Date.now()).slice(-6)}`}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSaveItem}
          saving={saving}
        />
      )}
    </div>
  );
}
