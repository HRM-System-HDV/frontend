"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Form";
import { apiGet } from "@/lib/api";
import type { Regulation, RegulationStatus, RegulationCategory, Branch } from "@/types";

export interface RegulationFormInput {
  code: string;
  title: string;
  category: RegulationCategory;
  summary: string;
  content: string;
  status: RegulationStatus;
  scope: string;
  effectiveDate: string;
  author: string;
  version: string;
  pinned: boolean;
}

interface Props {
  initial: Regulation | null;
  defaultCode?: string;
  onClose: () => void;
  onSave: (input: RegulationFormInput) => void;
  saving?: boolean;
}

export default function RegulationFormModal({ initial, defaultCode = "", onClose, onSave, saving }: Props) {
  const [formCode, setFormCode] = useState(initial?.code ?? defaultCode);
  const [formTitle, setFormTitle] = useState(initial?.title ?? "");
  const [formCategory, setFormCategory] = useState<RegulationCategory>(initial?.category ?? "Nội quy lao động");
  const [formSummary, setFormSummary] = useState(initial?.summary ?? "");
  const [formContent, setFormContent] = useState(initial?.content ?? "");
  const [formStatus, setFormStatus] = useState<RegulationStatus>(initial?.status ?? "hiệu lực");
  const [formScope, setFormScope] = useState(initial?.scope ?? "Toàn công ty");
  const [formEffectiveDate, setFormEffectiveDate] = useState(initial?.effectiveDate ?? "01/09/2026");
  const [formAuthor, setFormAuthor] = useState(initial?.author ?? "Ban Giám Đốc");
  const [formVersion, setFormVersion] = useState(initial?.version ?? "1.0");
  const [formPinned, setFormPinned] = useState(!!initial?.pinned);
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    apiGet<Branch[]>("/api/branches").then((d) => setBranches(d || [])).catch(() => {});
  }, []);

  const handleSave = () => {
    if (!formTitle.trim() || !formContent.trim()) {
      alert("Vui lòng nhập đầy đủ tiêu đề và nội dung quy định.");
      return;
    }
    onSave({
      code: formCode,
      title: formTitle,
      category: formCategory,
      summary: formSummary,
      content: formContent,
      status: formStatus,
      scope: formScope,
      effectiveDate: formEffectiveDate,
      author: formAuthor,
      version: formVersion,
      pinned: formPinned,
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? "Chỉnh sửa văn bản nội quy" : "Tạo văn bản nội quy mới"}
      size="lg"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Đang lưu..." : initial ? "Lưu thay đổi" : "Ban hành nội quy"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Mã văn bản">
            <Input
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              placeholder="VD: NQ-2026-006"
            />
          </Field>

          <Field label="Danh mục quy định">
            <Select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as RegulationCategory)}
            >
              <option value="Nội quy lao động">Nội quy lao động</option>
              <option value="Chấm công & Kỷ luật">Chấm công & Kỷ luật</option>
              <option value="Thưởng & Kỷ luật">Thưởng & Kỷ luật</option>
              <option value="An toàn lao động">An toàn lao động</option>
              <option value="Bảo mật & Dữ liệu">Bảo mật & Dữ liệu</option>
              <option value="Vận hành chung">Vận hành chung</option>
            </Select>
          </Field>

          <Field label="Trạng thái">
            <Select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as RegulationStatus)}
            >
              <option value="hiệu lực">Đang hiệu lực</option>
              <option value="dự thảo">Dự thảo</option>
              <option value="hết hiệu lực">Hết hiệu lực</option>
            </Select>
          </Field>
        </div>

        <Field label="Tiêu đề quy định *">
          <Input
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="VD: Quy định về bảo hộ lao động và vệ sinh khu vực pha chế"
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Phạm vi áp dụng">
            <Select
              value={formScope}
              onChange={(e) => setFormScope(e.target.value)}
            >
              <option value="Toàn công ty">Toàn công ty</option>
              {branches.map((b) => (
                <option key={b.id || b.slug} value={b.slug.toUpperCase()}>
                  Chi nhánh {b.name} ({b.slug.toUpperCase()})
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Ngày bắt đầu hiệu lực">
            <Input
              value={formEffectiveDate}
              onChange={(e) => setFormEffectiveDate(e.target.value)}
              placeholder="dd/mm/yyyy"
            />
          </Field>

          <Field label="Cơ quan / Người ban hành">
            <Input
              value={formAuthor}
              onChange={(e) => setFormAuthor(e.target.value)}
              placeholder="VD: Ban Giám Đốc"
            />
          </Field>
        </div>

        <Field label="Tóm tắt nội dung quy định">
          <Input
            value={formSummary}
            onChange={(e) => setFormSummary(e.target.value)}
            placeholder="Tóm tắt ngắn gọn 1-2 câu về mục tiêu và đối tượng áp dụng..."
          />
        </Field>

        <Field label="Toàn văn điều khoản nội quy *">
          <Textarea
            rows={8}
            value={formContent}
            onChange={(e) => setFormContent(e.target.value)}
            placeholder="Nhập chi tiết các chương, điều khoản, chế tài, hướng dẫn thực hiện..."
          />
        </Field>

        <div className="flex items-center gap-6 pt-1">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="pinnedCheckbox"
              checked={formPinned}
              onChange={(e) => setFormPinned(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
            />
            <label htmlFor="pinnedCheckbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
              📌 Ghim văn bản này lên đầu danh sách
            </label>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Phiên bản:</span>
            <input
              type="text"
              value={formVersion}
              onChange={(e) => setFormVersion(e.target.value)}
              className="w-16 px-2 py-1 text-xs border border-slate-200 rounded text-center"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
