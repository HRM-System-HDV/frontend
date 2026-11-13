"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTriangleExclamation,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { apiGet, apiPost, apiPut, apiDelete, GatewayError } from "@/lib/api";
import type { Employee, Branch } from "@/types";
import type { TaskItem, TaskStatus } from "@/features/tasks/types";
import TaskFilterBar from "@/features/tasks/TaskFilter";
import TaskTable from "@/features/tasks/TaskTable";
import CreateTaskModal from "@/features/tasks/TaskForm";
import TaskDetailModal from "@/features/tasks/TaskDetail";
import { useCurrentUser } from "@/context/AuthContext";
import { roleLabel } from "@/lib/permissions";
import { useLocalStorageState } from "@/hooks/useLocalStorage";
import { formatDateTime, parseDate } from "@/lib/utils";

// Thông điệp lỗi hiển thị cho người dùng: ưu tiên message của gateway,
// không bao giờ biến lỗi mạng/403 thành danh sách rỗng.
function errorMessage(reason: unknown, fallback: string): string {
  if (reason instanceof GatewayError) return reason.message;
  if (reason instanceof Error && reason.message) return reason.message;
  return fallback;
}

function mapBackendTaskToTaskItem(raw: any, empMap?: Map<string, Employee>): TaskItem {
  // BE chỉ có 3 trạng thái; "overdue" là suy diễn hiển thị phía FE từ dueDate.
  let status: TaskStatus;
  if (raw.status === "done") {
    status = "completed";
  } else if (raw.status === "in_progress") {
    status = "inProgress";
  } else {
    const due = parseDate(raw.dueDate);
    status = due && due.getTime() < Date.now() ? "overdue" : "pending";
  }

  // Task chung (assignedTo = null) hiển thị cho cả ca — BE không lưu email người nhận.
  let assignedToName = raw.assignedToName || "Tất cả nhân sự";
  let branch = raw.branchId || "";
  if (raw.assignedTo && empMap?.has(raw.assignedTo)) {
    const emp = empMap.get(raw.assignedTo)!;
    assignedToName = emp.name;
    if (!branch && emp.branchId) {
      branch = emp.branchId;
    }
  }

  return {
    id: raw.id,
    title: raw.title || "Nhiệm vụ",
    description: raw.description || "",
    assignedByName: raw.assignedByName || "Ban Quản lý",
    branch,
    dueDate: raw.dueDate ? formatDateTime(raw.dueDate) : "—",
    status,
    priority: raw.priority || "normal",
    assignedToName,
    completedAt: raw.completedAt,
    createdAt: raw.createdAt ? formatDateTime(raw.createdAt) : "—",
    requirePhoto: Boolean(raw.requirePhoto),
    proofPhotoUrl: raw.proofPhotoUrl,
    photoSubmittedByName: raw.photoSubmittedByName,
    photoSubmittedAt: raw.photoSubmittedAt,
  };
}

