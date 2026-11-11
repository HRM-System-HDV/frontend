"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Form";
import { apiGet } from "@/lib/api";
import { useCurrentUser } from "@/context/AuthContext";
import { formatDate, getTodayVN } from "@/lib/utils";
import type { Regulation, RegulationStatus, RegulationCategory, Branch } from "@/types";

export interface RegulationFormInput {
  code?: string;
  title: string;
  category: RegulationCategory;
  summary: string;
  content: string;
  status: RegulationStatus;
  scope: string;
  effectiveDate: string;
  version: string;
  pinned: boolean;
}

interface Props {
  initial: Regulation | null;
  onClose: () => void;
  onSave: (input: RegulationFormInput) => void;
  saving?: boolean;
}

export default function RegulationFormModal({ initial, onClose, onSave, saving }: Props) {
  const { role, branchSlug } = useCurrentUser();
  const isAdmin = role === "admin";
  const [formTitle, setFormTitle] = useState(initial?.title ?? "");
  const [formCategory, setFormCategory] = useState<RegulationCategory>(initial?.category ?? "Nội quy lao động");
  const [formSummary, setFormSummary] = useState(initial?.summary ?? "");
  const [formContent, setFormContent] = useState(initial?.content ?? "");
  const [formStatus, setFormStatus] = useState<RegulationStatus>(initial?.status ?? "hiệu lực");
  // Tài khoản bị ghim không có control nhưng giá trị vẫn phải vào payload.
  const [formScope, setFormScope] = useState(initial?.scope ?? (isAdmin ? "Toàn công ty" : branchSlug.toUpperCase()));
  const [formEffectiveDate, setFormEffectiveDate] = useState(
    initial?.effectiveDate ? formatDate(initial.effectiveDate) : getTodayVN()
  );
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
      title: formTitle.trim(),
      category: formCategory,
      summary: formSummary.trim(),
      content: formContent.trim(),
      status: formStatus,
      scope: formScope,
      effectiveDate: formatDate(formEffectiveDate.trim()) || getTodayVN(),
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
      <div className="text-sm">
        {/* 1. Tiêu đề quy định */}
        <Field label="Tiêu đề quy định" required className="mb-4">
          <Input
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="VD: Quy định về bảo hộ lao động và vệ sinh khu vực pha chế"
            disabled={saving}
          />
        </Field>

        {/* 2. Hàng 2 cột: Danh mục quy định & Phạm vi áp dụng */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Field label="Danh mục quy định" className="mb-0">
            <Select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as RegulationCategory)}
              disabled={saving}
            >
              <option value="Nội quy lao động">Nội quy lao động</option>
              <option value="Chấm công & Kỷ luật">Chấm công & Kỷ luật</option>
              <option value="Thưởng & Kỷ luật">Thưởng & Kỷ luật</option>
              <option value="An toàn lao động">An toàn lao động</option>
              <option value="Bảo mật & Dữ liệu">Bảo mật & Dữ liệu</option>
              <option value="Vận hành chung">Vận hành chung</option>
            </Select>
          </Field>

          {isAdmin && (
            <Field label="Phạm vi áp dụng" className="mb-0">
              <Select
                value={formScope}
                onChange={(e) => setFormScope(e.target.value)}
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
          )}
        </div>

        {/* 3. Hàng 2 cột phụ: Trạng thái & Ngày bắt đầu hiệu lực */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Field label="Trạng thái" className="mb-0">
            <Select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as RegulationStatus)}
              disabled={saving}
            >
              <option value="hiệu lực">Đang hiệu lực</option>
              <option value="dự thảo">Dự thảo</option>
              <option value="hết hiệu lực">Hết hiệu lực</option>
            </Select>
          </Field>

          <Field label="Ngày bắt đầu hiệu lực" className="mb-0">
            <Input
              value={formEffectiveDate}
              onChange={(e) => setFormEffectiveDate(e.target.value)}
              placeholder="DD/MM/YYYY"
              disabled={saving}
            />
          </Field>
        </div>

        {/* 4. Tóm tắt nội dung */}
        <Field label="Tóm tắt ngắn (hiển thị trên danh sách thẻ)" className="mb-4">
          <Input
            value={formSummary}
            onChange={(e) => setFormSummary(e.target.value)}
            placeholder="Tóm tắt ngắn gọn 1-2 câu về mục tiêu và đối tượng áp dụng..."
            disabled={saving}
          />
        </Field>

        {/* 5. Toàn văn điều khoản */}
        <Field label="Toàn văn điều khoản nội quy" required className="mb-4">
          <Textarea
            rows={8}
            value={formContent}
            onChange={(e) => setFormContent(e.target.value)}
            placeholder="Nhập chi tiết các chương, điều khoản, chế tài, hướng dẫn thực hiện..."
            disabled={saving}
          />
        </Field>

        {/* 6. Checkbox ghim */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="pinnedCheckbox"
            checked={formPinned}
            onChange={(e) => setFormPinned(e.target.checked)}
            disabled={saving}
            className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500 cursor-pointer"
          />
          <label htmlFor="pinnedCheckbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
            📌 Ghim văn bản này lên đầu danh sách
          </label>
        </div>
      </div>
    </Modal>
  );
}
