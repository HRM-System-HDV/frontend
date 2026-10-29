"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";
import { apiGet } from "@/lib/api";
import type { WifiConfig, Branch } from "@/types";

export interface WifiFormPayload {
  ssid: string;
  bssid: string;
  branch: string;
  status: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: WifiConfig | null;
  saving: boolean;
  onSubmit: (payload: WifiFormPayload) => void;
}

export default function WifiFormModal({ open, onClose, initial, saving, onSubmit }: Props) {
  const isEdit = Boolean(initial);
  const [ssid, setSsid] = useState("");
  const [bssid, setBssid] = useState("");
  const [branch, setBranch] = useState("HN-1");
  const [status, setStatus] = useState("hoạt động");
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    if (open) {
      setSsid(initial?.ssid || "");
      setBssid(initial?.bssid || "");
      setBranch(initial?.branch || "HN-1");
      setStatus(initial?.status || "hoạt động");
      apiGet<Branch[]>("/api/branches").then((d) => setBranches(d || [])).catch(() => {});
    }
  }, [open, initial]);

  const handleSubmit = () => {
    if (!ssid.trim() || !bssid.trim() || !branch.trim()) return;
    onSubmit({ ssid: ssid.trim(), bssid: bssid.trim(), branch: branch.trim(), status });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Sửa cấu hình Wi-Fi chấm công" : "Thêm Wi-Fi chấm công mới"}
      size="md"
      footer={
        <>
          <Button variant="white" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Thêm Wi-Fi"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="SSID (tên Wi-Fi)" required>
          <Input
            value={ssid}
            onChange={(e) => setSsid(e.target.value)}
            disabled={saving}
            placeholder="VD: HRM_HN1_OFFICE"
            className="font-mono"
          />
        </Field>
        <Field label="BSSID (địa chỉ MAC AP)" required>
          <Input
            value={bssid}
            onChange={(e) => setBssid(e.target.value)}
            disabled={saving}
            placeholder="VD: 00:1A:2B:3C:4D:01"
            className="font-mono"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Chi nhánh" required>
            <Select value={branch} onChange={(e) => setBranch(e.target.value)} disabled={saving}>
              {branches.map((b) => (
                <option key={b.id || b.slug} value={b.slug.toUpperCase()}>
                  {b.name} ({b.slug.toUpperCase()})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Trạng thái">
            <Select value={status} onChange={(e) => setStatus(e.target.value)} disabled={saving}>
              <option value="hoạt động">hoạt động</option>
              <option value="vô hiệu hóa">vô hiệu hóa</option>
            </Select>
          </Field>
        </div>
      </div>
    </Modal>
  );
}
