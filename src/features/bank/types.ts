// BE BankAccount không có cột status/chi nhánh dạng text — branch là tên hiển thị
// suy từ branchId (organization-service), mọi giá trị khác là dữ liệu thật của bank_accounts.
export interface BankPartner {
  id: string;
  name: string;
  shortName: string;
  accountNumber: string;
  accountName: string;
  branchId: string | null;
  branch: string;
  /** Ngân hàng/phòng giao dịch nơi doanh nghiệp mở tài khoản (bank_accounts.bankBranch). */
  bankBranch: string;
  balance: number;
  isPrimary: boolean;
  certExpiry: string;
  connectionStatus: "connected" | "disconnected";
}

export interface SoapTransaction {
  id: string;
  batchName: string;
  bankName: string;
  accountNumber?: string;
  accountName?: string;
  totalEmployees: number;
  totalAmount: number;
  status: "success" | "processing" | "pending" | "failed";
  createdAt: string;
  completedAt?: string;
  bankReference: string;
  soapAction: string;
  xmlPayload: string;
  xmlResponse: string;
}

// Khớp đúng model SoapGatewayConfig của integration-service (không có port/allowedIPs/channel).
export interface SoapGatewayConfig {
  endpointUrl: string;
  wsdlUrl: string;
  serviceName: string;
  securityMode: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  lastPingTime: string | null;
  avgResponseTime: string | null;
  certExpiry?: string;
}
