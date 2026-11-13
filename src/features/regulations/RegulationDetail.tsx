"use client";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { apiGet, apiPost, GATEWAY_URL } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Regulation } from "@/types";
export default function RegulationDetail({ item, canWrite, busy, actionError, onClose, onEdit, onDelete, onPin, onUploaded }: { item: Regulation; canWrite: boolean; busy: boolean; actionError?: string; onClose: () => void; onEdit: () => void; onDelete: () => void; onPin: () => void; onUploaded: (item: Regulation) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  async function upload(file?: File) {
    if (!file || uploading) return;
    if (file.type !== "application/pdf") { setError("Vui lòng chọn tệp PDF."); return; }
    setUploading(true); setError("");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Không đọc được tệp.")); reader.readAsDataURL(file); });
      await apiPost("/api/upload", { file: dataUrl, folder: "hrm/regulations", regulationId: item.id });
      onUploaded(await apiGet<Regulation>(`/api/regulations/${item.id}`));
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể tải tệp PDF."); } finally { setUploading(false); }
  }
  const disabled = busy || uploading;
  return <Modal open title={item.title} size="xl" onClose={() => !disabled && onClose()} footer={<>{canWrite && <><Button variant="danger" disabled={disabled} onClick={onDelete}>Xóa</Button><Button variant="white" disabled={disabled} onClick={onPin}>{item.pinned ? "Bỏ ghim" : "Ghim"}</Button><Button disabled={disabled} onClick={onEdit}>Sửa</Button></>}<Button variant="white" disabled={disabled} onClick={onClose}>Đóng</Button></>}>
    {actionError && <p role="alert" className="mb-4 text-red-700">{actionError}</p>}<p className="mb-4 text-xs text-gray-500">{item.regulationCode} · Phiên bản {item.version} · {item.status}</p><p className="mb-4 text-sm">Hiệu lực từ {formatDate(item.effectiveDate)}{item.expiryDate ? ` đến ${formatDate(item.expiryDate)}` : ""}</p><p className="mb-5 font-medium">{item.summary}</p><div className="mb-5 whitespace-pre-wrap break-words text-sm leading-7">{item.content}</div>
    <div className="border-t border-gray-200 pt-4"><h3 className="mb-3 font-semibold">Tệp đính kèm</h3>{item.files?.length ? <ul className="space-y-2">{item.files.map((file, index) => <li key={file.id}><a className="text-primary underline" href={`${GATEWAY_URL}/api/files/${file.publicId}`} target="_blank" rel="noopener noreferrer">Tệp {index+1} ({file.mime === "application/pdf" ? "PDF" : file.mime})</a></li>)}</ul> : <p className="text-sm text-gray-500">Chưa có tệp đính kèm.</p>}
      {canWrite && <label className="mt-4 block text-sm font-medium">Đính kèm PDF<input aria-label="Đính kèm PDF" className="mt-2 block w-full text-sm" type="file" accept="application/pdf" disabled={disabled} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }} /></label>}
      {uploading && <p role="status">Đang tải PDF...</p>}{error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
    </div>
  </Modal>;
}
