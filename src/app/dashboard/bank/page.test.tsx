import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BankIntegrationPage from "./page";
const { apiGet, apiPost, apiPut, postSoapPayroll, user } = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn(), postSoapPayroll: vi.fn(), user: { role: "admin" } }));
vi.mock("@/lib/api", async original => ({ ...await original<typeof import("@/lib/api")>(), apiGet, apiPost, apiPut, postSoapPayroll }));
vi.mock("@/context/AuthContext", () => ({ useCurrentUser: () => user }));
vi.mock("@/components/ui/PageHeader", () => ({ default: ({ actions }: { actions: React.ReactNode }) => actions }));
const config = { endpointUrl: "https://bank.example/soap", wsdlUrl: "https://bank.example/soap?wsdl", serviceName: "Payroll", securityMode: "TLS", status: "unknown", certExpiry: null };
beforeEach(() => {
  vi.clearAllMocks();
  user.role = "admin";
  apiGet.mockImplementation(async (path: string) => path === "/api/soap-config" ? config : []);
  apiPost.mockResolvedValue({ ...config, status: "healthy", avgResponseTime: "15ms", lastPingTime: "2026-11-14T03:00:00Z" });
  apiPut.mockResolvedValue(config);
});
it("the connection check calls ping and never sends a payout SOAP request", async () => {
  render(<BankIntegrationPage />);
  fireEvent.click(await screen.findByRole("button", { name: /Kiểm tra đường truyền/ }));
  await waitFor(() => expect(apiPost).toHaveBeenCalledWith("/api/soap-config/ping", {}));
  expect(await screen.findByText("Kiểm tra kết nối thành công.")).toBeInTheDocument();
  expect(screen.getByText("15ms")).toBeInTheDocument();
  expect(postSoapPayroll).not.toHaveBeenCalled();
  expect(screen.queryByText("Gửi lệnh chi lương qua SOAP")).not.toBeInTheDocument();
});
it("admin can edit and save SOAP settings without submitting status metadata", async () => {
  render(<BankIntegrationPage />);
  await screen.findByText("Chưa kiểm tra");
  fireEvent.click(screen.getByRole("button", { name: "Cấu hình SOAP" }));
  fireEvent.change(screen.getByLabelText("Địa chỉ dịch vụ SOAP"), { target: { value: "https://new.example/soap" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu cấu hình" }));
  await waitFor(() => expect(apiPut).toHaveBeenCalledWith("/api/soap-config", { endpointUrl: "https://new.example/soap", wsdlUrl: config.wsdlUrl, serviceName: config.serviceName, securityMode: config.securityMode, certExpiry: null }));
  await waitFor(() => expect(screen.queryByText("Cấu hình kết nối SOAP")).not.toBeInTheDocument());
});
it("a failed configuration save leaves the form open and shows the server error", async () => {
  apiPut.mockRejectedValueOnce(new Error("Địa chỉ WSDL không hợp lệ"));
  render(<BankIntegrationPage />);
  await screen.findByText("Chưa kiểm tra");
  fireEvent.click(screen.getByRole("button", { name: "Cấu hình SOAP" }));
  fireEvent.click(screen.getByRole("button", { name: "Lưu cấu hình" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Địa chỉ WSDL không hợp lệ");
  expect(screen.getByRole("button", { name: "Lưu cấu hình" })).toBeEnabled();
});
it("non-admin cannot open SOAP configuration or call ping", async () => {
  user.role = "manager";
  render(<BankIntegrationPage />);
  expect(screen.getByText("Không có quyền truy cập")).toBeInTheDocument();
  expect(apiGet).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Cấu hình SOAP" })).not.toBeInTheDocument();
});
