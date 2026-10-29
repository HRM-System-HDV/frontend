"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera, faCheck, faImage } from "@fortawesome/free-solid-svg-icons";
import type { TaskItem } from "./types";

interface PhotoProofModalProps {
  open: boolean;
  onClose: () => void;
  task: TaskItem | null;
  onConfirmComplete?: (taskId: string, photoUrl: string) => void;
}

export default function PhotoProofModal({
  open,
  onClose,
  task,
  onConfirmComplete,
}: PhotoProofModalProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string>(
    task?.proofPhotoUrl || "https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=600"
  );

  if (!task) return null;

  const isAlreadyDone = task.status === "completed";

  const handleConfirm = () => {
    if (onConfirmComplete && selectedPhoto) {
      onConfirmComplete(task.id, selectedPhoto);
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isAlreadyDone ? "Ảnh minh chứng kết quả công việc" : "Chụp / Tải ảnh minh chứng kết quả"}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="white" onClick={onClose}>
            {isAlreadyDone ? "Đóng" : "Hủy bỏ"}
          </Button>
          {!isAlreadyDone && (
            <Button variant="primary" onClick={handleConfirm}>
              <FontAwesomeIcon icon={faCheck} fontSize={16} className="mr-1 inline" />
              Xác nhận & Hoàn thành
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <h4 className="font-semibold text-gray-900 text-sm mb-1">{task.title}</h4>
          <p className="text-xs text-gray-500">{task.description}</p>
          <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
            <span>Người thực hiện: <strong className="text-gray-700">{task.assignedToName}</strong></span>
            {task.completedAt && <span className="text-emerald-600 font-semibold">Hoàn thành lúc: {task.completedAt}</span>}
          </div>
        </div>

        {isAlreadyDone ? (
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <FontAwesomeIcon icon={faImage} fontSize={16} className="text-primary" />
              <span>Ảnh kết quả được nhân sự ghi nhận:</span>
            </div>
            <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={task.proofPhotoUrl || selectedPhoto}
                alt="Minh chứng kết quả"
                className="w-full h-64 object-cover"
              />
            </div>
          </div>
        ) : (
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <FontAwesomeIcon icon={faCamera} fontSize={16} className="text-red-600" />
              <span className="text-red-700 font-bold">Quản trị viên bắt buộc chụp ảnh minh chứng:</span>
            </div>

            <div className="border-2 border-dashed border-red-300 rounded-xl p-4 text-center bg-red-50/50">
              {selectedPhoto ? (
                <div className="space-y-3">
                  <div className="relative rounded-lg overflow-hidden border border-red-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedPhoto}
                      alt="Xem trước ảnh chụp"
                      className="w-full h-52 object-cover"
                    />
                    <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-xs">
                      ✓ Đã có ảnh minh chứng
                    </span>
                  </div>
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="white"
                      size="sm"
                      onClick={() => setSelectedPhoto("https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=600")}
                    >
                      Ảnh mẫu 1 (Quầy bar)
                    </Button>
                    <Button
                      variant="white"
                      size="sm"
                      onClick={() => setSelectedPhoto("https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600")}
                    >
                      Ảnh mẫu 2 (Kho hàng)
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-8">
                  <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-2">
                    <FontAwesomeIcon icon={faCamera} fontSize={24} />
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    Chụp hoặc đính kèm ảnh kết quả
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Công việc này bắt buộc phải có ảnh minh chứng thực tế trước khi hoàn thành
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-3"
                    onClick={() => setSelectedPhoto("https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=600")}
                  >
                    Chụp ảnh ngay
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
