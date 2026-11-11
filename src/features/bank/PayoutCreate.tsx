"use client";

import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMoneyBillTransfer,
  faArrowsRotate,
  faCopy,
  faCheck,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Select, Input } from "@/components/ui/Form";
import { formatDateTime, formatVND } from "@/lib/utils";
import { apiGet, apiPut, createPayout, GatewayError } from "@/lib/api";
import type { BankPartner, SoapTransaction } from "./types";

interface PayslipRecord {
  id: string;
  employeeId: string;
  month: string;
  netSalary: number;
  status: string;
  payoutId?: string | null;
}

interface EmployeeItem {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  partners: BankPartner[];
  onDisburseSuccess: (newTx: SoapTransaction, deduped: boolean) => void;
}

function newIdempotencyKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `KEY-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

function toDisplayDate(isoOrNow: string): string {
  // Hiển thị DD/MM/YYYY HH:mm theo chuẩn chung của hệ thống
  return formatDateTime(isoOrNow || new Date());
}

export default function CreatePayrollDisbursementModal({
  open,
  onClose,
  partners,
  onDisburseSuccess,
}: Props) {
  const [selectedBankId, setSelectedBankId] = useState(
    partners.find((p) => p.isPrimary)?.id || partners[0]?.id || ""
  );
  const [idempotencyKey, setIdempotencyKey] = useState(() => newIdempotencyKey());
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Danh sách phiếu lương và nhân sự
  const [closedSlips, setClosedSlips] = useState<PayslipRecord[]>([]);
  const [employeeMap, setEmployeeMap] = useState<Map<string, string>>(new Map());
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [fetchingSlips, setFetchingSlips] = useState(false);

  // Sinh idempotencyKey & tải các phiếu lương đã chốt mỗi khi mở modal
  useEffect(() => {
    if (!open) return;
    let ignore = false;
    Promise.all([
      apiGet<PayslipRecord[]>("/api/payroll/payslips"),
      apiGet<EmployeeItem[]>("/api/employees"),
    ])
      .then(([slips, emps]) => {
        if (!ignore) {
          const map = new Map((emps || []).map((e) => [e.id, e.name]));
          setEmployeeMap(map);

          // Chỉ lấy các phiếu lương đã chốt và chưa được gắn lệnh chi (payoutId)
          const closed = (slips || []).filter(
            (s) => s.status === "đã chốt" && !s.payoutId
          );
          setClosedSlips(closed);

          const months = Array.from(new Set(closed.map((s) => s.month)));
          if (months.length > 0) {
            setSelectedMonth(months[0]);
            const count = closed.filter((s) => s.month === months[0]).length;
            setContent(`Chi lương tháng ${months[0]} (${count} nhân sự)`);
          } else {
            setSelectedMonth("");
            setContent("Chi lương");
          }
          setFetchingSlips(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setClosedSlips([]);
          setFetchingSlips(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [open]);

  const availableMonths = useMemo(() => {
    return Array.from(new Set(closedSlips.map((s) => s.month)));
  }, [closedSlips]);

  const targetSlips = useMemo(() => {
    if (!selectedMonth || selectedMonth === "all") {
      return closedSlips;
    }
    return closedSlips.filter((s) => s.month === selectedMonth);
  }, [closedSlips, selectedMonth]);

  // Tự động tính tổng số tiền từ các phiếu lương đã chốt
  const calculatedAmount = useMemo(() => {
    return targetSlips.reduce((sum, s) => sum + (Number(s.netSalary) || 0), 0);
  }, [targetSlips]);

  const calculatedCount = targetSlips.length;

  const handleMonthChange = (m: string) => {
    setSelectedMonth(m);
    const count = (m === "all" ? closedSlips : closedSlips.filter((s) => s.month === m)).length;
    setContent(m === "all" ? `Chi lương ${count} phiếu đã chốt` : `Chi lương tháng ${m} (${count} nhân sự)`);
  };

  const selectedBank = partners.find((p) => p.id === selectedBankId) || partners[0];

  const handleDisburse = async () => {
    if (partners.length === 0 || !selectedBank) {
      setError("Chưa có tài khoản ngân hàng doanh nghiệp nào được liên kết.");
      return;
    }
    if (calculatedCount === 0 || calculatedAmount <= 0) {
      setError("Không có phiếu lương đã chốt nào để thực hiện chi.");
      return;
    }
    if (selectedBank.balance < calculatedAmount) {
      setError(
        `Số dư tài khoản nguồn (${formatVND(selectedBank.balance)}) không đủ để chi lương tổng cộng ${formatVND(calculatedAmount)}.`
      );
      return;
    }
    if (!idempotencyKey.trim()) {
      setError("Thiếu idempotencyKey. Vui lòng tạo key mới.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = (await createPayout({
        idempotencyKey: idempotencyKey.trim(),
        debitAccount: selectedBank.accountNumber,
        content: content.trim() || "Chi lương",
        totalAmount: calculatedAmount,
        beneficiaryCount: calculatedCount,
      })) as unknown as {
        id: string;
        bankReference: string;
        debitAccount: string;
        totalAmount: number;
        content: string;
        beneficiaryCount: number;
        status: string;
        createdAt: string;
        deduped?: boolean;
      };

      // Gắn payoutId cho các phiếu lương vừa được chi trả (qua apiPut để dùng chung
      // cơ chế phiên + gateway envelope và tự ghi nhật ký thao tác vào backlog)
      if (res.id && targetSlips.length > 0) {
        await Promise.allSettled(
          targetSlips.map((s) =>
            apiPut(`/api/payroll/payslips/${encodeURIComponent(s.id)}`, { payoutId: res.id })
          )
        );
      }

      const deduped = res.deduped === true;
      const tx: SoapTransaction = {
        id: res.id,
        batchName: res.content || content,
        bankName: selectedBank.shortName,
        accountNumber: selectedBank.accountNumber,
        accountName: selectedBank.accountName,
        totalEmployees: res.beneficiaryCount,
        totalAmount: res.totalAmount,
        status: res.status === "success" ? "success" : "processing",
        createdAt: toDisplayDate(res.createdAt),
        completedAt: toDisplayDate(res.createdAt),
        bankReference: res.bankReference,
        soapAction: "CreatePayout (REST)",
        xmlPayload: `REST POST /api/payroll/payouts\nidempotencyKey=${idempotencyKey}`,
        xmlResponse: `transactionId=${res.id}\nbankReference=${res.bankReference}${deduped ? "\ndeduped=true" : ""}`,
        deduped,
      };
      onDisburseSuccess(tx, deduped);
      if (deduped) {
        alert("Lệnh chi trùng, trả bản ghi cũ (deduped).");
      }
      onClose();
    } catch (e) {
      if (e instanceof GatewayError && e.code === "INSUFFICIENT_FUNDS") {
        setError("Số dư tài khoản công ty không đủ.");
      } else if (e instanceof GatewayError) {
        setError(e.message);
      } else {
        setError("Lỗi tạo lệnh chi. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(idempotencyKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo Lệnh Chuyển Lương Tự Động qua Ngân hàng"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <Button variant="white" onClick={onClose} disabled={loading} className="text-xs">
            Hủy
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="white"
              onClick={() => setIdempotencyKey(newIdempotencyKey())}
              disabled={loading}
              className="text-xs"
              title="Sinh key mới để tạo lệnh chi khác"
            >
              Key mới
            </Button>
            <Button
              onClick={handleDisburse}
              disabled={loading || partners.length === 0 || calculatedCount === 0 || calculatedAmount <= 0}
              className="text-xs"
            >
              <FontAwesomeIcon
                icon={loading ? faArrowsRotate : faMoneyBillTransfer}
                className={loading ? "animate-spin" : ""}
              />
              {loading
                ? "Đang xử lý chuyển tiền qua ngân hàng..."
                : calculatedAmount > 0
                ? `Xác nhận & Chuyển ${formatVND(calculatedAmount)}`
                : "Xác nhận & Chuyển lương"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {partners.length === 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
            Chưa có tài khoản ngân hàng doanh nghiệp nào được liên kết. Vui lòng thêm tài khoản ngân hàng trước.
          </div>
        )}

        {!fetchingSlips && closedSlips.length === 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
            Chưa có phiếu lương nào được chốt.
          </div>
        )}

        <div className="p-4 bg-primary-50/30 border border-primary-200 rounded-xl">
          <div className="text-xs font-bold text-primary">
            Lệnh chi lương điện tử tự động — Tiền sẽ chuyển trực tiếp vào tài khoản nhân sự
          </div>
        </div>

        {/* Idempotency key */}
        <Field label="Khóa chống trùng (idempotencyKey)" required>
          <div className="flex items-center gap-2">
            <Input value={idempotencyKey} onChange={(e) => setIdempotencyKey(e.target.value)} disabled={loading} className="font-mono text-xs" />
            <Button variant="white" onClick={copyKey} className="text-xs shrink-0" title="Sao chép key">
              <FontAwesomeIcon icon={copied ? faCheck : faCopy} fontSize={12} />
              {copied ? "Đã chép" : "Chép"}
            </Button>
          </div>
        </Field>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-700 block">
            Tài khoản Doanh nghiệp nguồn trích tiền <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs hover:border-gray-300 transition-colors">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                1. Ngân hàng
              </label>
              <Select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                disabled={loading || partners.length === 0}
                className="text-xs font-bold text-gray-900"
              >
                {partners.length === 0 ? (
                  <option value="">Chưa có tài khoản</option>
                ) : (
                  partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.shortName}
                    </option>
                  ))
                )}
              </Select>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                2. Số tài khoản (STK)
              </label>
              <div className="h-9 px-3 rounded-lg bg-gray-50 border border-gray-200 flex items-center font-mono font-bold text-xs text-primary">
                {selectedBank?.accountNumber ?? "—"}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                3. Số dư khả dụng
              </label>
              <div className="h-9 px-3 rounded-lg bg-emerald-50/60 border border-emerald-200 flex items-center font-bold text-xs text-emerald-700">
                {selectedBank ? formatVND(selectedBank.balance) : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Chọn kỳ lương đã chốt */}
        <Field label="Kỳ lương cần chi trả" required>
          <Select
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            disabled={loading || availableMonths.length === 0}
          >
            {availableMonths.length === 0 ? (
              <option value="">Chưa có phiếu lương đã chốt</option>
            ) : (
              <>
                {availableMonths.map((m) => {
                  const mSlips = closedSlips.filter((s) => s.month === m);
                  const mTotal = mSlips.reduce((sum, s) => sum + (Number(s.netSalary) || 0), 0);
                  return (
                    <option key={m} value={m}>
                      Kỳ {m} ({mSlips.length} phiếu đã chốt — {formatVND(mTotal)})
                    </option>
                  );
                })}
                {availableMonths.length > 1 && (
                  <option value="all">
                    Tất cả các kỳ ({closedSlips.length} phiếu đã chốt — {formatVND(closedSlips.reduce((s, p) => s + (Number(p.netSalary) || 0), 0))})
                  </option>
                )}
              </>
            )}
          </Select>
        </Field>

        <Field label="Nội dung chuyển khoản" required>
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
            placeholder="Ví dụ: Chi lương tháng 10/2026"
          />
        </Field>

        {/* Tự động tính toán tổng số tiền và số lượng thụ hưởng */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Tổng số tiền chi (VNĐ)">
            <div className="h-10 px-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between font-bold text-sm text-emerald-800">
              <span>{formatVND(calculatedAmount)}</span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                Tự động tính ({calculatedCount} phiếu)
              </span>
            </div>
          </Field>
          <Field label="Số lượng người nhận">
            <div className="h-10 px-3.5 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between font-bold text-sm text-gray-800">
              <span>{calculatedCount} nhân sự</span>
              <span className="text-[10px] font-normal text-gray-500 flex items-center gap-1">
                <FontAwesomeIcon icon={faUsers} fontSize={11} /> Phiếu đã chốt
              </span>
            </div>
          </Field>
        </div>

        {/* Danh sách người nhận chi tiết */}
        {targetSlips.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3 max-h-36 overflow-y-auto space-y-1.5 text-xs">
            <div className="font-semibold text-gray-600 text-[11px] uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Danh sách nhân sự nhận lương đợt này:</span>
              <span className="text-gray-500 font-normal">{targetSlips.length} người</span>
            </div>
            {targetSlips.map((s) => (
              <div
                key={s.id}
                className="flex justify-between items-center text-gray-700 bg-white px-2.5 py-1.5 rounded-lg border border-gray-100"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {employeeMap.get(s.employeeId) || s.employeeId}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">({s.month})</span>
                </div>
                <span className="font-mono font-bold text-emerald-700">
                  {formatVND(s.netSalary)}
                </span>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 space-y-1.5">
          <div className="flex justify-between">
            <span>Kênh thực hiện:</span>
            <span className="font-semibold text-gray-900">REST Idempotent qua Gateway (:4000)</span>
          </div>
          <div className="flex justify-between">
            <span>Phí giao dịch chuyển lương:</span>
            <span className="font-semibold text-emerald-700">0 đ (Miễn phí theo thỏa thuận doanh nghiệp)</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

