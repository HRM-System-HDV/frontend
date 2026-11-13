import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import NotificationTools, { reminderFields, reminderPayload } from "./NotificationTools";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiGet: api.get, apiPost: api.post, apiPut: api.put }));
const branchId = "019a7680-0000-7000-8000-000000000001";
const employeeId = "019a7680-0000-7000-8000-000000000002";
const settings = Object.fromEntries(reminderFields.map(([key]) => [key, true]));
async function openTools() {
  api.get.mockImplementation(async (path: string) => path === "/api/notifications/settings" ? { ...settings, id: "setting-id", userId: "current-user" } : [{ id: employeeId, employeeCode: "NV-00001", name: "Nguyễn An", branchId, status: "đang làm" }, { id: "outside", employeeCode: "NV-00002", name: "Ngoài chi nhánh", branchId: "other", status: "đang làm" }]);
  render(<NotificationTools role="manager" branchId={branchId} branches={[{ id: branchId, branchCode: "CN-00001", name: "Hà Nội", status: "hoạt động" }]} />);
  const details = screen.getByText("Thông báo và nhắc chấm công").closest("details")!;
  details.open = true;
  fireEvent(details, new Event("toggle"));
  await waitFor(() => expect(screen.getByLabelText("Người nhận")).not.toBeDisabled());
}
describe("Notification tools", () => {
  it("strips record identifiers and requires boolean settings", () => {
    expect(reminderPayload({ ...settings, id: "ignored", userId: "ignored", soundEnabled: true, vibrateEnabled: false, tabNotificationAlert: true })).toEqual(settings);
    expect(() => reminderPayload({ ...settings, checkInBefore1Hour: "true" })).toThrow();
  });
  it("fixes manager delivery to their branch and sends an employee UUID", async () => {
    api.post.mockResolvedValue({ id: "notification" });
    await openTools();
    expect(screen.getByLabelText("Phạm vi gửi")).toBeDisabled();
    expect(screen.queryByRole("option", { name: /Ngoài chi nhánh/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Người nhận"), { target: { value: employeeId } });
    fireEvent.change(screen.getByLabelText("Tiêu đề thông báo"), { target: { value: " Lịch họp " } });
    fireEvent.change(screen.getByLabelText("Nội dung thông báo"), { target: { value: " Họp lúc 9 giờ. " } });
    fireEvent.click(screen.getAllByRole("button", { name: "Gửi thông báo" }).at(-1)!);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/api/notifications", { title: "Lịch họp", body: "Họp lúc 9 giờ.", branchId, targetEmployeeId: employeeId }));
  });
  it("saves only supported reminder booleans for the current user", async () => {
    await openTools();
    fireEvent.click(screen.getByRole("button", { name: "Nhắc của tôi" }));
    fireEvent.click(screen.getByLabelText("Nhắc vào ca trước 1 giờ"));
    const expected = { ...settings, checkInBefore1Hour: false };
    api.put.mockResolvedValue({ ...expected, userId: "current-user" });
    fireEvent.click(screen.getByRole("button", { name: "Lưu cài đặt nhắc" }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith("/api/notifications/settings", expected));
  });
});
