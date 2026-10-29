"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPrint } from "@fortawesome/free-solid-svg-icons";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Field, Input } from "@/components/ui/Form";
import { formatVND } from "@/lib/utils";
import type { Payslip } from "@/types";

interface EditProps {
  payslip: Payslip | null;
  bonusStr: string;
  penaltyStr: string;
  reasonStr: string;
  onBonusChange: (v: string) => void;
  onPenaltyChange: (v: string) => void;
  onReasonChange: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function EditPayslipModal({ payslip, bonusStr, penaltyStr, reasonStr, onBonusChange, onPenaltyChange, onReasonChange, onClose, onSave }: EditProps) {
  return (
    <Modal open={!!payslip} onClose={onClose} title={`Điều chỉnh Thưởng / Phạt — ${payslip?.employee ?? ""}`} size="lg" footer={<><Button variant="white" onClick={onClose}>Hủy</Button><Button onClick={onSave}>Lưu thay đổi</Button></>}>
      {payslip && (() => {
        const bonusVal = Number(bonusStr) || 0;
        const penaltyVal = Number(penaltyStr) || 0;
        const calculatedTotal = payslip.salary + bonusVal - penaltyVal;
        return (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-gray-50 p-3 text-sm flex justify-between items-center">
              <span className="text-gray-600">Lương cơ bản ({payslip.days} ngày công):</span><span className="font-bold text-gray-800">{formatVND(payslip.salary)}</span>
            </div>
            <Field label="Tiền Thưởng (VNĐ)"><Input type="number" value={bonusStr} onChange={(e) => onBonusChange(e.target.value)} placeholder="Nhập số tiền thưởng (VD: 500000)" /></Field>
            <Field label="Tiền Phạt (VNĐ)"><Input type="number" value={penaltyStr} onChange={(e) => onPenaltyChange(e.target.value)} placeholder="Nhập số tiền phạt (VD: 100000)" /></Field>
            <Field label="Lý do điều chỉnh (bắt buộc khi thưởng/phạt)" required={bonusVal > 0 || penaltyVal > 0} hint="Lý do này sẽ được in trực tiếp lên phiếu lương của nhân viên">
              <Input value={reasonStr} onChange={(e) => onReasonChange(e.target.value)} placeholder="VD: Thưởng vượt KPIs / Phạt trễ 2 lần..." />
            </Field>
            <div className="rounded-lg border border-primary-200 bg-primary-50/60 p-3 text-sm flex justify-between items-center">
              <span className="font-semibold text-gray-700">Tổng thực lĩnh sau điều chỉnh:</span><span className="font-extrabold text-primary text-base">{formatVND(calculatedTotal)}</span>
            </div>
          </div>
        );
      })()}
    </Modal>
  );
}

interface ConfirmProps {
  payslip: Payslip | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmClosePayslipDialog({ payslip, onConfirm, onCancel }: ConfirmProps) {
  return (
    <ConfirmDialog
      open={!!payslip}
      title="Chốt phiếu lương"
      message={`Xác nhận chốt phiếu lương tháng ${payslip?.month} cho nhân viên "${payslip?.employee}"? Sau khi chốt sẽ không thể chỉnh sửa thưởng/phạt.`}
      confirmLabel="Xác nhận chốt"
      tone="primary"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

interface PrintProps {
  payslip: Payslip | null;
  onClose: () => void;
}

export function PrintPayslipModal({ payslip, onClose }: PrintProps) {
  return (
    <Modal open={!!payslip} onClose={onClose} title={`Phiếu lương chi tiết — ${payslip?.employee ?? ""}`} size="lg" footer={<><Button variant="white" onClick={onClose}>Đóng</Button><Button onClick={() => { alert(`Đang kết nối máy in để in phiếu lương cho ${payslip?.employee}...`); onClose(); }}><FontAwesomeIcon icon={faPrint} fontSize={16} /> In phiếu lương</Button></>}>
      {payslip && (
        <div className="p-4 border border-gray-200 rounded-xl bg-white space-y-4">
          <div className="text-center pb-3 border-b border-gray-200">
            <h5 className="font-bold text-gray-800 text-lg">PHIẾU LƯƠNG NHÂN VIÊN</h5><p className="text-xs text-gray-500">Kỳ lương: {payslip.month}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-500">Họ và tên:</span> <strong className="text-gray-800">{payslip.employee}</strong></div>
            <div><span className="text-gray-500">Số công thực tế:</span> <strong className="text-gray-800">{payslip.days} ngày</strong></div>
            <div><span className="text-gray-500">Trạng thái:</span> <Badge tone="success">Đã chốt lương</Badge></div>
          </div>
          <div className="border-t border-b border-dashed border-gray-300 py-3 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Lương cơ bản:</span><span className="font-medium text-gray-800">{formatVND(payslip.salary)}</span></div>
            <div className="flex justify-between text-success"><span>Tiền thưởng (+):</span><span className="font-medium">{formatVND(payslip.bonus)}</span></div>
            <div className="flex justify-between text-danger"><span>Khấu trừ / Phạt (-):</span><span className="font-medium">{formatVND(payslip.penalty)}</span></div>
          </div>
          {payslip.reason && (
            <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-700 border border-gray-100">
              <span className="font-semibold text-gray-800 block mb-0.5">Ghi chú / Lý do điều chỉnh:</span>{payslip.reason}
            </div>
          )}
          <div className="flex justify-between items-center text-base pt-1">
            <span className="font-bold text-gray-800">TỔNG CỘNG THỰC LĨNH:</span><span className="font-extrabold text-primary text-lg">{formatVND(payslip.total)}</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
