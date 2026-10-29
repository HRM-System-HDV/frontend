"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faPencil, faThumbtack, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { Card, CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { NewsItem } from "./types";

const TAGS = ["all", "Nghỉ lễ", "Vận hành", "Khen thưởng", "Khẩn cấp", "Thông báo"];

interface Props {
  items: NewsItem[];
  onSelect: (item: NewsItem) => void;
  onEdit: (item: NewsItem) => void;
  onDelete: (id: string) => void;
}

export default function NewsSection({ items, onSelect, onEdit, onDelete }: Props) {
  const [filterTag, setFilterTag] = useState<string>("all");

  const filteredNews = filterTag === "all"
    ? items
    : items.filter((n) => n.tag === filterTag);

  return (
    <div className="flex flex-col gap-5">
      {/* Bộ lọc chuyên mục */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setFilterTag(tag)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filterTag === tag
                ? "bg-primary text-white shadow-xs"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {tag === "all" ? "Tất cả thông báo" : tag}
          </button>
        ))}
      </div>

      {/* Danh sách bài đăng - Mỗi thông báo 1 dòng (Single-row List) */}
      <div className="flex flex-col gap-3">
        {filteredNews.length === 0 ? (
          <Card>
            <CardBody className="py-12 text-center text-gray-400 text-sm">
              Không có thông báo nào trong chuyên mục này.
            </CardBody>
          </Card>
        ) : (
          filteredNews.map((item) => (
            <Card
              key={item.id}
              className="hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => onSelect(item)}
            >
              <CardBody className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Dòng Tag, Ghim & Thời gian */}
                    <div className="flex items-center flex-wrap gap-2 mb-2">
                      <Badge tone={item.tagTone}>{item.tag}</Badge>
                      {item.pinned && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                          <FontAwesomeIcon icon={faThumbtack} fontSize={12} />
                          Ghim đầu trang
                        </span>
                      )}
                      <span className="text-xs text-gray-400">• Ngày đăng: {item.date}</span>
                    </div>

                    {/* Tiêu đề thông báo - rộng rãi trọn vẹn 1 dòng */}
                    <h3 className="text-base font-bold text-gray-800 group-hover:text-primary transition-colors mb-1.5 leading-snug">
                      {item.title}
                    </h3>

                    {/* Nội dung tóm tắt */}
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-3">
                      {item.summary}
                    </p>

                    {/* Đơn vị phát hành */}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>Đăng bởi: <strong className="text-gray-700 font-semibold">{item.author}</strong></span>
                    </div>
                  </div>

                  {/* Nút hành động */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(item);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faEye} fontSize={15} />
                      Xem chi tiết
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(item);
                      }}
                      className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                      title="Sửa thông báo"
                    >
                      <FontAwesomeIcon icon={faPencil} fontSize={16} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors cursor-pointer"
                      title="Xóa thông báo"
                    >
                      <FontAwesomeIcon icon={faTrashCan} fontSize={16} />
                    </button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
