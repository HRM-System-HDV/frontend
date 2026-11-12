import { describe, expect, it } from "vitest";
import { taskPayload } from "./types";
const form = { title: " Kiểm kho ", description: " Mô tả ", mode: "personal" as "personal" | "common", assignedTo: "employee-uuid", branchId: "branch-uuid", workDate: "2026-11-14", templateId: "template-uuid", dueDate: "2026-11-15", priority: "normal", requirePhoto: true };
describe("Hợp đồng giao công việc", () => {
 it("gán trực tiếp employee ID cho công việc cá nhân", () => {
  expect(taskPayload(form)).toEqual({ title: "Kiểm kho", description: "Mô tả", assignedTo: "employee-uuid", dueDate: "2026-11-15", priority: "normal", requirePhoto: true });
 });
 it("gửi một công việc chung theo branch/ngày/template", () => {
  expect(taskPayload({ ...form, mode: "common" })).toEqual({ title: "Kiểm kho", description: "Mô tả", assignedTo: null, branchId: "branch-uuid", workDate: "2026-11-14", templateId: "template-uuid", dueDate: "2026-11-15", priority: "normal", requirePhoto: true });
 });
 it("không cho giao chung thiếu ca mẫu hoặc cá nhân thiếu người nhận", () => {
  expect(() => taskPayload({ ...form, mode: "common", templateId: "" })).toThrow("ca mẫu");
  expect(() => taskPayload({ ...form, assignedTo: "" })).toThrow("nhân viên");
 });
});
