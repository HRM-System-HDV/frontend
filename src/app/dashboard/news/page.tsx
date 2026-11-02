"use client";

import { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import type { NewsItem } from "@/features/news/types";
import NewsSection from "@/features/news/NewsList";
import NewsDetailModal from "@/features/news/NewsDetail";
import CreateNewsModal, { type NewsFormPayload } from "@/features/news/NewsForm";
import { apiGet, apiPost, GATEWAY_URL, GatewayError } from "@/lib/api";

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

export default function NewsPage() {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NewsItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<NewsItem[]>("/api/news");
      setNewsList(data || []);
    } catch (e) {
      setError(e instanceof GatewayError ? e.message : "Lỗi tải bảng tin");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: NewsItem) => {
    setSelectedNews(null);
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleSubmit = async (payload: NewsFormPayload) => {
    setSaving(true);
    try {
      if (editingItem) {
        const updated = await apiPut<NewsItem>(`/api/news/${editingItem.id}`, payload);
        setNewsList((prev) => prev.map((n) => (n.id === editingItem.id ? updated : n)));
        if (selectedNews?.id === editingItem.id) setSelectedNews(updated);
      } else {
        const created = await apiPost<NewsItem>("/api/news", {
          ...payload,
          date: new Date().toLocaleDateString("vi-VN").replace(/\//g, "-"),
        });
        setNewsList((prev) => [created, ...prev]);
      }
      setModalOpen(false);
      setEditingItem(null);
    } catch (e) {
      alert(e instanceof GatewayError ? e.message : "Lỗi lưu thông báo.");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePin = async (id: string) => {
    const target = newsList.find((n) => n.id === id);
    if (!target) return;
    try {
      const updated = await apiPut<NewsItem>(`/api/news/${id}`, { pinned: !target.pinned });
      setNewsList((prev) => prev.map((n) => (n.id === id ? updated : n)));
      if (selectedNews?.id === id) setSelectedNews(updated);
    } catch (e) {
      alert(e instanceof GatewayError ? e.message : "Lỗi ghim thông báo.");
    }
  };

  const handleDeleteNews = async (id: string, title?: string) => {
    const target = newsList.find((n) => n.id === id);
    const displayTitle = title || target?.title || "";
    if (!confirm(`Bạn có chắc chắn muốn xóa thông báo "${displayTitle}" không?`)) return;
    try {
      await apiDelete(`/api/news/${id}`);
      setNewsList((prev) => prev.filter((n) => n.id !== id));
      if (selectedNews?.id === id) setSelectedNews(null);
    } catch (e) {
      alert(e instanceof GatewayError ? e.message : "Lỗi xóa thông báo.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5"
            >
              <FontAwesomeIcon icon={faPlus} fontSize={18} />
              Đăng thông báo mới
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
          <div className="text-xs text-gray-500">Đang tải bảng tin qua Gateway...</div>
        </div>
      ) : (
        <NewsSection
          items={newsList}
          onSelect={setSelectedNews}
          onEdit={handleOpenEdit}
          onDelete={handleDeleteNews}
          onTogglePin={handleTogglePin}
        />
      )}

      {/* Modal xem chi tiết thông báo */}
      <NewsDetailModal
        item={selectedNews}
        onClose={() => setSelectedNews(null)}
        onEdit={handleOpenEdit}
        onDelete={handleDeleteNews}
      />

      {/* Modal tạo/sửa thông báo */}
      <CreateNewsModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
        initial={editingItem}
        saving={saving}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
