import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import WifiPage from "./page";

const { apiGet, apiDelete, currentUser } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiDelete: vi.fn(),
  currentUser: { role: "admin", branchId: "" },
}));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  apiGet,
  apiDelete,
}));
vi.mock("@/context/AuthContext", () => ({ useCurrentUser: () => currentUser }));

const branchId = "019a7a00-0000-7000-8000-000000000001";
const wifi = {
  id: "019a7a00-0000-7000-8000-000000000009",
  ssid: "HRM_HN1_OFFICE",
  bssid: "00:1a:2b:3c:4d:01",
  branchId,
  status: "hoạt động",
};

const wifiRequests = () => apiGet.mock.calls.filter(([path]) => path === "/api/wifi-configs").length;

describe("Wi-Fi page", () => {
  beforeEach(() => {
    currentUser.role = "admin";
    apiGet.mockReset().mockImplementation(async (path: string) =>
      path === "/api/wifi-configs" ? [wifi] : path === `/api/wifi-configs/${wifi.id}` ? wifi : path === "/api/branches" ? [{ id: branchId, name: "Hà Nội 1", branchCode: "CN-00001", address: "", manager: "", managerId: null, staff: 0, status: "hoạt động" }] : [],
    );
    apiDelete.mockReset().mockResolvedValue({ ok: true });
  });

  it("shows the branch name instead of the raw branch UUID", async () => {
    render(<WifiPage />);
    expect(await screen.findByText("HRM_HN1_OFFICE")).toBeInTheDocument();
    expect(screen.getByText("Hà Nội 1")).toBeInTheDocument();
  });

  it("deletes from the detail modal and refetches instead of trusting the local row", async () => {
    render(<WifiPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Chi tiết" }));
    fireEvent.click(await screen.findByRole("button", { name: "Xóa Wi-Fi" }));
    fireEvent.click(await screen.findByRole("button", { name: "Xóa" }));
    const before = wifiRequests();
    await waitFor(() => expect(apiDelete).toHaveBeenCalledWith(`/api/wifi-configs/${wifi.id}`));
    await waitFor(() => expect(wifiRequests()).toBeGreaterThan(before));
  });

  it("offers no add/edit form: Wi-Fi registration belongs to the mobile app", async () => {
    render(<WifiPage />);
    expect(await screen.findByText("HRM_HN1_OFFICE")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Thêm Wi-Fi/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sửa" })).not.toBeInTheDocument();
  });

  it("blocks a Manager: integration-service rejects non-admin reads of wifi configs", async () => {
    currentUser.role = "manager";
    render(<WifiPage />);
    expect(await screen.findByText("Không có quyền truy cập")).toBeInTheDocument();
    expect(wifiRequests()).toBe(0);
  });
});
