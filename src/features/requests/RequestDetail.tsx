"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightArrowLeft, faCalendar, faCheck, faClock, faCoins, faFileLines, faPen, faStore, faUmbrellaBeach, faUser, faXmark } from "@fortawesome/free-solid-svg-icons";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Badge, { StatusBadge } from "@/components/ui/Badge";
import type { ShiftRequest } from "@/types";

interface RequestDetailModalProps {
  open: boolean;
  onClose: () => void;
  request: ShiftRequest | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export default function RequestDetailModal({
  open,
  onClose,
  request,
  onApprove,
  onReject,
}: RequestDetailModalProps) {
  if (!request) return null;

  const isPending = request.status === "chờ duyệt";
  const isApproved = request.status === "đã duyệt";
  const isRejected = request.status === "từ chối";

  const handleConfirmApprove = () => {
    onApprove(request.id);
    onClose();
  };

  const handleConfirmReject = () => {
    onReject(request.id);
    onClose();
  };

  const getTypeInfo = (type?: string) => {
    switch (type) {
      case "nghỉ phép":
        return {
          title: "Đơn xin nghỉ phép",
          badge: (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <FontAwesomeIcon icon={faUmbrellaBeach} fontSize={15} /> Nghỉ phép
            </span>
          ),
          desc: "Nhân viên đề xuất xin nghỉ phép trong khoảng thời gian xác định",
        };
      case "bổ sung công":
        return {
          title: "Yêu cầu bổ sung giờ công",
          badge: (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
              <FontAwesomeIcon icon={faPen} fontSize={15} /> Bổ sung công
            </span>
          ),
          desc: "Nhân viên đề xuất ghi nhận bù giờ làm việc do sự cố mạng hoặc quên check-in",
        };
      case "tạm ứng":
        return {
          title: "Yêu cầu tạm ứng lương",
          badge: (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
              <FontAwesomeIcon icon={faCoins} fontSize={15} /> Tạm ứng lương
            </span>
          ),
          desc: "Nhân viên đề xuất xin tạm ứng trước một phần lương phục vụ chi phí phát sinh",
        };
      case "đổi ca":
      default:
        return {
          title: "Yêu cầu đổi ca / Nhờ làm thay",
          badge: (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <FontAwesomeIcon icon={faArrowRightArrowLeft} fontSize={15} /> Đổi ca / Nhờ làm thay
            </span>
          ),
          desc: "Hai nhân viên tự gửi và xác nhận đồng ý với nhau trên app; Quản lý chi nhánh có quyền duyệt đồng ý hộ",
        };
    }
  };

  const typeInfo = getTypeInfo(request.type);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Chi tiết yêu cầu & Phê duyệt ca"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="white" onClick={onClose}>
            Đóng
          </Button>

          {isPending ? (
            <div className="flex items-center gap-2">
              <Button
                variant="danger"
                onClick={handleConfirmReject}
                className="shadow-xs"
              >
                <FontAwesomeIcon icon={faXmark} fontSize={16} className="mr-1 inline" />
                Từ chối
              </Button>
              <Button
                variant="success"
                onClick={handleConfirmApprove}
                className="shadow-xs"
              >
                <FontAwesomeIcon icon={faCheck} fontSize={16} className="mr-1 inline" />
                {request.type === "đổi ca" ? "Duyệt đồng ý hộ" : "Phê duyệt"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <StatusBadge status={request.status} />
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Banner tiêu đề loại yêu cầu & trạng thái */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-2">
              {typeInfo.badge}
              <span className="font-bold text-gray-900 text-base">
                {typeInfo.title}
              </span>
            </div>
            <StatusBadge status={request.status} />
          </div>
          <p className="text-xs text-gray-500">{typeInfo.desc}</p>
        </div>

        {/* Thông tin người gửi & Chi nhánh */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="bg-white border border-gray-200 rounded-xl p-3.5">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
              Nhân viên gửi yêu cầu
            </span>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                <FontAwesomeIcon icon={faUser} fontSize={20} />
              </div>
              <div>
                <div className="font-bold text-gray-900 text-sm">
                  {request.employee}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <FontAwesomeIcon icon={faStore} fontSize={13} className="text-gray-400" />
                  <span>Chi nhánh: </span>
                  <Badge tone="gray">{request.branch}</Badge>
                </div>
              </div>
            </div>
            {request.createdAt && (
              <div className="text-[11px] text-gray-400 mt-2.5 pt-2 border-t border-gray-100 flex items-center gap-1">
                <FontAwesomeIcon icon={faClock} fontSize={12} />
                <span>Thời điểm gửi: {request.createdAt}</span>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-3.5">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
              Thời gian áp dụng
            </span>
            <div className="flex items-start gap-2.5">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm shrink-0 border border-amber-100">
                <FontAwesomeIcon icon={faCalendar} fontSize={20} />
              </div>
              <div>
                <div className="text-xs text-gray-500">Khoảng thời gian:</div>
                <div className="font-bold text-gray-800 text-sm mt-0.5">
                  {request.from} → {request.to}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  Mã tham chiếu: #{request.id}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Nội dung chi tiết & Lý do giải trình */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5 mb-2">
            <FontAwesomeIcon icon={faFileLines} fontSize={15} className="text-primary" />
            <span>Nội dung & Lý do đề xuất của nhân viên</span>
          </h4>
          <div className="bg-gray-50 rounded-lg p-3.5 text-sm text-gray-800 leading-relaxed border border-gray-100">
            {request.reason || "Không có nội dung giải trình thêm."}
          </div>
        </div>
      </div>
    </Modal>
  );
}
