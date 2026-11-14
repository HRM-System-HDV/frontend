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
  /** Không truyền = vai trò này không duyệt đơn (nhân viên chỉ xem đơn của mình). */
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  /** Cho phép duyệt đơn đổi ca ở chế độ tự chấp nhận (chỉ admin). */
  canReviewPeerAcceptedSwap?: boolean;
  /** Đổi branchId chi nhánh thành tên hiển thị; thiếu thì hiện branchId gốc. */
  branchLabel?: (branchId: string) => string;
}

export default function RequestDetailModal({
  open,
  onClose,
  request,
  onApprove,
  onReject,
  canReviewPeerAcceptedSwap,
  branchLabel,
}: RequestDetailModalProps) {
  if (!request) return null;

  const isPending = request.status === "chờ duyệt";
  const isApproved = request.status === "đã duyệt";
  const isRejected = request.status === "từ chối";
  // BE từ chối manager duyệt/từ chối đơn đổi ca ở chế độ tự chấp nhận
  // (integration-service reviewRequest, peer=false → 403). Ẩn control để quản lý
  // không bấm rồi nhận lỗi, trừ admin vẫn được ghi hộ.
  const peerResponds =
    request.type === "đổi ca" && request.shiftSwapMode === "mutual_acceptance";
  const canReview = Boolean(onApprove || onReject) && (!peerResponds || canReviewPeerAcceptedSwap === true);

  const handleConfirmApprove = () => {
    if (!onApprove) return;
    onApprove(request.id);
    onClose();
  };

  const handleConfirmReject = () => {
    if (!onReject) return;
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

          {isPending && canReview ? (
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
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {typeInfo.badge}
              <span className="font-bold text-gray-900 text-base">
                {typeInfo.title}
              </span>
            </div>
            <StatusBadge status={request.status} />
          </div>
        </div>

        {/* Chế độ tự chấp nhận: quyền phản hồi thuộc nhân viên đích nên BE chặn
            manager duyệt — giải thích để không nhầm là hệ thống lỗi. */}
        {isPending && peerResponds && !canReview && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 text-sm text-blue-800">
            Đơn đổi ca này do nhân viên được nhờ tự phản hồi.
          </div>
        )}

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
                  <Badge tone="gray">{branchLabel ? branchLabel(request.branch) : request.branch}</Badge>
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
              {request.type === "tạm ứng" ? "Số tiền tạm ứng" : "Thời gian áp dụng"}
            </span>
            <div className="flex items-start gap-2.5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border ${
                request.type === "tạm ứng"
                  ? "bg-purple-50 text-purple-700 border-purple-100"
                  : "bg-amber-50 text-amber-700 border-amber-100"
              }`}>
                <FontAwesomeIcon icon={request.type === "tạm ứng" ? faCoins : faCalendar} fontSize={20} />
              </div>
              <div>
                <div className="text-xs text-gray-500">
                  {request.type === "tạm ứng" ? "Số tiền đề xuất:" : "Khoảng thời gian:"}
                </div>
                <div className={`font-bold text-sm mt-0.5 ${request.type === "tạm ứng" ? "text-purple-700 text-base" : "text-gray-800"}`}>
                  {request.type === "tạm ứng" ? (request.amount || request.title || "—") : `${request.from} → ${request.to}`}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  Mã tham chiếu: #{request.id}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Nội dung chi tiết & Lý do giải trình (BE bắt buộc content khác rỗng) */}
        {request.reason ? (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5 mb-2">
              <FontAwesomeIcon icon={faFileLines} fontSize={15} className="text-primary" />
              <span>Nội dung & Lý do đề xuất của nhân viên</span>
            </h4>
            <div className="bg-gray-50 rounded-lg p-3.5 text-sm text-gray-800 leading-relaxed border border-gray-100">
              {request.reason}
            </div>
          </div>
        ) : null}

        {/* Người duyệt & ghi chú (BE chỉ trả các field này khi đơn đã duyệt/từ chối) */}
        {(isApproved || isRejected) && request.reviewedByName ? (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5 mb-2">
              <FontAwesomeIcon icon={faCheck} fontSize={15} className={isApproved ? "text-success" : "text-danger"} />
              <span>{isApproved ? "Người phê duyệt" : "Người từ chối"}</span>
            </h4>
            <div className="flex items-center gap-2 text-sm text-gray-800">
              <span className="font-semibold">{request.reviewedByName}</span>
              {request.reviewedAt && (
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <FontAwesomeIcon icon={faClock} fontSize={12} /> {request.reviewedAt}
                </span>
              )}
            </div>
            {request.reviewNote && (
              <div className="mt-2 bg-gray-50 rounded-lg p-3 text-sm text-gray-700 border border-gray-100 leading-relaxed">
                Ghi chú: {request.reviewNote}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
