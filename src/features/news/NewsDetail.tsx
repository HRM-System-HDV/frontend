"use client";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import type { News } from "@/types";
export default function NewsDetail({ item, canWrite, busy, error, onClose, onEdit, onDelete, onPin }: { item: News; canWrite: boolean; busy: boolean; error?: string; onClose: () => void; onEdit: () => void; onDelete: () => void; onPin: () => void }) {
  return <Modal open title={item.title} size="xl" onClose={() => !busy && onClose()} footer={<>{canWrite && <><Button variant="danger" disabled={busy} onClick={onDelete}>Xóa</Button><Button variant="white" disabled={busy} onClick={onPin}>{item.pinned ? "Bỏ ghim" : "Ghim"}</Button><Button disabled={busy} onClick={onEdit}>Sửa</Button></>}<Button variant="white" disabled={busy} onClick={onClose}>Đóng</Button></>}>{error && <p role="alert" className="mb-4 text-red-700">{error}</p>}<p className="mb-4 text-xs text-gray-500">{formatDate(item.publishDate)} · {item.tag}{item.authorName ? ` · ${item.authorName}` : ""}</p><p className="mb-5 font-medium">{item.summary}</p><div className="whitespace-pre-wrap break-words text-sm leading-7">{item.content}</div></Modal>;
}
