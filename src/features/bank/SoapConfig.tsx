"use client";
import { useState } from "react";
import type { SoapGatewayConfig } from "@/types";
import { apiPut, apiPost } from "@/lib/api";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
export default function SoapConfig({ config, onSaved }: {
    config: SoapGatewayConfig | null;
    onSaved: () => Promise<void>;
}) {
    const [endpointUrl, setEndpoint] = useState(config?.endpointUrl || "");
    const [wsdlUrl, setWsdl] = useState(config?.wsdlUrl || "");
    const [serviceName, setService] = useState(config?.serviceName || "");
    const [securityMode, setSecurity] = useState(config?.securityMode || "");
    const [certExpiry, setCert] = useState(config?.certExpiry?.slice(0, 10) || "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    async function run(ping: boolean) { setSaving(true); setError(""); try {
        if (ping)
            await apiPost("/api/soap-config/ping", {});
        else
            await apiPut("/api/soap-config", { endpointUrl, wsdlUrl, serviceName, securityMode, certExpiry: certExpiry ? new Date(certExpiry).toISOString() : null });
        await onSaved();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Không cập nhật được cấu hình.");
    }
    finally {
        setSaving(false);
    } }
    return <Card><CardHeader><CardTitle>Cấu hình SOAP</CardTitle></CardHeader><CardBody><div className="grid md:grid-cols-2 gap-3"><Field label="Địa chỉ dịch vụ"><Input value={endpointUrl} onChange={e => setEndpoint(e.target.value)} disabled={saving}/></Field><Field label="Địa chỉ WSDL"><Input value={wsdlUrl} onChange={e => setWsdl(e.target.value)} disabled={saving}/></Field><Field label="Tên dịch vụ"><Input value={serviceName} onChange={e => setService(e.target.value)} disabled={saving}/></Field><Field label="Chế độ bảo mật"><Input value={securityMode} onChange={e => setSecurity(e.target.value)} disabled={saving}/></Field><Field label="Hạn chứng thư"><Input type="date" value={certExpiry} onChange={e => setCert(e.target.value)} disabled={saving}/></Field></div><p className="text-sm mb-3">Trạng thái: {config?.status === "healthy" ? "Hoạt động" : config?.status === "down" ? "Không kết nối" : config?.status === "degraded" ? "Suy giảm" : "Chưa kiểm tra"} · Phản hồi: {config?.avgResponseTime || "—"} · Kiểm tra gần nhất: {config?.lastPingTime ? new Date(config.lastPingTime).toLocaleString("vi-VN") : "—"}</p><div className="flex gap-2"><Button disabled={saving} onClick={() => run(false)}>Lưu cấu hình</Button><Button variant="white" disabled={saving || !config} onClick={() => run(true)}>Kiểm tra kết nối</Button></div>{error && <p role="alert" className="text-red-700">{error}</p>}</CardBody></Card>;
}
