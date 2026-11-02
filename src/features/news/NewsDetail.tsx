"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPen,
  faPrint,
  faThumbtack,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { NewsItem } from "./types";
import { getTagColor } from "./helpers";

interface Props {
  item: NewsItem | null;
  onClose: () => void;
  onEdit?: (item: NewsItem) => void;
  onDelete?: (id: string, title?: string) => void;
}

export default function NewsDetailModal({
  item,
  onClose,
  onEdit,
  onDelete,
}: Props) {
  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title={item?.title || "Chi tiết thông báo"}
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
              In thông báo
            </Button>
            {item && onDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onClose();
                  onDelete(item.id, item.title);
                }}
                className="flex items-center gap-1.5"
              >
                <FontAwesomeIcon icon={faTrashCan} fontSize={14} />
                Xóa thông báo
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {item && onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(item);
                }}
                className="flex items-center gap-1.5"
              >
                <FontAwesomeIcon icon={faPen} fontSize={16} />
                Sửa thông báo
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
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block">Chuyên mục:</span>
              <span
                className={`inline-block mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-md border ${getTagColor(
                  item.tag
                )}`}
              >
                {item.tag}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Ngày đăng:</span>
              <span className="font-semibold text-slate-800">{item.date}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Trạng thái:</span>
              {item.pinned ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md mt-0.5">
                  <FontAwesomeIcon icon={faThumbtack} fontSize={12} /> Đã ghim đầu trang
                </span>
              ) : (
                <span className="font-semibold text-slate-600 block mt-0.5">Bình thường</span>
              )}
            </div>
          </div>

          {/* Tóm tắt */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Tóm tắt thông báo:
            </h4>
            <p className="text-sm bg-blue-50/60 p-3 rounded-lg border border-blue-100 text-slate-700 italic">
              {item.summary}
            </p>
          </div>

          {/* Toàn văn nội dung */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Nội dung chi tiết thông báo:
            </h4>
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm whitespace-pre-line leading-relaxed font-sans text-slate-800 max-h-[350px] overflow-y-auto">
              {item.content}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
