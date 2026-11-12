"use client";
import Button from "@/components/ui/Button";
import type { Task } from "@/types";
import { displayDate } from "@/features/shifts/types";
import { statusLabels } from "./types";
export default function TaskTable({ tasks, assignee, onOpen }: { tasks: Task[]; assignee: (task: Task) => string; onOpen: (task: Task) => void }) {
 return <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white"><table className="w-full text-left text-sm [&_td]:border-t [&_td]:border-gray-100 [&_td]:px-4 [&_td]:py-4"><thead className="bg-gray-50 text-xs text-gray-600"><tr>{["Công việc", "Người / ca được giao", "Hạn hoàn thành", "Trạng thái", "Thao tác"].map(label => <th key={label} className="whitespace-nowrap px-4 py-3">{label}</th>)}</tr></thead><tbody>{!tasks.length ? <tr><td colSpan={5} className="text-center text-gray-500">Không có công việc phù hợp.</td></tr> : tasks.map(task => <tr key={task.id}><td><p className="font-medium">{task.title}</p><p className="mt-1 text-xs text-gray-500">{task.assignedTo === null ? "Công việc chung" : "Công việc cá nhân"}{task.requirePhoto ? " · Cần ảnh minh chứng" : ""}</p></td><td>{assignee(task)}</td><td>{displayDate(task.dueDate)}</td><td><span className={task.status === "done" ? "text-emerald-700" : "text-primary"}>{statusLabels[task.status]}</span></td><td><Button size="sm" variant="white" onClick={() => onOpen(task)}>Chi tiết</Button></td></tr>)}</tbody></table></div>;
}
