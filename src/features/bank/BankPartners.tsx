"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuildingColumns,
  faCheck,
  faCircleCheck,
  faKey,
  faShieldHalved,
  faStar,
} from "@fortawesome/free-solid-svg-icons";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { formatVND } from "@/lib/utils";
import type { BankPartner } from "./types";

interface Props {
  partners: BankPartner[];
  onSetPrimary: (id: string) => void;
  onOpenConfig: (p: BankPartner) => void;
}

export default function BankPartnersList({
  partners,
  onSetPrimary,
  onOpenConfig,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Tài khoản Doanh nghiệp & Ngân hàng Chi lương</CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">
            Tài khoản nguồn phục vụ thanh toán tiền lương và phụ cấp tự động cho nhân viên
          </p>
        </div>
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
                      {partner.branch}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <span>Số tài khoản:</span>
                    <span className="font-mono font-bold text-gray-900">
                      {partner.accountNumber}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Chủ tài khoản:</span>
                    <span className="font-semibold text-gray-800 truncate max-w-[170px]">
                      {partner.accountName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Số dư khả dụng:</span>
                    <span className="font-bold text-emerald-700 text-sm">
                      {formatVND(partner.balance)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Hình thức chi lương:</span>
                    <span className="font-medium text-gray-800 bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                      Chuyển tiền theo lô 24/7
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Trạng thái liên kết:</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                      <FontAwesomeIcon icon={faCircleCheck} fontSize={11} /> Sẵn sàng chuyển tiền
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  {!isPrimary ? (
                    <Button
                      variant="white"
                      size="sm"
                      className="text-xs flex-1"
                      onClick={() => onSetPrimary(partner.id)}
                    >
                      <FontAwesomeIcon icon={faCheck} fontSize={12} /> Chọn làm nguồn chính
                    </Button>
                  ) : (
                    <span className="text-xs text-primary font-semibold flex items-center gap-1">
                      <FontAwesomeIcon icon={faShieldHalved} fontSize={12} /> Nguồn chi mặc định
                    </span>
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
