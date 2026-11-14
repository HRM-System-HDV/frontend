import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import AttendanceTimeModal from "./AttendanceTimeModal";

const base = { open: true, shiftLabel: "Nguyễn Văn A · 12/11/2026 · 07:00-15:00", saving: false, onClose: vi.fn() };

describe("AttendanceTimeModal", () => {
  it("sends both moments as timezone-aware ISO, which is all saveAttendance accepts", () => {
    const onSubmit = vi.fn();
    render(
      <AttendanceTimeModal
        {...base}
        initialCheckIn="2026-11-12T07:02:00+07:00"
        initialCheckOut="2026-11-12T16:58:00+07:00"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Lưu giờ chấm công" }));
    const [payload] = onSubmit.mock.calls[0];
    expect(Object.keys(payload).sort()).toEqual(["checkIn", "checkOut"]);
    expect(payload.checkIn).toMatch(/(?:Z|[+-]\d{2}:\d{2})$/);
    expect(new Date(payload.checkIn).getTime()).toBe(new Date("2026-11-12T07:02:00+07:00").getTime());
    expect(new Date(payload.checkOut).getTime()).toBe(new Date("2026-11-12T16:58:00+07:00").getTime());
  });

  it("keeps saving blocked until both times are present: PUT rejects a one-sided row", () => {
    const onSubmit = vi.fn();
    render(<AttendanceTimeModal {...base} onSubmit={onSubmit} />);
    expect(screen.getByRole("button", { name: "Lưu giờ chấm công" })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("sends penaltyNote only when the manager typed one", () => {
    const onSubmit = vi.fn();
    render(
      <AttendanceTimeModal
        {...base}
        initialCheckIn="2026-11-12T07:00:00+07:00"
        initialCheckOut="2026-11-12T15:00:00+07:00"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText(/Nhân viên quên chốt ra/), { target: { value: "Quên chốt ra" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu giờ chấm công" }));
    expect(onSubmit.mock.calls[0][0]).toEqual(
      expect.objectContaining({ penaltyNote: "Quên chốt ra" }),
    );
  });
});
