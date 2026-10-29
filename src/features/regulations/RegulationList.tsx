"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar, faEye, faGavel, faMagnifyingGlass, faPen, faThumbtack, faTrashCan, faUser } from "@fortawesome/free-solid-svg-icons";
import { Card, CardBody } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { apiGet } from "@/lib/api";
import type { Regulation, Branch } from "@/types";
import { getStatusTone, getCategoryColor } from "./helpers";

interface Props {
  items: Regulation[];
  onView: (item: Regulation) => void;
  onEdit: (item: Regulation) => void;
  onDelete: (id: string, title: string) => void;
  onTogglePin: (id: string) => void;
}

export default function RegulationSection({ items, onView, onEdit, onDelete, onTogglePin }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    apiGet<Branch[]>("/api/branches").then((d) => setBranches(d || [])).catch(() => {});
  }, []);

  // Filtered items
  const filteredItems = items.filter((item) => {
    const matchSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase());

    const matchCategory =
      categoryFilter === "all" || item.category === categoryFilter;

    const matchStatus =
      statusFilter === "all" || item.status === statusFilter;

    const matchScope =
      scopeFilter === "all" || item.scope === scopeFilter;

    return matchSearch && matchCategory && matchStatus && matchScope;
  });

  // Sort: Pinned items first
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardBody className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <FontAwesomeIcon icon={faMagnifyingGlass} fontSize={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo mã, tên quy định..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              />
            </div>

            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              >
                <option value="all">Tất cả danh mục</option>
                <option value="Nội quy lao động">Nội quy lao động</option>
                <option value="Chấm công & Kỷ luật">Chấm công & Kỷ luật</option>
                <option value="Thưởng & Kỷ luật">Thưởng & Kỷ luật</option>
                <option value="An toàn lao động">An toàn lao động</option>
                <option value="Bảo mật & Dữ liệu">Bảo mật & Dữ liệu</option>
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="hiệu lực">Đang hiệu lực</option>
                <option value="dự thảo">Dự thảo</option>
                <option value="hết hiệu lực">Hết hiệu lực</option>
              </select>
            </div>

            <div>
              <select
                value={scopeFilter}
                onChange={(e) => setScopeFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              >
                <option value="all">Tất cả phạm vi áp dụng</option>
                <option value="Toàn công ty">Toàn công ty</option>
                {branches.map((b) => (
                  <option key={b.id || b.slug} value={b.slug.toUpperCase()}>
                    Chi nhánh {b.name} ({b.slug.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Regulation List Cards */}
      <div className="space-y-4">
        {sortedItems.length === 0 ? (
          <Card className="bg-white border-slate-200">
            <CardBody className="py-12 text-center text-slate-400">
              <FontAwesomeIcon icon={faGavel} fontSize={40} className="mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600">Không tìm thấy văn bản nội quy nào</p>
              <p className="text-sm mt-1">Thử thay đổi từ khóa hoặc bộ lọc tìm kiếm</p>
            </CardBody>
          </Card>
        ) : (
          sortedItems.map((item) => (
            <Card
              key={item.id}
              className={`bg-white border transition-all hover:shadow-md ${
                item.pinned ? "border-amber-300 bg-amber-50/15" : "border-slate-200"
              }`}
            >
              <CardBody className="p-5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left content */}
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {item.code}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${getCategoryColor(
                          item.category
                        )}`}
                      >
                        {item.category}
                      </span>
                      <Badge tone={getStatusTone(item.status)} dot>
                        {item.status.toUpperCase()}
                      </Badge>
                      {item.pinned && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                          <FontAwesomeIcon icon={faThumbtack} fontSize={12} /> Đã ghim
                        </span>
                      )}
                      <span className="text-xs text-slate-500 font-medium">
                        Phạm vi: <strong className="text-slate-700">{item.scope}</strong>
                      </span>
                    </div>

                    <div>
                      <h3
                        onClick={() => onView(item)}
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
                        <FontAwesomeIcon icon={faUser} fontSize={14} className="text-slate-400" />
                        Ban hành: <strong className="text-slate-700">{item.author}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <FontAwesomeIcon icon={faCalendar} fontSize={14} className="text-slate-400" />
                        Hiệu lực: <strong className="text-slate-700">{item.effectiveDate}</strong>
                      </span>
                      <span>
                        Phiên bản: <strong className="text-slate-700">v{item.version}</strong>
                      </span>
                      {item.attachments && (
                        <span className="text-primary-600 font-medium flex items-center gap-1">
                          📎 {item.attachments} tài liệu đính kèm
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center md:flex-col gap-2 shrink-0 justify-end pt-2 md:pt-0">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onView(item)}
                      className="flex items-center gap-1.5"
                    >
                      <FontAwesomeIcon icon={faEye} fontSize={16} />
                      Xem toàn văn
                    </Button>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title={item.pinned ? "Bỏ ghim" : "Ghim lên đầu"}
                        onClick={() => onTogglePin(item.id)}
                        className={item.pinned ? "text-amber-600" : "text-slate-400"}
                      >
                        <FontAwesomeIcon icon={faThumbtack} fontSize={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Chỉnh sửa văn bản"
                        onClick={() => onEdit(item)}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        <FontAwesomeIcon icon={faPen} fontSize={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Xóa nội quy"
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
