"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Form";
import { apiGet } from "@/lib/api";
import { useCurrentUser } from "@/context/AuthContext";
import type { Branch } from "@/types";
import type { NewsItem } from "./types";

export interface NewsFormPayload {
  title: string;
  summary: string;
  content: string;
  tag: string;
  pinned: boolean;
  branchId: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: NewsItem | null;
  saving: boolean;
  onSubmit: (payload: NewsFormPayload) => void;
}

export default function CreateNewsModal({
  open,
  onClose,
  initial,
  saving,
  onSubmit,
}: Props) {
  const isEdit = Boolean(initial);
  const { role, branchId } = useCurrentUser();
  const isAdmin = role === "admin";
  const [newTitle, setNewTitle] = useState(initial?.title || "");
  const [newTag, setNewTag] = useState(initial?.tag || "Thông báo");
  const [newSummary, setNewSummary] = useState(initial?.summary || "");
  const [newContent, setNewContent] = useState(initial?.content || "");
  const [newPinned, setNewPinned] = useState(Boolean(initial?.pinned));
  // Tài khoản bị ghim không có control nhưng giá trị vẫn phải vào payload.
  const [newBranch, setNewBranch] = useState(
    initial?.branchId || (isAdmin ? "Toàn công ty" : branchId)
  );
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    let ignore = false;
    apiGet<Branch[]>("/api/branches")
      .then((d) => {
        if (!ignore) setBranches(d || []);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  const handleSubmit = () => {
    if (!newTitle.trim() || !newContent.trim()) {
      alert("Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo.");
      return;
    }    onSubmit({
      title: newTitle.trim(),
      summary: newSummary.trim() || `${newContent.trim().substring(0, 120)}...`,
      content: newContent.trim(),
      tag: newTag,      pinned: newPinned,
      branchId: newBranch === "Toàn công ty" ? null : newBranch,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Chỉnh sửa thông báo nội bộ" : "Đăng thông báo nội bộ mới"}
      size="lg"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving
              ? "Đang lưu..."
              : isEdit
              ? "Lưu thay đổi"
              : "Phát hành thông báo"}
          </Button>
        </div>
      }
    >
      <div className="text-sm">
        {/* 1. Tiêu đề thông báo */}
        <Field label="Tiêu đề thông báo" required className="mb-4">
          <Input
            placeholder="VD: Thông báo kiểm kê chi nhánh, lịch nghỉ lễ..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={saving}
          />
        </Field>

        {/* 2. Hàng 2 cột: Phân loại chuyên mục & Chi nhánh áp dụng */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Field label="Phân loại chuyên mục" className="mb-0">
            <Select
              value={newTag}
              onChange={(e) => {
                const val = e.target.value;
                setNewTag(val);
                if (val === "Khẩn cấp") setNewPinned(true);
              }}
              disabled={saving}
            >
              <option value="Thông báo">Thông báo chung</option>
              <option value="Khẩn cấp">Thông báo khẩn (Tự động ghim)</option>
              <option value="Nghỉ lễ">Nghỉ lễ</option>
              <option value="Khen thưởng">Khen thưởng</option>
              <option value="Vận hành">Vận hành</option>
            </Select>
          </Field>

          {isAdmin && (
            <Field label="Chi nhánh áp dụng" className="mb-0">
              <Select
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
                disabled={saving}
              >
                <option value="Toàn công ty">Toàn công ty</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    Chi nhánh {b.name} ({b.branchCode || b.id})
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>

        {/* 3. Tóm tắt ngắn */}
        <Field label="Tóm tắt ngắn (hiển thị trên danh sách thẻ)" className="mb-4">
          <Input
            placeholder="Nội dung tóm tắt trong 1-2 câu ngắn gọn..."
            value={newSummary}
            onChange={(e) => setNewSummary(e.target.value)}
            disabled={saving}
          />
        </Field>

        {/* 4. Nội dung chi tiết */}
        <Field label="Nội dung chi tiết thông báo" required className="mb-4">
          <Textarea
            rows={6}
            placeholder="Soạn thảo toàn văn nội dung thông báo gửi đến toàn thể nhân sự..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            disabled={saving}
          />
        </Field>

        {/* 5. Checkbox ghim */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="newsPinnedCheckbox"
            checked={newPinned}
            onChange={(e) => setNewPinned(e.target.checked)}
            disabled={saving}
            className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500 cursor-pointer"
          />
          <label
            htmlFor="newsPinnedCheckbox"
            className="text-xs font-semibold text-slate-700 cursor-pointer"
          >
            📌 Ghim thông báo này lên đầu danh sách
          </label>
        </div>
      </div>
    </Modal>
  );
}