export default function TasksPage() {
  const { role, branchId, name: currentUserRealName } = useCurrentUser();
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  // Ghi task (POST/DELETE /api/tasks) chỉ dành cho manager + admin.
  const canWriteTasks = role !== "staff";
  const managerBranch = branchId ? branchId : "";

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [empList, setEmpList] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "danger" } | null>(null);

  const [searchQuery, setSearchQuery] = useLocalStorageState<string>("hrm_tasks_search", "");
  const [statusTab, setStatusTab] = useLocalStorageState<TaskStatus | "all">("hrm_tasks_status_tab", "all");
  const [savedBranchFilter, setSavedBranchFilter] = useLocalStorageState<string>("hrm_tasks_branch_filter_by_id", "all");
  const branchFilter = isManager ? managerBranch : savedBranchFilter;
  const setBranchFilter = useCallback(
    (b: string) => {
      if (!isManager) setSavedBranchFilter(b);
    },
    [isManager, setSavedBranchFilter]
  );
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Modal Chi tiết nhiệm vụ
  const [detailTask, setDetailTask] = useState<TaskItem | null>(null);

  const showToast = (text: string, tone: "success" | "danger" = "success") => {
    setToast({ text, tone });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Load danh sách tasks & employees từ gateway
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const effectiveBranch = isAdmin
        ? (branchFilter === "all" ? "" : branchFilter)
        : branchId;
      const queryParams = new URLSearchParams();
      if (effectiveBranch) queryParams.set("branchId", effectiveBranch);

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

      const [tasksRes, empRes, branchesRes] = await Promise.allSettled([
        apiGet<any[]>(`/api/tasks${queryString}`),
        apiGet<Employee[]>("/api/employees"),
        apiGet<Branch[]>("/api/branches"),
      ]);

      if (branchesRes.status === "fulfilled" && Array.isArray(branchesRes.value)) {
        setBranches(branchesRes.value);
      }

      let employeesData: Employee[] = [];
      if (empRes.status === "fulfilled" && Array.isArray(empRes.value)) {
        // API trả `branchId`; các màn khác đọc `branch` nên chuẩn hoá tại đây
        // để bộ lọc chi nhánh không bị rỗng.
        employeesData = empRes.value.map((e) => ({ ...e, branchId: e.branchId ?? null }));
      }
      setEmpList(employeesData);

      // assignedTo là employees.id nên chỉ cần map theo id.
      const currentEmpMap = new Map(employeesData.map((e) => [e.id, e]));

      if (tasksRes.status === "fulfilled" && Array.isArray(tasksRes.value)) {
        setTasks(tasksRes.value.map((t) => mapBackendTaskToTaskItem(t, currentEmpMap)));
      } else if (tasksRes.status === "rejected") {
        // Lỗi mạng/403 không được hiển thị như "không có nhiệm vụ nào".
        setError(errorMessage(tasksRes.reason, "Không thể tải danh sách nhiệm vụ từ gateway"));
      }
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Không thể tải danh sách nhiệm vụ từ gateway";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, branchFilter, branchId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Lọc theo chi nhánh: Admin có bộ lọc chi nhánh (all/CN01...), Manager cố định chi nhánh
  const branchFilteredTasks = useMemo(() => {
    if (isAdmin) {
      if (branchFilter === "all") return tasks;
      return tasks.filter(
        (t) => (t.branch || "") === branchFilter
      );
    }
    return tasks.filter(
      (t) =>
        (t.branch || "") === branchId
    );
  }, [tasks, isAdmin, branchId, branchFilter]);

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
  }, [branchFilteredTasks, statusTab, searchQuery]);

  // Xác nhận hoàn thành công việc từ Modal chi tiết (PUT /api/tasks/:id)
  const handleCompleteTask = async (taskId: string, photoUrl?: string) => {
    try {
      setActionInProgress(true);
      await apiPut(`/api/tasks/${encodeURIComponent(taskId)}`, {
        status: "done",
        proofPhotoUrl: photoUrl,
      });
      // Nguồn trạng thái thật là BE (task chung theo ca dùng kết quả chung)
      // nên tải lại thay vì cập nhật cục bộ.
      await fetchData();
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
      await fetchData();
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
      // BE kiểm assignedTo là employees.id (không có cột email trên Task).
      // Task theo ca có assignedTo null — web chỉ tạo task riêng nên luôn có id.
      assignedTo: newTask.assignedToId ?? null,
      branchId: newTask.branch,
      dueDate: newTask.dueDate,
      status: "pending",
      priority: newTask.priority,
      requirePhoto: newTask.requirePhoto,
      proofPhotoUrl: newTask.proofPhotoUrl,
    };

    try {
      setActionInProgress(true);
      await apiPost("/api/tasks", payload);
      await fetchData();
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
      ? `${currentUserRealName} (${roleLabel(role)})`
      : roleLabel(role);

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
        breadcrumb={[{ label: "HRM", href: "#" }, { label: "Nhiệm vụ" }]}
        actions={
          <div className="flex items-center gap-2">
            {canWriteTasks && (
              <Button variant="primary" onClick={() => setCreateModalOpen(true)} disabled={actionInProgress}>
                Giao việc mới
              </Button>
            )}
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
        branchFilter={branchFilter}
        onBranchFilterChange={setBranchFilter}
        isManager={!isAdmin}
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
      {createModalOpen && (
        <CreateTaskModal
          key="create-task-modal"
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          employees={
            isAdmin
              ? (branchFilter !== "all"
                  ? empList.filter((e) => (e.branchId || "") === branchFilter)
                  : empList)
              : empList.filter((e) => (e.branchId || "") === branchId)
          }
          currentBranch={isAdmin && branchFilter !== "all" ? branchFilter : (branchId || "")}
          currentUserName={currentUserName}
          onCreated={handleCreateTask}
        />
      )}

      {/* Modal Chi tiết nhiệm vụ (Xác nhận hoàn thành & Xóa tại đây) */}
      {detailTask && (
        <TaskDetailModal
          key={detailTask.id}
          open={!!detailTask}
          onClose={() => setDetailTask(null)}
          task={detailTask}
          onComplete={handleCompleteTask}
          onDelete={canWriteTasks ? handleDeleteTask : undefined}
          branchLabel={(branchId) =>
            branches.find((b) => b.id === branchId)?.name || branchId
          }
        />
      )}
    </div>
  );
}
