"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBullhorn,
  faCalendar,
  faEye,
  faMagnifyingGlass,
  faPen,
  faThumbtack,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import { Card, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { NewsItem } from "./types";
import { getTagColor } from "./helpers";

interface Props {
  items: NewsItem[];
  onSelect: (item: NewsItem) => void;
  onEdit: (item: NewsItem) => void;
  onDelete: (id: string, title?: string) => void;
  onTogglePin: (id: string) => void;
}

export default function NewsSection({
  items,
  onSelect,
  onEdit,
  onDelete,
  onTogglePin,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [pinnedFilter, setPinnedFilter] = useState("all");

  const filteredNews = items.filter((item) => {
    const matchSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchTag = tagFilter === "all" || item.tag === tagFilter;

    const matchPinned =
      pinnedFilter === "all" ||
      (pinnedFilter === "pinned" ? item.pinned : !item.pinned);

    return matchSearch && matchTag && matchPinned;
  });

  const sortedNews = [...filteredNews].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardBody className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                fontSize={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Tìm kiếm thông báo, tin tức..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              />
            </div>

            <div>
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              >
                <option value="all">Tất cả chuyên mục</option>
                <option value="Thông báo">Thông báo</option>
                <option value="Khẩn cấp">Khẩn cấp</option>
                <option value="Nghỉ lễ">Nghỉ lễ</option>
                <option value="Khen thưởng">Khen thưởng</option>
                <option value="Vận hành">Vận hành</option>
              </select>
            </div>

            <div>
              <select
                value={pinnedFilter}
                onChange={(e) => setPinnedFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              >
                <option value="all">Tất cả bài đăng</option>
                <option value="pinned">Đã ghim đầu trang</option>
                <option value="unpinned">Chưa ghim</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* News List Cards */}
      <div className="space-y-4">
        {sortedNews.length === 0 ? (
          <Card className="bg-white border-slate-200">
            <CardBody className="py-12 text-center text-slate-400">
              <FontAwesomeIcon
                icon={faBullhorn}
                fontSize={40}
                className="mx-auto mb-2 text-slate-300"
              />
              <p className="font-semibold text-slate-600">
                Không tìm thấy thông báo nào
              </p>
              <p className="text-sm mt-1">
                Thử thay đổi từ khóa hoặc bộ lọc tìm kiếm
              </p>
            </CardBody>
          </Card>
        ) : (
          sortedNews.map((item) => (
            <Card
              key={item.id}
              className={`bg-white border transition-all hover:shadow-md ${
                item.pinned
                  ? "border-amber-300 bg-amber-50/15"
                  : "border-slate-200"
              }`}
            >
              <CardBody className="p-5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left content */}
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${getTagColor(
                          item.tag
                        )}`}
                      >
                        {item.tag}
                      </span>
                      {item.pinned && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                          <FontAwesomeIcon icon={faThumbtack} fontSize={12} /> Đã ghim
                        </span>
                      )}
                      <span className="text-xs text-slate-500 font-medium">
                        Ngày đăng:{" "}
                        <strong className="text-slate-700">{item.date}</strong>
                      </span>
                    </div>

                    <div>
                      <h3
                        onClick={() => onSelect(item)}
                        className="text-base md:text-lg font-bold text-slate-800 hover:text-primary-600 cursor-pointer transition-colors"
                      >
                        {item.title}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {item.summary}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <FontAwesomeIcon
                          icon={faCalendar}
                          fontSize={14}
                          className="text-slate-400"
                        />
                        Thời gian:{" "}
                        <strong className="text-slate-700">{item.date}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center md:flex-col gap-2 shrink-0 justify-end pt-2 md:pt-0">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onSelect(item)}
                      className="flex items-center gap-1.5"
                    >
                      <FontAwesomeIcon icon={faEye} fontSize={16} />
                      Xem chi tiết
                    </Button>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title={item.pinned ? "Bỏ ghim" : "Ghim lên đầu"}
                        onClick={() => onTogglePin(item.id)}
                        className={
                          item.pinned ? "text-amber-600" : "text-slate-400"
                        }
                      >
                        <FontAwesomeIcon icon={faThumbtack} fontSize={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Chỉnh sửa thông báo"
                        onClick={() => onEdit(item)}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        <FontAwesomeIcon icon={faPen} fontSize={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Xóa thông báo"
                        onClick={() => onDelete(item.id, item.title)}
                        className="text-rose-500 hover:bg-rose-50"
                      >
                        <FontAwesomeIcon icon={faTrashCan} fontSize={16} />
                      </Button>
                    </div>
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
