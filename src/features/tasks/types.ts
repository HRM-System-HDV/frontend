export type { Task } from "@/types";
export type TaskInput = { title: string; description: string; assignedTo: string | null; branchId?: string; workDate?: string; templateId?: string; dueDate: string | null; priority: string; requirePhoto: boolean };
export const statusLabels = { pending: "Chưa thực hiện", in_progress: "Đang thực hiện", done: "Hoàn thành" };
export function taskPayload(form: { title: string; description: string; mode: "personal" | "common"; assignedTo: string; branchId: string; workDate: string; templateId: string; dueDate: string; priority: string; requirePhoto: boolean }): TaskInput {
 if (!form.title.trim()) throw new Error("Vui lòng nhập tên công việc");
 if (form.mode === "personal" && !form.assignedTo) throw new Error("Vui lòng chọn nhân viên được giao");
 if (form.mode === "common" && (!form.branchId || !form.workDate || !form.templateId)) throw new Error("Công việc chung cần chi nhánh, ngày làm và ca mẫu");
 return { title: form.title.trim(), description: form.description.trim(), assignedTo: form.mode === "personal" ? form.assignedTo : null, ...(form.mode === "common" ? { branchId: form.branchId, workDate: form.workDate, templateId: form.templateId } : {}), dueDate: form.dueDate || null, priority: form.priority, requirePhoto: form.requirePhoto };
}

