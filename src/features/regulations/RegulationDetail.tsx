"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faPen, faPrint } from "@fortawesome/free-solid-svg-icons";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import type { Regulation } from "@/types";
import { getStatusTone } from "./helpers";

interface Props {
  item: Regulation | null;
  onClose: () => void;
  onEdit: (item: Regulation) => void;
}

export default function RegulationDetailModal({ item, onClose, onEdit }: Props) {
  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title={item ? `${item.code} - ${item.title}` : ""}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="flex items-center gap-1.5"
            >
              <FontAwesomeIcon icon={faPrint} fontSize={16} />
              In văn bản
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => alert("Đã tải xuống bản PDF nội quy chính thức!")}
              className="flex items-center gap-1.5"
            >
              <FontAwesomeIcon icon={faDownload} fontSize={16} />
              Tải PDF
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {item && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(item)}
                className="flex items-center gap-1.5"
              >
                <FontAwesomeIcon icon={faPen} fontSize={16} />
                Sửa văn bản
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      }
    >
      {item && (
        <div className="space-y-5 text-slate-800">
          {/* Header info box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block">Mã văn bản:</span>
              <span className="font-bold text-slate-800 font-mono text-sm">{item.code}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Danh mục:</span>
              <span className="font-semibold text-slate-800">{item.category}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Phạm vi áp dụng:</span>
              <span className="font-semibold text-slate-800">{item.scope}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Trạng thái:</span>
              <Badge tone={getStatusTone(item.status)} dot>
                {item.status.toUpperCase()}
              </Badge>
            </div>
            <div>
              <span className="text-slate-500 block">Cơ quan ban hành:</span>
              <span className="font-semibold text-slate-800">{item.author}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Ngày có hiệu lực:</span>
              <span className="font-semibold text-slate-800">{item.effectiveDate}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Phiên bản:</span>
              <span className="font-semibold text-slate-800">v{item.version}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Cập nhật lần cuối:</span>
              <span className="font-semibold text-slate-800">{item.updatedAt}</span>
            </div>
          </div>

          {/* Tóm tắt */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mục đích & Tóm tắt:</h4>
            <p className="text-sm bg-blue-50/60 p-3 rounded-lg border border-blue-100 text-slate-700 italic">
              {item.summary}
            </p>
          </div>

          {/* Toàn văn điều khoản */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Toàn văn điều khoản nội quy:</h4>
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm whitespace-pre-line leading-relaxed font-sans text-slate-800 max-h-[350px] overflow-y-auto">
              {item.content}
            </div>
          </div>

          {/* Tài liệu đính kèm */}
          {item.attachments && item.attachments > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tài liệu đính kèm ban hành:</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                  <span className="flex items-center gap-2 font-medium text-slate-700">
                    📄 {item.code}_Chinh_Thuc_Ky_Duyet.pdf
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => alert("Đang tải file PDF...")}>
                    Tải về (1.2 MB)
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
