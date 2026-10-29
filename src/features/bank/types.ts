export interface BankPartner {
  id: string;
  name: string;
  shortName: string;
  accountNumber: string;
  accountName: string;
  branch: string;
  balance: number;
  isPrimary: boolean;
  status: "active" | "standby" | "maintenance";
  soapProtocol: string;
  mTLSStatus: "valid" | "expiring_soon" | "not_configured";
  certExpiry: string;
}

export interface SoapTransaction {
  id: string;
  batchName: string;
  bankName: string;
  totalEmployees: number;
  totalAmount: number;
  status: "success" | "processing" | "pending" | "failed";
  createdAt: string;
  completedAt?: string;
  bankReference: string;
  soapAction: string;
  xmlPayload: string;
  xmlResponse: string;
  /** Có khi backend trả deduped:true (trùng idempotencyKey) — dùng để hiện badge "Trùng". */
  deduped?: boolean;
}

export interface SoapGatewayConfig {
  endpointUrl: string;
  wsdlUrl: string;
  serviceName: string;
  port: number;
  securityMode: string;
  allowedIPs: string[];
  status: "healthy" | "degraded" | "down" | "unknown";
  lastPingTime: string;
  avgResponseTime: string;
}
