"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar, faClock, faPhone, faTrashCan, faUserCheck } from "@fortawesome/free-solid-svg-icons";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import type { StaffInShift, GeneralShiftItem } from "./ScheduleOverview";

interface Props {
  open: boolean;
  onClose: () => void;
  staff: StaffInShift | null;
  shift: GeneralShiftItem | null;
  day: { name: string; fullDate: string; isToday: boolean } | null;
  onCancelShift: (staffId: string, shiftId: string) => void;
  onCheckIn: (staffId: string, shiftId: string) => void;
  onCheckOut?: (staffId: string, shiftId: string) => void;
  onSupplement: (staffId: string, shiftId: string) => void;
  isAdmin?: boolean;
  isOwnShift?: boolean;
}

export default function StaffShiftDetailModal({ open, onClose, staff, shift, day, onCancelShift, onCheckIn, onCheckOut, onSupplement, isAdmin = true, isOwnShift = false }: Props) {
  if (!staff || !shift || !day) return null;

  const isCheckedIn = staff.checkInStatus === "checked_in";
  const isInProgress = staff.checkInStatus === "in_progress";
  const isNotYet = staff.checkInStatus === "not_yet";
  const isForgot = isNotYet && !day.isToday; // quá ngày hôm nay hoặc đã qua

  const isLate = (() => {
    if (!isCheckedIn || !staff.checkInTime || !shift.timeRange) return false;
    const startStr = shift.timeRange.split("-")[0]?.trim();
    if (!startStr) return false;
    const [sh, sm] = startStr.split(":").map(Number);
    const [ch, cm] = staff.checkInTime.split(":").map(Number);
    if ([sh, sm, ch, cm].some((n) => Number.isNaN(n))) return false;
    return ch * 60 + cm - (sh * 60 + sm) > 5;
  })();

  // Tự động tính toán giờ check-out thực tế nếu ca đã hoàn thành
  const effectiveCheckOutTime = (() => {
    if (staff.checkOutTime && staff.checkOutTime !== "—") return staff.checkOutTime;
    if ((shift.status === "completed" || !day.isToday) && (isCheckedIn || staff.checkInTime)) {
      const endStr = shift.timeRange.split("-")[1]?.trim();
      return endStr ? `${endStr.split(":")[0]}:02` : "14:02";
    }
    return "—";
  })();

  const statusLabel = isCheckedIn ? (isLate ? "Trễ" : "Đúng giờ") : isInProgress ? "Đang trong ca" : isForgot ? "Quên chấm công" : "Chưa chấm công";
  const statusTone = isCheckedIn ? (isLate ? "warning" as const : "success" as const) : isInProgress ? "primary" as const : isForgot ? "danger" as const : "gray" as const;

  // Xác định quyền hiển thị nút - Admin/Manager vs Nhân viên
  const isAdminView = isAdmin;
  const isOwn = isOwnShift;
  // Admin: Đúng giờ chỉ Hủy, còn lại Hủy+Chấm công (kể cả xem ca người khác)
  // Nhân viên: chỉ được Bổ sung khi Trễ/Quên trên ca của chính mình, không được tự Hủy, không được thao tác ca người khác
  const showAdminActions = isAdminView;
  const showEmployeeSupplement = !isAdminView && isOwn && (isLate || isForgot);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Chi tiết ca làm việc"
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <Button variant="white" onClick={onClose} className="px-5 py-2">Đóng</Button>
          {showAdminActions ? (
            isCheckedIn && !isLate ? (
              <Button variant="danger" onClick={() => { onCancelShift(staff.id, shift.id); onClose(); }} className="px-4 py-2 whitespace-nowrap"><FontAwesomeIcon icon={faTrashCan} fontSize={16} /> Hủy ca</Button>
            ) : (
              <>
                <Button variant="danger" onClick={() => { onCancelShift(staff.id, shift.id); onClose(); }} className="px-4 py-2 whitespace-nowrap"><FontAwesomeIcon icon={faTrashCan} fontSize={16} /> Hủy ca</Button>
                <Button onClick={() => { onCheckIn(staff.id, shift.id); onClose(); }} className="px-5 py-2 whitespace-nowrap"><FontAwesomeIcon icon={faUserCheck} fontSize={16} /> Chấm công</Button>
              </>
            )
          ) : showEmployeeSupplement ? (
            <Button variant="white" onClick={() => { onSupplement(staff.id, shift.id); onClose(); }} className="px-4 py-2 whitespace-nowrap"><FontAwesomeIcon icon={faClock} fontSize={16} /> Bổ sung chấm công</Button>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Thông tin nhân viên */}
        <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm border ${isCheckedIn ? (isLate ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200") : isInProgress ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
            {staff.avatarLetter}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-900">{staff.name}</div>
            <div className="text-xs text-gray-500">{staff.role} • Chi nhánh {staff.branch}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge tone={statusTone}>{statusLabel}</Badge>
            </div>
          </div>
          <a href={`tel:${staff.phone.replace(/\s/g, "")}`} className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-primary-50 hover:text-primary shrink-0" title={staff.phone}>
            <FontAwesomeIcon icon={faPhone} fontSize={16} />
          </a>
        </div>

        {/* Thông tin ca */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <FontAwesomeIcon icon={faCalendar} fontSize={18} className="text-primary" />
            <span className="text-[15px] font-bold text-gray-900">{shift.shiftName}</span>
            <span className="text-xs font-mono bg-primary-50 text-primary px-2.5 py-1 rounded border border-primary-200">{shift.timeRange}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-gray-400">Ngày làm việc</div>
              <div className="font-semibold text-gray-800">{day.name}, {day.fullDate} {day.isToday && <span className="ml-1 px-1.5 py-0.5 rounded bg-primary-50 text-primary border border-primary-200 text-[10px]">Hôm nay</span>}</div>
            </div>
            <div>
              <div className="text-gray-400">Trạng thái ca</div>
              <div className="font-semibold text-gray-800">{shift.status === "completed" ? "Đã hoàn thành" : shift.status === "active" ? "Đang diễn ra" : "Sắp diễn ra"}</div>
            </div>
            <div>
              <div className="text-gray-400">Giờ check-in</div>
              <div className="font-mono font-semibold text-gray-800">{staff.checkInTime ?? "—"}</div>
            </div>
            <div>
              <div className="text-gray-400">Giờ check-out</div>
              <div className="font-mono font-semibold text-gray-800">{effectiveCheckOutTime}</div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
