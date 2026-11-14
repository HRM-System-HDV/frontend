"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { apiPut } from "@/lib/api";
import type { SoapGatewayConfig } from "./types";

function localDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function SoapConfigForm({ config, onClose, onSaved }: {
  config: SoapGatewayConfig;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [endpointUrl, setEndpointUrl] = useState(config.endpointUrl);
  const [wsdlUrl, setWsdlUrl] = useState(config.wsdlUrl);
  const [serviceName, setServiceName] = useState(config.serviceName);
  const [securityMode, setSecurityMode] = useState(config.securityMode);
  const [certExpiry, setCertExpiry] = useState(localDateTime(config.certExpiry));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await apiPut("/api/soap-config", {
        endpointUrl: endpointUrl.trim(), wsdlUrl: wsdlUrl.trim(),
        serviceName: serviceName.trim(), securityMode: securityMode.trim(),
        certExpiry: certExpiry ? new Date(certExpiry).toISOString() : null,
      });
      onSaved();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không lưu được cấu hình SOAP");
    } finally {
      setSaving(false);
    }
  };

  return <Modal open onClose={() => { if (!saving) onClose(); }} title="Cấu hình kết nối SOAP" size="lg"
    footer={<><Button variant="white" disabled={saving} onClick={onClose}>Hủy</Button><Button type="submit" form="soap-config-form" disabled={saving}>{saving ? "Đang lưu..." : "Lưu cấu hình"}</Button></>}>
    <form id="soap-config-form" onSubmit={save}>
      {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <Field label="Địa chỉ dịch vụ SOAP" required><Input aria-label="Địa chỉ dịch vụ SOAP" type="url" required disabled={saving} value={endpointUrl} onChange={e => setEndpointUrl(e.target.value)} /></Field>
      <Field label="Địa chỉ WSDL" required><Input aria-label="Địa chỉ WSDL" type="url" required disabled={saving} value={wsdlUrl} onChange={e => setWsdlUrl(e.target.value)} /></Field>
      <Field label="Tên dịch vụ" required><Input aria-label="Tên dịch vụ" required disabled={saving} value={serviceName} onChange={e => setServiceName(e.target.value)} /></Field>
      <Field label="Phương thức bảo mật" required><Input aria-label="Phương thức bảo mật" required disabled={saving} value={securityMode} onChange={e => setSecurityMode(e.target.value)} /></Field>
      <Field label="Thời hạn chứng chỉ"><Input aria-label="Thời hạn chứng chỉ" type="datetime-local" disabled={saving} value={certExpiry} onChange={e => setCertExpiry(e.target.value)} /></Field>
    </form>
  </Modal>;
}
