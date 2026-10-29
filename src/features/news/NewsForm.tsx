"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Form";
import type { NewsItem } from "./types";

export interface NewsFormPayload {
  title: string;
  summary: string;
  content: string;
  author: string;
  tag: string;
  tagTone: NewsItem["tagTone"];
  pinned: boolean;
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

export default function CreateNewsModal({ open, onClose, initial, saving, onSubmit }: Props) {
  const isEdit = Boolean(initial);
  const [newTitle, setNewTitle] = useState("");
  const [newTag, setNewTag] = useState("Thông báo");
  const [newSummary, setNewSummary] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newAuthor, setNewAuthor] = useState("Ban Giám Đốc");

  useEffect(() => {
    if (open) {
      setNewTitle(initial?.title || "");
      setNewTag(initial?.tag || "Thông báo");
      setNewSummary(initial?.summary || "");
      setNewContent(initial?.content || "");
      setNewAuthor(initial?.author || "Ban Giám Đốc");
    }
  }, [open, initial]);

  const handleSubmit = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    const tone = toneForTag(newTag);
    onSubmit({
      title: newTitle.trim(),
      summary: newSummary.trim() || `${newContent.trim().substring(0, 100)}...`,
      content: newContent.trim(),
      author: newAuthor.trim() || "Ban Giám Đốc",
      tag: newTag,
      tagTone: tone,
      pinned: newTag === "Khẩn cấp" || Boolean(initial?.pinned && newTag === initial?.tag),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Sửa thông báo nội bộ" : "Đăng thông báo nội bộ mới"}
      size="lg"
      footer={
        <>
          <Button variant="white" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Phát hành thông báo"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Tiêu đề thông báo" required>
          <Input
            placeholder="VD: Thông báo kiểm kê chi nhánh, lịch nghỉ lễ..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={saving}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phân loại">
            <Select value={newTag} onChange={(e) => setNewTag(e.target.value)} disabled={saving}>
              <option value="Thông báo">📢 Thông báo chung</option>
              <option value="Khẩn cấp">🚨 Thông báo khẩn</option>
              <option value="Nghỉ lễ">🏖️ Nghỉ lễ</option>
              <option value="Khen thưởng">🏆 Khen thưởng</option>
              <option value="Vận hành">⚙️ Vận hành</option>
            </Select>
          </Field>
          <Field label="Người / Đơn vị phát hành">
            <Input
              placeholder="VD: Ban Giám Đốc, Quản lý chi nhánh..."
              value={newAuthor}
              onChange={(e) => setNewAuthor(e.target.value)}
              disabled={saving}
            />
          </Field>
        </div>
        <Field label="Tóm tắt ngắn (hiển thị trên thẻ)">
          <Input
            placeholder="Nội dung tóm tắt trong 1-2 câu..."
            value={newSummary}
            onChange={(e) => setNewSummary(e.target.value)}
            disabled={saving}
          />
        </Field>
        <Field label="Nội dung chi tiết" required>
          <Textarea
            rows={4}
            placeholder="Nhập toàn văn thông báo gửi tới toàn bộ nhân sự..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            disabled={saving}
          />
        </Field>
      </div>
    </Modal>
  );
}
