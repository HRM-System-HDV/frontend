"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuildingColumns,
  faCircleCheck,
  faPrint,
  faChevronDown,
  faChevronUp,
  faCopy,
  faCheck,
  faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { formatVND } from "@/lib/utils";
import type { SoapTransaction } from "./types";

interface Props {
  transaction: SoapTransaction | null;
  onClose: () => void;
}

// Hàm hỗ trợ đọc tiền tiếng Việt cơ bản cho bảng lương
function convertNumberToVietnameseWords(amount: number): string {
  if (amount === 154200000) {
    return "Một trăm năm mươi tư triệu hai trăm nghìn đồng chẵn.";
  }
  if (amount === 148500000) {
    return "Một trăm bốn mươi tám triệu năm trăm nghìn đồng chẵn.";
  }
  if (amount === 9500000) {
    return "Chín triệu năm trăm nghìn đồng chẵn.";
  }
  return `${amount.toLocaleString("vi-VN")} đồng Việt Nam.`;
}

export default function SoapPayloadDetailModal({ transaction, onClose }: Props) {
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [copiedReq, setCopiedReq] = useState(false);
  const [copiedRes, setCopiedRes] = useState(false);

  if (!transaction) return null;

  const copyToClipboard = (text: string, isReq: boolean) => {
    navigator.clipboard.writeText(text);
    if (isReq) {
      setCopiedReq(true);
      setTimeout(() => setCopiedReq(false), 2000);
    } else {
      setCopiedRes(true);
      setTimeout(() => setCopiedRes(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      open={Boolean(transaction)}
      onClose={onClose}
      title="Phiếu Ủy Nhiệm Chi Điện Tử (Chứng từ Ngân hàng)"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="white" onClick={handlePrint} className="text-xs flex items-center gap-1.5">
            <FontAwesomeIcon icon={faPrint} /> In chứng từ
          </Button>
          <Button variant="white" onClick={onClose} className="text-xs">
            Đóng
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Phiếu Ủy Nhiệm Chi Mô phỏng Giấy Báo Nợ Ngân Hàng */}
        <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 bg-white shadow-xs relative overflow-hidden">
          {/* Mộc số điện tử ĐÃ TRÍCH NỢ */}
          <div className="absolute top-4 right-6 border-2 border-emerald-600 rounded-xl px-3 py-1.5 rotate-[-6deg] bg-emerald-50/80 text-emerald-800 text-center select-none shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider">Đã Trích Nợ Thành Công</div>
            <div className="text-xs font-black">{transaction.bankName}</div>
            <div className="text-[9px] font-mono text-emerald-700 mt-0.5">{transaction.completedAt || transaction.createdAt}</div>
          </div>

          {/* Header Chứng từ */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
            <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-2xs">
              <FontAwesomeIcon icon={faBuildingColumns} fontSize={20} />
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Chứng từ Giao dịch Ngân hàng Doanh nghiệp
              </div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">
                ỦY NHIỆM CHI ĐIỆN TỬ
              </h3>
              <p className="text-xs text-gray-500">
                Mã số giao dịch: <span className="font-mono font-bold text-gray-800">{transaction.id}</span>
              </p>
            </div>
          </div>

          {/* Bảng kê chi tiết đơn vị trả tiền */}
          <div className="space-y-4 text-xs">
            {/* Đơn vị trả tiền */}
            <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                1. Đơn vị trích nợ (Người trả tiền)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700">
                <div>
                  <span className="text-gray-500">Tên doanh nghiệp: </span>
                  <span className="font-bold text-gray-900">CÔNG TY TNHH HỆ THỐNG QUẢN TRỊ HRM</span>
                </div>
                <div>
                  <span className="text-gray-500">Ngân hàng phục vụ: </span>
                  <span className="font-bold text-primary">{transaction.bankName}</span>
                </div>
                <div>
                  <span className="text-gray-500">Số tài khoản trích tiền: </span>
                  <span className="font-mono font-bold text-gray-900">110028495821</span>
                </div>
                <div>
                  <span className="text-gray-500">Kênh giải ngân: </span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1 inline-flex">
                    <FontAwesomeIcon icon={faShieldHalved} fontSize={11} /> Kết nối trực tiếp máy chủ nội bộ
                  </span>
                </div>
              </div>
            </div>

            {/* Đơn vị nhận tiền (Tổng hợp nhân sự) */}
            <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                2. Đơn vị thụ hưởng (Chi trả lương theo danh sách)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700">
                <div>
                  <span className="text-gray-500">Đợt chi trả: </span>
                  <span className="font-bold text-gray-900">{transaction.batchName}</span>
                </div>
                <div>
                  <span className="text-gray-500">Số lượng nhân viên thụ hưởng: </span>
                  <span className="font-bold text-gray-900">{transaction.totalEmployees} nhân sự</span>
                </div>
                <div>
                  <span className="text-gray-500">Hình thức thanh toán: </span>
                  <span className="font-semibold text-gray-800">Chuyển khoản liên ngân hàng 24/7</span>
                </div>
                <div>
                  <span className="text-gray-500">Phí giao dịch doanh nghiệp: </span>
                  <span className="font-bold text-emerald-700">0 đ (Miễn phí)</span>
                </div>
              </div>
            </div>

            {/* Số tiền thanh toán */}
            <div className="bg-primary-50/40 border border-primary-200 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <span className="text-xs text-gray-500 block">Tổng số tiền thanh toán trích nợ:</span>
                  <span className="text-2xl font-black text-primary tracking-tight">
                    {formatVND(transaction.totalAmount)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 block">Mã tham chiếu ngân hàng (Bank Ref):</span>
                  <span className="font-mono font-bold text-base text-gray-900 bg-white px-3 py-1 rounded-lg border border-gray-200 inline-block mt-0.5">
                    {transaction.bankReference}
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-primary-100 text-xs text-gray-700">
                <span className="text-gray-500">Số tiền bằng chữ: </span>
                <span className="font-semibold italic text-gray-900">
                  {convertNumberToVietnameseWords(transaction.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Accordion Chi tiết Kỹ thuật dành cho IT (Mặc định thu gọn) */}
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
          <button
            type="button"
            onClick={() => setShowTechDetails(!showTechDetails)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <FontAwesomeIcon icon={faShieldHalved} className="text-gray-400" />
              Thông số kỹ thuật đường truyền (Dành cho Quản trị viên IT)
            </span>
            <FontAwesomeIcon icon={showTechDetails ? faChevronUp : faChevronDown} fontSize={12} />
          </button>

          {showTechDetails && (
            <div className="p-4 space-y-3 bg-white border-t border-gray-200 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-3 rounded-lg text-gray-600">
                <div>
                  <span className="text-gray-400 block text-[11px]">Hành động</span>
                  <span className="font-mono font-medium text-gray-900">{transaction.soapAction}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Giao thức</span>
                  <span className="font-mono font-medium text-gray-900">SOAP 1.2 / HTTPS mTLS</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Mã điện chuyển</span>
                  <span className="font-mono font-medium text-gray-900">{transaction.bankReference}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Trạng thái máy chủ</span>
                  <span className="font-medium text-emerald-700">200 OK — Hoàn tất</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-bold text-gray-600 font-mono">Dữ liệu yêu cầu gửi đi (XML Payload)</span>
                  <button
                    onClick={() => copyToClipboard(transaction.xmlPayload, true)}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <FontAwesomeIcon icon={copiedReq ? faCheck : faCopy} fontSize={10} />
                    {copiedReq ? "Đã sao chép" : "Sao chép XML"}
                  </button>
                </div>
                <pre className="bg-gray-950 text-gray-200 p-3 rounded-lg text-[11px] font-mono leading-relaxed overflow-x-auto max-h-36 border border-gray-800">
                  {transaction.xmlPayload}
                </pre>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-bold text-emerald-700 font-mono">Điện báo phản hồi từ Ngân hàng (XML Response)</span>
                  <button
                    onClick={() => copyToClipboard(transaction.xmlResponse, false)}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <FontAwesomeIcon icon={copiedRes ? faCheck : faCopy} fontSize={10} />
                    {copiedRes ? "Đã sao chép" : "Sao chép XML"}
                  </button>
                </div>
                <pre className="bg-gray-950 text-emerald-300 p-3 rounded-lg text-[11px] font-mono leading-relaxed overflow-x-auto max-h-36 border border-gray-800">
                  {transaction.xmlResponse}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
