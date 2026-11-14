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
  // Các trường bắt buộc của BE (AttendanceConfig) mà FE trước đây chưa gửi/lưu.
  checkoutWindowMinutes: string;
  doubleCheckinEarlyMinutes: string;
  doubleCheckinLateMinutes: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave?: () => void | Promise<void>;
  saving?: boolean;
  config: AttendanceConfigState;
  setConfig: React.Dispatch<React.SetStateAction<AttendanceConfigState>>;
  /** Chọn cấu hình theo chi nhánh: "" = mặc định toàn hệ thống (chỉ admin chọn được). */
  configBranchId?: string;
  onConfigBranchChange?: (branchId: string) => void;
  branchOptions?: { id: string; name: string }[];
  /** Manager bị ghim cấu hình chi nhánh của mình. */
  configBranchLocked?: boolean;
}

export default function AttendanceConfigModal({
  open,
  onClose,
  onSave,
  saving,
  config,
  setConfig,
  configBranchId,
  onConfigBranchChange,
  branchOptions,
  configBranchLocked,
}: Props) {
  const setFlag = (key: keyof AttendanceConfigState) => (v: boolean) =>
    setConfig((prev) => ({ ...prev, [key]: v }));

  const handleSave = () => {
    if (onSave) {
      onSave();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cấu hình chấm công"
      size="lg"
      footer={
        <>
          <Button variant="white" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu cấu hình"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {onConfigBranchChange && (
          <Field label="Cấu hình áp dụng cho">
            <Select
              value={configBranchId ?? ""}
              onChange={(e) => onConfigBranchChange(e.target.value)}
              disabled={saving || configBranchLocked}
            >
              {!configBranchLocked && <option value="">Mặc định toàn hệ thống</option>}
              {(branchOptions ?? []).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          </Field>
        )}
        <div className="rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-7 h-7 rounded-lg bg-danger-50 text-danger-700 flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faCoins} fontSize={15} />
            </span>
            <h6 className="font-semibold text-gray-800">Quy tắc phạt trễ / về sớm</h6>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Mức phạt đi trễ" required>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={config.latePenaltyPct}
                  onChange={(e) => setConfig((p) => ({ ...p, latePenaltyPct: e.target.value }))}
                  className="pr-9"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </Field>
            <Field label="Mức phạt về sớm" required>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={config.earlyLeavePenaltyPct}
                  onChange={(e) => setConfig((p) => ({ ...p, earlyLeavePenaltyPct: e.target.value }))}
                  className="pr-9"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </Field>
            <Field label="Cho phép chấm công trễ" required>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  placeholder="Số phút (VD: 10 phút)"
                  value={config.gracePeriod}
                  onChange={(e) => setConfig((p) => ({ ...p, gracePeriod: e.target.value }))}
                  className="pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">phút</span>
              </div>
            </Field>
            <Field label="Cho phép chấm công trước giờ làm" required>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  placeholder="Số phút (VD: 15 phút)"
                  value={config.earlyCheckinMinutes}
                  onChange={(e) => setConfig((p) => ({ ...p, earlyCheckinMinutes: e.target.value }))}
                  className="pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">phút</span>
              </div>
            </Field>
            <Field label="Cửa sổ cho phép checkout (phút)">
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  value={config.checkoutWindowMinutes}
                  onChange={(e) => setConfig((p) => ({ ...p, checkoutWindowMinutes: e.target.value }))}
                  className="pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">phút</span>
              </div>
            </Field>
            <Field label="Chấm công kép: sớm nhất (phút trước mốc nối ca)">
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  value={config.doubleCheckinEarlyMinutes}
                  onChange={(e) => setConfig((p) => ({ ...p, doubleCheckinEarlyMinutes: e.target.value }))}
                  className="pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">phút</span>
              </div>
            </Field>
            <Field label="Chấm công kép: muộn nhất (phút sau mốc nối ca)">
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  value={config.doubleCheckinLateMinutes}
                  onChange={(e) => setConfig((p) => ({ ...p, doubleCheckinLateMinutes: e.target.value }))}
                  className="pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">phút</span>
              </div>
            </Field>
          </div>

          <div className="rounded-lg border border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Cho phép chấm công kép</span>
              <Toggle checked={config.allowDoubleCheckin} onChange={setFlag("allowDoubleCheckin")} />
            </div>

          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-7 h-7 rounded-lg bg-success-50 text-success-700 flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faArrowRightArrowLeft} fontSize={15} />
            </span>
            <h6 className="font-semibold text-gray-800">Đổi ca & phê duyệt</h6>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Chế độ duyệt đổi ca" required>
              <Select
                value={config.shiftSwapMode}
                onChange={(e) => setConfig((p) => ({ ...p, shiftSwapMode: e.target.value }))}
              >
                <option value="mutual_acceptance">Nhân viên tự xác nhận</option>
                <option value="manager_approval">Quản lý chi nhánh duyệt trực tiếp</option>
              </Select>
            </Field>

          </div>
          <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
            <span className="text-sm text-gray-700">Bắt buộc nhập lý do khi đổi ca</span>
            <Toggle checked={config.requireReasonSwap} onChange={setFlag("requireReasonSwap")} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
