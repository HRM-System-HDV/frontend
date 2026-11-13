"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuildingColumns,
  faCircleCheck,
  faCircleXmark,
  faShieldHalved,
  faStar,
} from "@fortawesome/free-solid-svg-icons";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { formatVND } from "@/lib/utils";
import type { BankPartner } from "./types";

interface Props {
  partners: BankPartner[];
  onOpenConfig: (p: BankPartner) => void;
}

export default function BankPartnersList({
  partners,
  onOpenConfig,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tài khoản Doanh nghiệp & Ngân hàng Chi lương</CardTitle>
      </CardHeader>
      <CardBody>
        {partners.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            Chưa có tài khoản ngân hàng doanh nghiệp nào được liên kết.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {partners.map((partner) => {
            const isPrimary = partner.isPrimary;
            const isConnected = partner.connectionStatus === "connected";
            return (
              <div
                key={partner.id}
                className={`relative rounded-xl border p-4 transition-all ${
                  isPrimary
                    ? "border-primary bg-primary-50/20 shadow-xs"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                {isPrimary && (
                  <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white flex items-center gap-1 shadow-2xs">
                    <FontAwesomeIcon icon={faStar} fontSize={10} />
                    Tài Khoản Chi Lương Chính
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isPrimary
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    <FontAwesomeIcon icon={faBuildingColumns} fontSize={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 truncate">
                      {partner.shortName}
                    </h4>
                    <p className="text-xs text-gray-500 truncate">
                      {partner.bankBranch || partner.branch}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Số tài khoản:</span>
                    <span className="font-mono font-bold text-gray-900 text-right">
                      {partner.accountNumber}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Chủ tài khoản:</span>
                    <span className="font-semibold text-gray-800 text-right truncate max-w-[170px]">
                      {partner.accountName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Số dư khả dụng:</span>
                    <span className="font-bold text-emerald-700 text-sm text-right">
                      {formatVND(partner.balance)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Hình thức chi lương:</span>
                    <span className="font-medium text-gray-800 text-right">
                      Chuyển tiền theo lô 24/7
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Trạng thái liên kết:</span>
                    {isConnected ? (
                      <span className="inline-flex items-center justify-end gap-1 text-[11px] font-semibold text-emerald-700 text-right">
                        <FontAwesomeIcon icon={faCircleCheck} fontSize={11} /> Sẵn sàng chuyển tiền
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-end gap-1 text-[11px] font-semibold text-red-600 text-right">
                        <FontAwesomeIcon icon={faCircleXmark} fontSize={11} /> Chưa kết nối Gateway
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  {isPrimary ? (
                    <span className="text-xs text-primary font-semibold flex items-center gap-1">
                      <FontAwesomeIcon icon={faShieldHalved} fontSize={12} /> Nguồn chi mặc định
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Chưa phải nguồn chính</span>
                  )}
                  <Button
                    variant="white"
                    size="sm"
                    className="text-xs"
                    onClick={() => onOpenConfig(partner)}
                  >
                    Chi tiết
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </CardBody>
    </Card>
  );
}
