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
import { apiGet, apiPost, apiPut, apiDelete, GatewayError } from "@/lib/api";
import { useCurrentUser } from "@/context/AuthContext";
import { getTodayVN } from "@/lib/utils";

export default function NewsPage() {
  const { role } = useCurrentUser();
  // Đăng/ghim/xóa tin là WRITE /api/news = manager + admin; nhân viên chỉ đọc.
  const canWriteNews = role !== "staff";

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
    let ignore = false;
    apiGet<NewsItem[]>("/api/news")
      .then((data) => {
        if (!ignore) {
          setNewsList(data || []);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!ignore) {
          setError(e instanceof GatewayError ? e.message : "Lỗi tải bảng tin");
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

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
          date: getTodayVN(),
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
            {canWriteNews && (
              <Button
                variant="primary"
                onClick={handleOpenCreate}
                className="flex items-center gap-1.5"
              >
                <FontAwesomeIcon icon={faPlus} fontSize={18} />
                Đăng thông báo mới
              </Button>
            )}
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
          onEdit={canWriteNews ? handleOpenEdit : undefined}
          onTogglePin={canWriteNews ? handleTogglePin : undefined}
        />
      )}

      {/* Modal xem chi tiết thông báo — chỗ duy nhất có nút xóa */}
      <NewsDetailModal
        item={selectedNews}
        onClose={() => setSelectedNews(null)}
        onEdit={canWriteNews ? handleOpenEdit : undefined}
        onDelete={canWriteNews ? handleDeleteNews : undefined}
        onTogglePin={canWriteNews ? handleTogglePin : undefined}
      />

      {/* Modal tạo/sửa thông báo */}
      {modalOpen && (
        <CreateNewsModal
          key={editingItem?.id ?? "new"}
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingItem(null);
          }}
          initial={editingItem}
          saving={saving}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
