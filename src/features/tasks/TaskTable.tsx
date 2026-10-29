"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faCircleExclamation, faClock, faFire, faRotateRight, faThumbtack } from "@fortawesome/free-solid-svg-icons";
import type { TaskItem, TaskPriority, TaskStatus } from "./types";

interface TaskTableProps {
  tasks: TaskItem[];
  onOpenDetail: (task: TaskItem) => void;
}

export default function TaskTable({
  tasks,
  onOpenDetail,
}: TaskTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">
          <FontAwesomeIcon icon={faCheck} fontSize={24} />
        </div>
        <h3 className="text-base font-semibold text-gray-800 mb-1">
          Không tìm thấy công việc nào
        </h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          Hiện không có nhiệm vụ nào phù hợp với bộ lọc đã chọn. Bạn có thể thay đổi bộ lọc hoặc bấm nút &quot;Giao việc mới&quot; để tạo nhiệm vụ.
        </p>
      </div>
    );
  }

  const renderPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case "urgent":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">
            <FontAwesomeIcon icon={faFire} fontSize={12} className="text-red-600" />
            Khẩn cấp
          </span>
        );
      case "high":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700">
            Quan trọng
          </span>
        );
      case "normal":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
            Bình thường
          </span>
        );
    }
  };

  const renderStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <FontAwesomeIcon icon={faCheck} fontSize={13} />
            Đã xong
          </span>
        );
      case "inProgress":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <FontAwesomeIcon icon={faClock} fontSize={13} />
            Đang làm
          </span>
        );
      case "overdue":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 animate-pulse">
            <FontAwesomeIcon icon={faCircleExclamation} fontSize={13} />
            Quá hạn
          </span>
        );
      case "pending":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Cần thực hiện
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-xs uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4">Nguồn việc</th>
              <th className="py-3.5 px-4">Người thực hiện</th>
              <th className="py-3.5 px-4">Hạn hoàn thành</th>
              <th className="py-3.5 px-4">Mức độ</th>
              <th className="py-3.5 px-4">Trạng thái</th>
              <th className="py-3.5 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tasks.map((task) => {
              const isOverdue = task.status === "overdue";
              const isCompleted = task.status === "completed";

              return (
                <tr
                  key={task.id}
                  onClick={() => onOpenDetail(task)}
                  className={`hover:bg-gray-50/80 transition-colors cursor-pointer ${
                    isCompleted ? "bg-gray-50/40 opacity-75" : ""
                  }`}
                >
                  {/* Cột 1: Nguồn việc */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {task.sourceType === "manager" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                        <FontAwesomeIcon icon={faThumbtack} fontSize={13} className="text-rose-600" />
                        Quản lý giao riêng
                      </span>
                    ) : (
                      <div className="inline-flex flex-col">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                          <FontAwesomeIcon icon={faRotateRight} fontSize={13} className="text-blue-600" />
                          Cố định theo ca
                        </span>
                        {task.shiftName && (
                          <span className="text-[11px] text-gray-500 mt-0.5 ml-1">
                            {task.shiftName}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Cột 3: Người thực hiện */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {task.assignedToName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-xs">
                          {task.assignedToName}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {task.branch}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Cột 4: Hạn chót */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="text-xs font-medium text-gray-800">
                      {task.dueDate}
                    </div>
                  </td>

                  {/* Cột 5: Mức độ ưu tiên */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {renderPriorityBadge(task.priority)}
                  </td>

                  {/* Cột 6: Trạng thái */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {renderStatusBadge(task.status)}
                  </td>

                  {/* Cột 7: Thao tác — Chỉ có nút Chi tiết duy nhất, mở modal đầy đủ chức năng */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDetail(task);
                      }}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-primary hover:text-white transition-all cursor-pointer shadow-2xs"
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
