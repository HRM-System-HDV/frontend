"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightArrowLeft, faCoins } from "@fortawesome/free-solid-svg-icons";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select, Toggle } from "@/components/ui/Form";

export interface AttendanceConfigState {
  gracePeriod: string;
  shiftSwapMode: string;
  requireReasonSwap: boolean;
  allowDoubleCheckin: boolean;
  latePenaltyPct: string;
  earlyLeavePenaltyPct: string;
  earlyCheckinMinutes: string;
  maxPenaltiesPerMonth: string;
  deductOnCheckout: boolean;
  maxCheckinsPerDay: string;
  maxSwapsPerMonth: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  config: AttendanceConfigState;
  setConfig: React.Dispatch<React.SetStateAction<AttendanceConfigState>>;
}

export default function AttendanceConfigModal({ open, onClose, config, setConfig }: Props) {
  const setFlag = (key: keyof AttendanceConfigState) => (v: boolean) =>
    setConfig((prev) => ({ ...prev, [key]: v }));

  return (
    <Modal open={open} onClose={onClose} title="Cấu hình chấm công" size="lg" footer={<><Button variant="white" onClick={onClose}>Hủy</Button><Button onClick={onClose}>Lưu cấu hình</Button></>}>
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-7 h-7 rounded-lg bg-danger-50 text-danger-700 flex items-center justify-center shrink-0"><FontAwesomeIcon icon={faCoins} fontSize={15} /></span>
            <h6 className="font-semibold text-gray-800">Quy tắc phạt trễ / về sớm</h6>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Mức phạt đi trễ (% lương ca)" required hint="Tự trừ theo % tổng lương của ca làm việc">
              <div className="relative"><Input type="number" min={0} max={100} value={config.latePenaltyPct} onChange={(e) => setConfig((p) => ({ ...p, latePenaltyPct: e.target.value }))} className="pr-9" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span></div>
            </Field>
            <Field label="Mức phạt về sớm (% lương ca)" required hint="Tự trừ theo % tổng lương của ca làm việc">
              <div className="relative"><Input type="number" min={0} max={100} value={config.earlyLeavePenaltyPct} onChange={(e) => setConfig((p) => ({ ...p, earlyLeavePenaltyPct: e.target.value }))} className="pr-9" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span></div>
            </Field>
            <Field label="Cho phép chấm công trễ (phút)" required hint="Số phút tối đa chấp nhận check-in trễ trước khi tính phạt">
              <Input type="number" min={0} value={config.gracePeriod} onChange={(e) => setConfig((p) => ({ ...p, gracePeriod: e.target.value }))} />
            </Field>
            <Field label="Cho phép chấm công trước giờ làm (phút)" required hint="Nhân viên có thể chấm công sớm trước giờ bắt đầu ca tối đa bao nhiêu phút">
              <Input type="number" min={0} value={config.earlyCheckinMinutes} onChange={(e) => setConfig((p) => ({ ...p, earlyCheckinMinutes: e.target.value }))} />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Giới hạn phạt tối đa / tháng" required>
              <Select value={config.maxPenaltiesPerMonth} onChange={(e) => setConfig((p) => ({ ...p, maxPenaltiesPerMonth: e.target.value }))}><option>5 lần</option><option>10 lần</option><option>20 lần</option><option>Không giới hạn</option></Select>
            </Field>
            <Field label="Thời điểm khấu trừ">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-gray-800 block">Khấu trừ ngay khi kết thúc ca (Check-out)</span>
                  <span className="text-[11px] text-gray-400 block mt-0.5">Tính theo giờ làm thực tế × lương cơ bản và trừ thẳng vào ca</span>
                </div>
                <input type="checkbox" checked={config.deductOnCheckout} onChange={(e) => setConfig((p) => ({ ...p, deductOnCheckout: e.target.checked }))} className="w-4 h-4 accent-primary shrink-0 ml-2" />
              </div>
            </Field>
          </div>
          <div className="rounded-lg border border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Cho phép chấm công kép</span><Toggle checked={config.allowDoubleCheckin} onChange={setFlag("allowDoubleCheckin")} />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Nhân viên làm nhiều ca / gác trong ngày có thể chấm công vào – ra nhiều lần.</p>
            {config.allowDoubleCheckin && (
              <Field label="Số lần chấm công tối đa / ngày" required className="mt-3">
                <Select value={config.maxCheckinsPerDay} onChange={(e) => setConfig((p) => ({ ...p, maxCheckinsPerDay: e.target.value }))}><option>2 lần</option><option>3 lần</option><option>4 lần</option><option>Không giới hạn</option></Select>
              </Field>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-7 h-7 rounded-lg bg-success-50 text-success-700 flex items-center justify-center shrink-0"><FontAwesomeIcon icon={faArrowRightArrowLeft} fontSize={15} /></span>
            <h6 className="font-semibold text-gray-800">Đổi ca & phê duyệt</h6>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Chế độ duyệt đổi ca" required>
              <Select value={config.shiftSwapMode} onChange={(e) => setConfig((p) => ({ ...p, shiftSwapMode: e.target.value }))}>
                <option>Nhân viên tự xác nhận</option>
                <option>Quản lý chi nhánh duyệt trực tiếp</option>
              </Select>
            </Field>
            <Field label="Số lần đổi ca tối đa / tháng" required>
              <Select value={config.maxSwapsPerMonth} onChange={(e) => setConfig((p) => ({ ...p, maxSwapsPerMonth: e.target.value }))}><option>1 lần</option><option>3 lần</option><option>5 lần</option><option>Không giới hạn</option></Select>
            </Field>
          </div>
          <p className="text-[11px] text-gray-500 mt-2 mb-3">
            * Đổi ca / Nhờ làm thay: Hai nhân viên tự gửi và xác nhận đồng ý với nhau trên app; trường hợp đột xuất thì Quản lý chi nhánh sẽ duyệt đồng ý hộ.
          </p>
          <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
            <span className="text-sm text-gray-700">Bắt buộc nhập lý do khi đổi ca</span><Toggle checked={config.requireReasonSwap} onChange={setFlag("requireReasonSwap")} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
