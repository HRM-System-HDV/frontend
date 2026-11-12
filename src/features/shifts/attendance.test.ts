import { describe, expect, it } from "vitest";
import { attendancePayload, localTimestamp } from "./types";
describe("Giờ chấm công trên ca", () => {
 it("gửi timestamp UTC từ giờ Việt Nam và giữ ngày ra ca qua đêm", () => {
  expect(attendancePayload("2026-01-02T22:00", "2026-01-03T06:00", " Ca đêm ")).toEqual({ checkIn: "2026-01-02T15:00:00.000Z", checkOut: "2026-01-02T23:00:00.000Z", penaltyNote: "Ca đêm" });
  expect(localTimestamp("2026-01-02T23:00:00.000Z")).toBe("2026-01-03T06:00");
 });
 it("từ chối giờ ra trước giờ vào và thiếu cặp vào–ra", () => {
  expect(() => attendancePayload("2026-01-02T22:00", "2026-01-02T06:00", "")).toThrow("Giờ ra");
  expect(() => attendancePayload("2026-01-02T22:00", "", "")).toThrow("chọn đủ");
 });
});
