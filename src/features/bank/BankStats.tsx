"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuildingColumns,
  faCircleCheck,
  faMoneyBillWave,
  faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";
import { formatVND } from "@/lib/utils";
import type { BankPartner, SoapGatewayConfig, SoapTransaction } from "./types";

interface Props {
  gatewayConfig: SoapGatewayConfig;
  partners: BankPartner[];
  transactions: SoapTransaction[];
  onTestSoap: () => void;
}

export default function BankHeaderStats({
  gatewayConfig,
  partners,
  transactions,
  onTestSoap,
}: Props) {
  const primaryBank = partners.find((p) => p.isPrimary) || partners[0];
  const totalBalance = partners.reduce((sum, p) => sum + p.balance, 0);
  const totalDisbursed = transactions
    .filter((t) => t.status === "success")
    .reduce((sum, t) => sum + t.totalAmount, 0);

  // Trạng thái lấy từ kết quả ping thật của integration-service, không ghi cứng.
  const connection = {
    healthy: { badge: "Thông suốt 24/7", tone: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", title: "Sẵn sàng chi lương tự động" },
    degraded: { badge: "Kết nối chậm", tone: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", title: "Ngân hàng phản hồi nhưng quá cảnh báo" },
    down: { badge: "Mất kết nối", tone: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", title: "Không gọi được cổng ngân hàng" },
    unknown: { badge: "Chưa kiểm tra", tone: "bg-gray-50 text-gray-600 border-gray-200", dot: "bg-gray-400", title: "Chưa có lần ping thành công nào" },
  }[gatewayConfig.status] ?? {
    badge: "Chưa kiểm tra",
    tone: "bg-gray-50 text-gray-600 border-gray-200",
    dot: "bg-gray-400",
    title: "Chưa có lần ping thành công nào",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 1. Trạng thái kết nối ngân hàng */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs hover:border-gray-300 transition-colors flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2.5 min-h-[32px]">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Kết nối Trực tiếp Ngân hàng
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${connection.tone}`}>
              <span className={`w-2 h-2 rounded-full ${connection.dot}`} />
              {connection.badge}
            </span>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {connection.title}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            Thời gian phản hồi máy chủ:{" "}
            <span className="font-semibold text-gray-800">
              {gatewayConfig.avgResponseTime || "—"}
            </span>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs border-t border-gray-100 pt-3 text-gray-600">
          <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
            <FontAwesomeIcon icon={faShieldHalved} className="text-xs" />
            Kênh truyền bảo mật số chuẩn doanh nghiệp
          </span>
          <button
            onClick={onTestSoap}
            className="text-primary hover:underline font-semibold cursor-pointer px-2 py-0.5 rounded hover:bg-primary-50 transition-colors"
          >
            Kiểm tra đường truyền →
          </button>
        </div>
      </div>

      {/* 2. Ngân hàng Chi lương Chính */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs hover:border-gray-300 transition-colors flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2.5 min-h-[32px]">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tài khoản Chi trả Chính
            </span>
            <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary flex items-center justify-center">
              <FontAwesomeIcon icon={faBuildingColumns} fontSize={14} />
            </div>
          </div>
          <div className="text-lg font-bold text-gray-900 truncate">
            {primaryBank?.name || "Chưa thiết lập"}
          </div>
          <div className="text-xs text-gray-500 font-mono mt-0.5">
            Số tài khoản nguồn:{" "}
            <span className="font-bold text-gray-800">
              {primaryBank?.accountNumber || "—"}
            </span>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs border-t border-gray-100 pt-3 text-gray-600">
          <span>Nơi mở tài khoản:</span>
          <span className="font-semibold text-gray-800">
            {primaryBank?.bankBranch || "—"}
          </span>
        </div>
      </div>

      {/* 3. Tổng số dư khả dụng chi lương */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs hover:border-gray-300 transition-colors flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2.5 min-h-[32px]">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tổng số dư nguồn chi khả dụng
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FontAwesomeIcon icon={faMoneyBillWave} fontSize={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 tracking-tight">
            {formatVND(totalBalance)}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            Tổng số dư trên {partners.length} tài khoản doanh nghiệp liên kết
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs border-t border-gray-100 pt-3 text-gray-600">
          <span>Tài khoản chính ({primaryBank?.shortName || "—"}):</span>
          <span className="font-bold text-emerald-700 text-sm">
            {formatVND(primaryBank?.balance || 0)}
          </span>
        </div>
      </div>

      {/* 4. Tổng giải ngân qua Ngân hàng */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs hover:border-gray-300 transition-colors flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2.5 min-h-[32px]">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tổng tiền đã giải ngân chi lương
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FontAwesomeIcon icon={faCircleCheck} fontSize={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-primary tracking-tight">
            {formatVND(totalDisbursed)}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            Tự động trích nợ & chuyển vào tài khoản cá nhân của nhân viên
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs border-t border-gray-100 pt-3 text-gray-600">
          <span>Lịch sử chuyển tiền:</span>
          <span className="font-bold text-gray-800">
            {transactions.length} đợt chi trả thành công
          </span>
        </div>
      </div>
    </div>
  );
}
