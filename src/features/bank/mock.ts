import type { SoapGatewayConfig } from "./types";

// Cấu hình giám sát Gateway SOAP Ngân hàng — backend chưa có API quản trị
// cho các thông số này nên tạm giữ local (xử lý sau khi có endpoint).
export const initialSoapGatewayConfig: SoapGatewayConfig = {
  endpointUrl: "https://hrm.company.local/soap/payroll",
  wsdlUrl: "https://hrm.company.local/soap/payroll?wsdl",
  serviceName: "PayrollDirectDisbursementService",
  port: 8443,
  securityMode: "TransportWithMessageCredential (mTLS + X.509)",
  allowedIPs: ["203.162.10.45", "118.70.124.8", "123.30.55.19", "14.161.32.90"],
  status: "healthy",
  lastPingTime: "17/09/2026 07:50:12",
  avgResponseTime: "128ms",
};
