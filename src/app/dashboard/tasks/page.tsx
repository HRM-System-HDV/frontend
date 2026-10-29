"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTriangleExclamation,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { apiGet, apiPost, GatewayError, GATEWAY_URL } from "@/lib/api";
import type { Employee } from "@/types";
import type { TaskItem, TaskSourceType, TaskStatus } from "@/features/tasks/types";
import TaskFilterBar from "@/features/tasks/TaskFilter";
import TaskTable from "@/features/tasks/TaskTable";
import CreateTaskModal from "@/features/tasks/TaskForm";
import TaskDetailModal from "@/features/tasks/TaskDetail";
import { useCurrentUser } from "@/context/AuthContext";

async function parseEnvelope(res: Response) {
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const err = (body as { error?: { code: string; message: string } } | null)?.error;
    throw new GatewayError(
      err?.code || `HTTP_${res.status}`,
      err?.message || `Lỗi hệ thống (${res.status})`,
      res.status
    );
  }
  if (body !== null && typeof body === "object" && "data" in body) {
    return (body as { data: unknown }).data;
  }
  return body;
}

async function apiPut<T>(path: string, payload?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${GATEWAY_URL}${path}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
      signal: controller.signal,
    });
    return (await parseEnvelope(res)) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function apiDelete<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${GATEWAY_URL}${path}`, {
      method: "DELETE",
      credentials: "include",
      signal: controller.signal,
    });
    return (await parseEnvelope(res)) as T;
  } finally {
    clearTimeout(timer);
  }
}

function mapBackendTaskToTaskItem(raw: any, empMap?: Map<string, Employee>): TaskItem {
  let status: TaskStatus = "pending";
  if (raw.status === "done" || raw.status === "completed") {
    status = "completed";
  } else if (raw.status === "in_progress" || raw.status === "inProgress") {
    status = "inProgress";
  } else if (raw.status === "overdue") {
    status = "overdue";
  } else {
    if (raw.dueDate && new Date(raw.dueDate).getTime() < Date.now()) {
      status = "overdue";
    } else {
      status = "pending";
    }
  }

  let assignedToName = raw.assignedToName || raw.assignedTo || "Tất cả nhân sự";
  let assignedToEmail = raw.assignedToEmail || "shift_all";
  if (raw.assignedTo && empMap?.has(raw.assignedTo)) {
    const emp = empMap.get(raw.assignedTo)!;
    assignedToName = emp.name;
    assignedToEmail = emp.email;
  }

  return {
    id: raw.id,
    title: raw.title || "Nhiệm vụ",
    description: raw.description || "",
    sourceType: (raw.sourceType as TaskSourceType) || (raw.shiftName ? "shift" : "manager"),
    assignedByName: raw.assignedByName || "Ban Quản lý",
    shiftName: raw.shiftName,
    branch: raw.branchSlug || raw.branch || "HN-1",
    dueDate: raw.dueDate ? String(raw.dueDate).replace("T", " ") : "—",
    status,
    priority: raw.priority || "normal",
    assignedToEmail,
    assignedToName,
    completedAt: raw.completedAt,
    createdAt: raw.createdAt
      ? new Date(raw.createdAt).toISOString().replace("T", " ").substring(0, 16)
      : "—",
    requirePhoto: Boolean(raw.requirePhoto),
    proofPhotoUrl: raw.proofPhotoUrl,
    photoSubmittedBy: raw.photoSubmittedBy,
    photoSubmittedAt: raw.photoSubmittedAt,
  };
}

export default function TasksPage() {
  const { role, branchSlug, name: currentUserRealName } = useCurrentUser();
  const isAdmin = role === "admin";

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [empList, setEmpList] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "danger" } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<TaskStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<TaskSourceType | "all">("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Modal Chi tiết nhiệm vụ
  const [detailTask, setDetailTask] = useState<TaskItem | null>(null);

  const showToast = (text: string, tone: "success" | "danger" = "success") => {
    setToast({ text, tone });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const empMap = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const e of empList) {
      map.set(e.id, e);
      map.set(e.name, e);
      map.set(e.email, e);
    }
    return map;
  }, [empList]);

  // Load danh sách tasks & employees từ gateway
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const effectiveBranch = isAdmin
        ? (branchFilter === "all" ? "" : branchFilter)
        : branchSlug;
      const queryParams = new URLSearchParams();
      if (effectiveBranch) queryParams.set("branchSlug", effectiveBranch);

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

      const [tasksRes, empRes] = await Promise.allSettled([
        apiGet<any[]>(`/api/tasks${queryString}`),
        apiGet<Employee[]>("/api/employees"),
      ]);

      let employeesData: Employee[] = [];
      if (empRes.status === "fulfilled" && Array.isArray(empRes.value)) {
        employeesData = empRes.value;
      }
      setEmpList(employeesData);

      const currentEmpMap = new Map<string, Employee>();
      for (const e of employeesData) {
        currentEmpMap.set(e.id, e);
        currentEmpMap.set(e.name, e);
        currentEmpMap.set(e.email, e);
      }

      if (tasksRes.status === "fulfilled" && Array.isArray(tasksRes.value)) {
        setTasks(tasksRes.value.map((t) => mapBackendTaskToTaskItem(t, currentEmpMap)));
      }
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Không thể tải danh sách nhiệm vụ từ gateway";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, branchFilter, branchSlug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Lọc theo chi nhánh: Admin có bộ lọc chi nhánh (all/HN-1...), Manager cố định chi nhánh
  const branchFilteredTasks = useMemo(() => {
    if (isAdmin) {
      if (branchFilter === "all") return tasks;
      return tasks.filter(
        (t) => t.branch.toLowerCase().replace("-", "") === branchFilter.toLowerCase().replace("-", "")
      );
    }
    return tasks.filter(
      (t) =>
        t.branch.toLowerCase().replace("-", "") === branchSlug.toLowerCase().replace("-", "") ||
        t.branch === "HN-1"
    );
  }, [tasks, isAdmin, branchSlug, branchFilter]);

  // Bộ đếm trạng thái cho badge
  const statusCounts = useMemo(() => {
    const counts = {
      all: branchFilteredTasks.length,
      pending: 0,
      inProgress: 0,
      overdue: 0,
      completed: 0,
    };
    branchFilteredTasks.forEach((t) => {
      if (t.status in counts) {
        counts[t.status as TaskStatus]++;
      }
    });
    return counts;
  }, [branchFilteredTasks]);

  // Lọc theo search, tab trạng thái và nguồn việc
  const displayedTasks = useMemo(() => {
    return branchFilteredTasks.filter((t) => {
      // Filter status tab
      if (statusTab !== "all" && t.status !== statusTab) {
        return false;
      }
      // Filter source
      if (sourceFilter !== "all" && t.sourceType !== sourceFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = t.description.toLowerCase().includes(q);
        const matchAssignee = t.assignedToName.toLowerCase().includes(q);
        const matchAssigner = t.assignedByName.toLowerCase().includes(q);
        return matchTitle || matchDesc || matchAssignee || matchAssigner;
      }
      return true;
    });
  }, [branchFilteredTasks, statusTab, sourceFilter, searchQuery]);

  // Xác nhận hoàn thành công việc từ Modal chi tiết (PUT /api/tasks/:id)
  const handleCompleteTask = async (taskId: string, photoUrl?: string) => {
    const completedAt = new Date().toISOString().replace("T", " ").substring(0, 16);
    try {
      setActionInProgress(true);
      await apiPut(`/api/tasks/${encodeURIComponent(taskId)}`, {
        status: "done",
        proofPhotoUrl: photoUrl,
        completedAt,
      });
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            return {
              ...t,
              status: "completed",
              proofPhotoUrl: photoUrl || t.proofPhotoUrl,
              completedAt,
            };
          }
          return t;
        })
      );
      showToast("Đã duyệt hoàn thành nhiệm vụ thành công", "success");
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi duyệt hoàn thành";
      showToast(msg, "danger");
    } finally {
      setActionInProgress(false);
    }
  };

  // Thao tác xóa task từ Modal chi tiết (DELETE /api/tasks/:id)
  const handleDeleteTask = async (taskId: string) => {
    try {
      setActionInProgress(true);
      await apiDelete(`/api/tasks/${encodeURIComponent(taskId)}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      showToast("Đã xóa nhiệm vụ thành công", "success");
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi xóa nhiệm vụ";
      showToast(msg, "danger");
    } finally {
      setActionInProgress(false);
    }
  };

  // Thêm task mới (POST /api/tasks)
  const handleCreateTask = async (newTask: TaskItem) => {
    const payload = {
      title: newTask.title,
      description: newTask.description,
      assignedTo: newTask.assignedToName,
      branchSlug: newTask.branch,
      dueDate: newTask.dueDate,
      status: "pending",
      sourceType: newTask.sourceType,
      assignedByName: newTask.assignedByName,
      shiftName: newTask.shiftName,
      priority: newTask.priority,
      assignedToEmail: newTask.assignedToEmail,
      assignedToName: newTask.assignedToName,
      requirePhoto: newTask.requirePhoto,
      proofPhotoUrl: newTask.proofPhotoUrl,
    };

    try {
      setActionInProgress(true);
      const res = await apiPost<any>("/api/tasks", payload);
      const createdTask = res && typeof res === "object" && "data" in res ? res.data : res;
      const mapped = mapBackendTaskToTaskItem(createdTask || newTask, empMap);
      setTasks((prev) => [mapped, ...prev]);
      showToast(`Đã giao nhiệm vụ "${newTask.title}" thành công`, "success");
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi giao nhiệm vụ";
      showToast(msg, "danger");
    } finally {
      setActionInProgress(false);
    }
  };

  const currentUserName =
    currentUserRealName && currentUserRealName !== "Đang tải..."
      ? `${currentUserRealName} (${isAdmin ? "Admin" : "Quản lý"})`
      : isAdmin
        ? "Quản trị viên"
        : "Quản lý chi nhánh";

  return (
    <div className="space-y-6">
      {/* Toast thông báo nổi */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all ${
            toast.tone === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <FontAwesomeIcon
            icon={toast.tone === "success" ? faCircleCheck : faTriangleExclamation}
            className="text-base"
          />
          <span>{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      <PageHeader
        title="Giao việc & Quản lý nhiệm vụ"
        breadcrumb={[{ label: "HRM", href: "#" }, { label: "Nhiệm vụ" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={() => setCreateModalOpen(true)} disabled={actionInProgress}>
              Giao việc mới
            </Button>
          </div>
        }
      />

      {/* Hiển thị lỗi tải nếu có */}
      {error && !loading && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50/80 flex items-center justify-between text-sm text-red-700">
          <div className="flex items-center gap-2.5">
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500 text-base" />
            <span>{error}</span>
          </div>
          <Button variant="white" size="sm" onClick={fetchData}>
            Thử lại
          </Button>
        </div>
      )}

      {/* Filter & Search Bar - Admin chọn chi nhánh ở đây */}
      <TaskFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusTab={statusTab}
        onStatusTabChange={setStatusTab}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
        branchFilter={branchFilter}
        onBranchFilterChange={setBranchFilter}
        isManager={!isAdmin}
        managerBranch={branchSlug.toUpperCase()}
        statusCounts={statusCounts}
      />

      {/* Loading Skeleton */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-9 w-64 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-100/80 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        /* Bảng danh sách công việc: Thao tác mở Modal Chi tiết */
        <TaskTable
          tasks={displayedTasks}
          onOpenDetail={(task) => setDetailTask(task)}
        />
      )}

      {/* Modal Giao việc mới - Manager cứng chi nhánh, Admin theo chi nhánh đã chọn ở bộ lọc */}
      <CreateTaskModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        employees={
          isAdmin
            ? (branchFilter !== "all"
                ? empList.filter((e) => e.branch.toLowerCase().replace("-", "") === branchFilter.toLowerCase().replace("-", ""))
                : empList)
            : empList.filter((e) => e.branch.toLowerCase().replace("-", "") === branchSlug.toLowerCase().replace("-", ""))
        }
        currentBranch={isAdmin && branchFilter !== "all" ? branchFilter.toUpperCase() : branchSlug.toUpperCase()}
        currentUserName={currentUserName}
        onCreated={handleCreateTask}
      />

      {/* Modal Chi tiết nhiệm vụ (Xác nhận hoàn thành & Xóa tại đây) */}
      <TaskDetailModal
        open={!!detailTask}
        onClose={() => setDetailTask(null)}
        task={detailTask}
        onComplete={handleCompleteTask}
        onDelete={handleDeleteTask}
      />
    </div>
  );
}
