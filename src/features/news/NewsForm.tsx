"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Form";
import { apiGet } from "@/lib/api";
import type { Branch } from "@/types";
import type { NewsItem } from "./types";

export interface NewsFormPayload {
  title: string;
  summary: string;
  content: string;
  tag: string;
  tagTone: NewsItem["tagTone"];
  pinned: boolean;
  branch: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: NewsItem | null;
  saving: boolean;
  onSubmit: (payload: NewsFormPayload) => void;
}

function toneForTag(tag: string): NewsItem["tagTone"] {
  if (tag === "Khẩn cấp" || tag === "Nghỉ lễ") return "danger";
  if (tag === "Khen thưởng") return "warning";
  if (tag === "Vận hành") return "success";
  return "primary";
}

export default function CreateNewsModal({
  open,
  onClose,
  initial,
  saving,
  onSubmit,
}: Props) {
  const isEdit = Boolean(initial);
  const [newTitle, setNewTitle] = useState("");
  const [newTag, setNewTag] = useState("Thông báo");
  const [newSummary, setNewSummary] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newPinned, setNewPinned] = useState(false);
  const [newBranch, setNewBranch] = useState("Toàn công ty");
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    apiGet<Branch[]>("/api/branches")
      .then((d) => setBranches(d || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      setNewTitle(initial?.title || "");
      setNewTag(initial?.tag || "Thông báo");
      setNewSummary(initial?.summary || "");
      setNewContent(initial?.content || "");
      setNewPinned(Boolean(initial?.pinned));
      setNewBranch(initial?.branch || "Toàn công ty");
    }
  }, [open, initial]);

  const handleSubmit = () => {
    if (!newTitle.trim() || !newContent.trim()) {
      alert("Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo.");
      return;
    }
    const tone = toneForTag(newTag);
    onSubmit({
      title: newTitle.trim(),
      summary: newSummary.trim() || `${newContent.trim().substring(0, 120)}...`,
      content: newContent.trim(),
      tag: newTag,
      tagTone: tone,
      pinned: newPinned || newTag === "Khẩn cấp",
      branch: newBranch,
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
      <div className="space-y-4 text-sm">
        <Field label="Tiêu đề thông báo" required>
          <Input
            placeholder="VD: Thông báo kiểm kê chi nhánh, lịch nghỉ lễ..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={saving}
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <Field label="Chi nhánh áp dụng" className="mb-0">
            <Select
              value={newBranch}
              onChange={(e) => setNewBranch(e.target.value)}
              disabled={saving}
            >
              <option value="Toàn công ty">Toàn công ty</option>
              {branches.map((b) => (
                <option key={b.id || b.slug} value={b.slug.toUpperCase()}>
                  Chi nhánh {b.name} ({b.slug.toUpperCase()})
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Tóm tắt ngắn (hiển thị trên danh sách thẻ)">
          <Input
            placeholder="Nội dung tóm tắt trong 1-2 câu ngắn gọn..."
            value={newSummary}
            onChange={(e) => setNewSummary(e.target.value)}
            disabled={saving}
          />
        </Field>

        <Field label="Nội dung chi tiết thông báo" required>
          <Textarea
            rows={6}
            placeholder="Soạn thảo toàn văn nội dung thông báo gửi đến toàn thể nhân sự..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            disabled={saving}
          />
        </Field>

        <div className="flex items-center gap-6 pt-1">
          <div className="flex items-center gap-2">
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
      </div>
    </Modal>
  );
}
