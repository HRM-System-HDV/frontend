import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import WifiForm from "./WifiForm";
describe("Wi-Fi canonical payload", () => {
  it("requires valid BSSID and submits branch UUID", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const branchId = "019a7680-0000-7000-8000-000000000001";
    render(<WifiForm config={null} branches={[{ id: branchId, branchCode: "CN-00001", name: "Hà Nội", status: "hoạt động" }]} onSave={onSave} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("SSID"), { target: { value: " HRM " } });
    fireEvent.change(screen.getByLabelText("Chi nhánh"), { target: { value: branchId } });
    fireEvent.change(screen.getByLabelText("BSSID"), { target: { value: "invalid" } });
    fireEvent.click(screen.getByText("Lưu Wi-Fi"));
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("BSSID"), { target: { value: "AA:BB:CC:DD:EE:FF" } });
    fireEvent.click(screen.getByText("Lưu Wi-Fi"));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ ssid: "HRM", bssid: "aa:bb:cc:dd:ee:ff", branchId, status: "hoạt động" }));
  });
});
