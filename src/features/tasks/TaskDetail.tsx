"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera, faCheck, faCircleExclamation, faClock, faFire, faLocationDot, faMagnifyingGlassPlus, faMobileScreen, faRotateRight, faThumbtack, faTrashCan, faUser } from "@fortawesome/free-solid-svg-icons";
import type { TaskItem } from "./types";

interface TaskDetailModalProps {
  open: boolean;
  onClose: () => void;
  task: TaskItem | null;
  onComplete: (taskId: string, photoUrl?: string) => void;
  onDelete: (taskId: string) => void;
}

export default function TaskDetailModal({
  open,
  onClose,
  task,
  onComplete,
  onDelete,
}: TaskDetailModalProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    if (task) {
      setPhotoUrl(task.proofPhotoUrl || null);
    }
  }, [task]);

  if (!task) return null;

  const isCompleted = task.status === "completed";
  const isOverdue = task.status === "overdue";

  const handleConfirmComplete = () => {
    if (task.requirePhoto && !photoUrl) {
      if (
        !confirm(
          "Nhân sự chưa nộp ảnh minh chứng từ ứng dụng di động.\nBạn có chắc chắn muốn duyệt hoàn thành đặc cách cho nhiệm vụ này?"
        )
      ) {
        return;
      }
    }
    onComplete(task.id, photoUrl || undefined);
    onClose();
  };

  const handleDelete = () => {
    if (confirm(`Bạn có chắc chắn muốn xóa nhiệm vụ "${task.title}"?`)) {
      onDelete(task.id);
      onClose();
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Chi tiết công việc & nhiệm vụ"
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <FontAwesomeIcon icon={faTrashCan} fontSize={16} className="mr-1 inline" />
              Xóa nhiệm vụ
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="white" onClick={onClose}>
                Đóng
              </Button>
              {!isCompleted && (
                <Button variant="primary" onClick={handleConfirmComplete}>
                  <FontAwesomeIcon icon={faCheck} fontSize={16} className="mr-1 inline" />
                  {task.requirePhoto
                    ? photoUrl
                      ? "Xác nhận duyệt ảnh & Hoàn thành"
                      : "Duyệt hoàn thành đặc cách"
                    : "Xác nhận hoàn thành"}
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Hàng 1: Tiêu đề & Badges */}
          <div>
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <h3 className="text-lg font-bold text-gray-900 leading-snug">
                {task.title}
              </h3>
              <div className="flex items-center gap-1.5 shrink-0">
                {task.priority === "urgent" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                    <FontAwesomeIcon icon={faFire} fontSize={13} /> Khẩn cấp
                  </span>
                )}
                {task.priority === "high" && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                    Quan trọng
                  </span>
                )}
                {task.priority === "normal" && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    Bình thường
                  </span>
                )}

                {isCompleted ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <FontAwesomeIcon icon={faCheck} fontSize={13} /> Đã xong
                  </span>
                ) : isOverdue ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                    <FontAwesomeIcon icon={faCircleExclamation} fontSize={13} /> Quá giờ
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Cần thực hiện
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Hàng 2: Thông tin phân loại & Phụ trách */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs">
            <div>
              <span className="text-gray-500 block mb-1 font-medium">Nguồn gốc công việc:</span>
              {task.sourceType === "manager" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                  <FontAwesomeIcon icon={faThumbtack} fontSize={13} className="text-rose-600" />
                  Quản lý giao riêng
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                  <FontAwesomeIcon icon={faRotateRight} fontSize={13} className="text-blue-600" />
                  Cố định theo ca {task.shiftName ? `• ${task.shiftName}` : ""}
                </span>
              )}
              <div className="text-gray-500 mt-1.5">
                Người khởi tạo: <strong className="text-gray-700">{task.assignedByName}</strong>
              </div>
            </div>

            <div>
              <span className="text-gray-500 block mb-1 font-medium">Đối tượng thực hiện:</span>
              <div className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
                <span>{task.assignedToName}</span>
                <span className="text-gray-400 font-normal text-xs">({task.branch})</span>
              </div>
              <div className="text-gray-500 mt-1.5 flex items-center gap-1">
                <FontAwesomeIcon icon={faClock} fontSize={14} className={isOverdue ? "text-red-600" : "text-gray-400"} />
                <span>Hạn chót: </span>
                <strong className={isOverdue ? "text-red-600 font-bold" : "text-gray-700"}>
                  {task.dueDate} {isOverdue && "(Đã quá hạn)"}
                </strong>
              </div>
            </div>
          </div>

          {/* Hàng 3: Mô tả chi tiết */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Mô tả & Hướng dẫn thực hiện
            </h4>
            <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-line leading-relaxed">
              {task.description || "Không có hướng dẫn thêm."}
            </div>
          </div>

          {/* Hàng 4: Khu vực Ảnh minh chứng nhân viên đã chụp */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <FontAwesomeIcon icon={faCamera} fontSize={15} className={task.requirePhoto ? "text-red-600" : "text-gray-400"} />
                <span>Ảnh minh chứng kết quả công việc</span>
                {task.requirePhoto && (
                  <span className="text-[11px] font-bold text-red-600 normal-case bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                    Bắt buộc chụp ảnh
                  </span>
                )}
              </h4>

              {photoUrl && (
                <button
                  type="button"
                  onClick={() => setZoomOpen(true)}
                  className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline cursor-pointer"
                >
                  <FontAwesomeIcon icon={faMagnifyingGlassPlus} fontSize={14} /> Phóng to ảnh
                </button>
              )}
            </div>

            {task.requirePhoto ? (
              photoUrl ? (
                /* Trường hợp 1: Nhân viên đã chụp và gửi ảnh minh chứng qua Mobile */
                <div className="rounded-xl overflow-hidden border border-emerald-200 bg-white shadow-xs">
                  {/* Ảnh chụp thực tế của nhân viên */}
                  <div
                    className="relative cursor-pointer group bg-black/5 flex items-center justify-center overflow-hidden max-h-72"
                    onClick={() => setZoomOpen(true)}
                    title="Bấm để phóng to ảnh"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoUrl}
                      alt="Ảnh minh chứng do nhân viên chụp"
                      className="w-full max-h-72 object-cover transition-transform duration-300 group-hover:scale-102"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-black/75 text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                        <FontAwesomeIcon icon={faMagnifyingGlassPlus} fontSize={15} /> Bấm để xem ảnh gốc
                      </span>
                    </div>
                  </div>

                  {/* Chi tiết người chụp & thời gian - dàn đều, chống xuống dòng */}
                  <div className="p-3 bg-gray-50/80 border-t border-gray-100 text-xs text-gray-600 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <FontAwesomeIcon icon={faUser} fontSize={14} className="text-gray-400 shrink-0" />
                      <span className="truncate">
                        Người chụp:{" "}
                        <strong className="text-gray-800 whitespace-nowrap">
                          {task.photoSubmittedBy || task.assignedToName}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <FontAwesomeIcon icon={faClock} fontSize={14} className="text-gray-400 shrink-0" />
                      <span>
                        Thời gian chụp:{" "}
                        <strong className="text-gray-800 whitespace-nowrap">
                          {task.photoSubmittedAt || task.completedAt || task.dueDate}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <FontAwesomeIcon icon={faLocationDot} fontSize={14} className="text-gray-400 shrink-0" />
                      <span>
                        Chi nhánh:{" "}
                        <strong className="text-gray-800">{task.branch}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Trường hợp 2: Nhân viên CHƯA chụp/gửi ảnh minh chứng */
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 text-center">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2.5">
                    <FontAwesomeIcon icon={faClock} fontSize={24} />
                  </div>
                  <h5 className="text-sm font-bold text-gray-800 mb-1">
                    Chưa có ảnh minh chứng từ nhân viên
                  </h5>
                  <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed mb-3">
                    Nhiệm vụ này bắt buộc chụp ảnh kết quả thực tế tại chi nhánh. Hiện tại nhân sự phụ trách (
                    <strong className="text-gray-800">{task.assignedToName}</strong>) chưa nộp ảnh minh chứng qua ứng dụng di động HRM.
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                    <FontAwesomeIcon icon={faMobileScreen} fontSize={14} />
                    Hệ thống đang chờ nhân viên chụp & gửi ảnh từ điện thoại
                  </span>
                </div>
              )
            ) : (
              /* Trường hợp 3: Công việc không yêu cầu chụp ảnh */
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-500">
                Nhiệm vụ này không bắt buộc chụp ảnh minh chứng. Quản trị viên có thể xác nhận hoàn thành khi công việc đạt yêu cầu.
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal phóng to ảnh minh chứng (Lightbox) */}
      <Modal
        open={zoomOpen}
        onClose={() => setZoomOpen(false)}
        title="Xem ảnh minh chứng thực tế"
        size="lg"
        footer={
          <Button variant="white" onClick={() => setZoomOpen(false)}>
            Đóng
          </Button>
        }
      >
        {photoUrl && (
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden border border-gray-200 bg-black/90 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt="Ảnh minh chứng kích thước lớn"
                className="w-full max-h-[70vh] object-contain"
              />
            </div>
            <div className="text-xs text-gray-500 flex items-center justify-between px-1">
              <span>
                Ảnh chụp bởi: <strong className="text-gray-700">{task.photoSubmittedBy || task.assignedToName}</strong>
              </span>
              <span>
                Thời gian: <strong className="text-gray-700">{task.photoSubmittedAt || task.completedAt || task.dueDate}</strong>
              </span>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
