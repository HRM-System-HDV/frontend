"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThumbtack } from "@fortawesome/free-solid-svg-icons";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import type { NewsItem } from "./types";

interface Props {
  item: NewsItem | null;
  onClose: () => void;
}

export default function NewsDetailModal({ item, onClose }: Props) {
  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title={item?.title || "Chi tiết thông báo"}
      size="lg"
      footer={
        <Button variant="white" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      {item && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center flex-wrap gap-2 pb-3 border-b border-gray-100">
            <Badge tone={item.tagTone}>{item.tag}</Badge>
            {item.pinned && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                <FontAwesomeIcon icon={faThumbtack} fontSize={12} />
                Ghim đầu trang
              </span>
            )}
            <span className="text-xs text-gray-400">• Ngày đăng: {item.date}</span>
            <span className="text-xs text-gray-500 ml-auto">
              Người phát hành: <strong className="text-gray-700">{item.author}</strong>
            </span>
          </div>

          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50 p-4 rounded-xl border border-gray-100">
            {item.content}
          </div>
        </div>
      )}
    </Modal>
  );
}
