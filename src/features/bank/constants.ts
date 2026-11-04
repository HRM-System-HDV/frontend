import type { SoapGatewayConfig } from "./types";

export const DEFAULT_SOAP_GATEWAY_CONFIG: SoapGatewayConfig = {
  endpointUrl: "",
  wsdlUrl: "",
  serviceName: "",
  port: 8443,
  securityMode: "TransportWithMessageCredential (mTLS + X.509)",
  allowedIPs: [],
  status: "unknown",
  lastPingTime: null,
  avgResponseTime: null,
  certExpiry: "—",
  channel: "Gateway (SOAP 1.2 / HTTPS)",
};
