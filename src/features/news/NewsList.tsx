"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThumbtack } from "@fortawesome/free-solid-svg-icons";
import { Card, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { getTagColor } from "./helpers";
import type { News, Branch } from "@/types";
export default function NewsList({ items, branches, onSelect }: { items: News[]; branches: Branch[]; onSelect: (item: News) => void }) {
  if (!items.length) return <p className="py-12 text-center text-gray-500">Chưa có bản tin phù hợp.</p>;
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[...items].sort((a,b) => Number(b.pinned) - Number(a.pinned) || b.publishDate.localeCompare(a.publishDate)).map(item => <Card key={item.id}><CardBody><div className="mb-3 flex items-center justify-between gap-2"><span className={`rounded-md border px-2 py-1 text-xs ${getTagColor(item.tag)}`}>{item.tag}</span>{item.pinned && <FontAwesomeIcon icon={faThumbtack} className="text-primary" title="Đã ghim" />}</div><h2 className="mb-2 text-lg font-bold">{item.title}</h2><p className="mb-4 line-clamp-3 text-sm text-gray-600">{item.summary}</p><p className="mb-3 text-xs text-gray-500">{formatDate(item.publishDate)} · {item.branchId ? branches.find(b => b.id === item.branchId)?.name ?? "Chi nhánh chưa tải được" : "Toàn công ty"}</p><Button variant="outline" size="sm" onClick={() => onSelect(item)}>Đọc bản tin</Button></CardBody></Card>)}</div>;
}
