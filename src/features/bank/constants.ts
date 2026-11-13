import type { SoapGatewayConfig } from "./types";

export const DEFAULT_SOAP_GATEWAY_CONFIG: SoapGatewayConfig = {
  endpointUrl: "",
  wsdlUrl: "",
  serviceName: "",
  securityMode: "",
  status: "unknown",
  lastPingTime: null,
  avgResponseTime: null,
  certExpiry: "Chưa thiết lập",
};
