import { describe, it, expect } from "vitest";
import { cn, formatVND, formatNumber, formatDate, formatDateTime, parseDate } from "./utils";

describe("utility functions (@/lib/utils)", () => {
  describe("cn", () => {
    it("joins multiple class names together", () => {
      expect(cn("px-4", "py-2", "text-sm")).toBe("px-4 py-2 text-sm");
    });

    it("filters out falsy values like false, null, undefined", () => {
      expect(cn("base-class", false && "hidden", null, undefined, "active")).toBe("base-class active");
    });

    it("returns empty string if no valid classes given", () => {
      expect(cn(false, null, undefined)).toBe("");
    });
  });

  describe("formatVND & formatNumber", () => {
    it("formats number as currency string", () => {
      const formatted = formatVND(10000000);
      expect(formatted).toContain("10.000.000");
    });

    it("formats number with thousands separator", () => {
      expect(formatNumber(1234567)).toBe("1.234.567");
    });
  });

  describe("formatDate", () => {
    it("returns empty string for null, undefined, or empty", () => {
      expect(formatDate(null)).toBe("");
      expect(formatDate(undefined)).toBe("");
      expect(formatDate("")).toBe("");
    });

    it("formats ISO string (YYYY-MM-DD) to DD/MM/YYYY", () => {
      expect(formatDate("2026-11-20")).toBe("20/11/2026");
    });

    it("formats Date instance to DD/MM/YYYY", () => {
      const date = new Date(2026, 10, 15); // Month index 10 = November
      expect(formatDate(date)).toBe("15/11/2026");
    });

    it("preserves already formatted DD/MM/YYYY", () => {
      expect(formatDate("05/12/2026")).toBe("05/12/2026");
    });
  });

  describe("formatDateTime", () => {
    it("returns empty string for null or empty", () => {
      expect(formatDateTime(null)).toBe("");
      expect(formatDateTime("")).toBe("");
    });

    it("formats ISO datetime string to DD/MM/YYYY HH:mm", () => {
      const formatted = formatDateTime("2026-11-15T09:30:00");
      expect(formatted).toContain("15/11/2026 09:30");
    });
  });

  describe("parseDate", () => {
    it("returns null for empty or null inputs", () => {
      expect(parseDate(null)).toBeNull();
      expect(parseDate("")).toBeNull();
    });

    it("parses ISO date string to Date object", () => {
      const d = parseDate("2026-11-20");
      expect(d).toBeInstanceOf(Date);
      expect(d?.getFullYear()).toBe(2026);
      expect(d?.getMonth()).toBe(10); // 11th month (0-indexed)
      expect(d?.getDate()).toBe(20);
    });
  });
});
