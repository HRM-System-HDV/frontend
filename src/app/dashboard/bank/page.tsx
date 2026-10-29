"use client";

import { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faRotateRight,
} from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import BankHeaderStats from "@/features/bank/BankStats";
import BankPartnersList from "@/features/bank/BankPartners";
import SoapTransactionsTable from "@/features/bank/SoapHistory";
import SoapTestModal from "@/features/bank/SoapTest";
import SoapPayloadDetailModal from "@/features/bank/PayloadDetail";
import CreatePayrollDisbursementModal from "@/features/bank/PayoutCreate";
import BankConfigModal from "@/features/bank/BankForm";
import { initialSoapGatewayConfig } from "@/features/bank/mock";
import type { BankPartner, SoapTransaction } from "@/features/bank/types";
import { apiGet, GatewayError, GATEWAY_URL } from "@/lib/api";

interface BankAccountRow {
  id: string;
  accountNumber: string;
  accountName?: string;
  bankName?: string;
  balance: number;
  status?: string;
  isPrimary?: boolean;
}

interface PayoutRow {
  id: string;
  bankReference: string;
  debitAccount: string;
  totalAmount: number;
  content?: string;
  beneficiaryCount: number;
  idempotencyKey?: string;
  status: string;
  createdAt: string;
  deduped?: boolean;
}

function accountToPartner(row: BankAccountRow, index: number): BankPartner {
  const displayName = row.bankName || row.accountName || `Tài khoản ${row.accountNumber}`;
  const shortName = row.bankName || displayName.split(" ").slice(0, 2).join(" ");
  return {
    id: row.id,
    name: displayName,
    shortName,
    accountNumber: row.accountNumber,
    accountName: row.accountName || displayName,
    branch: "Chi nhánh mở tài khoản",
    balance: Number(row.balance) || 0,
    isPrimary: row.isPrimary === true,
    status: row.status === "vô hiệu hóa" ? "maintenance" : "active",
    soapProtocol: "SOAP 1.2 / HTTPS (qua Gateway :4000)",
    mTLSStatus: "valid",
    certExpiry: "—",
  };
}

function payoutToTx(row: PayoutRow, bankNameByAccount: Map<string, string>): SoapTransaction {
  return {
    id: row.id,
    batchName: row.content || "Lệnh chi lương",
    bankName: bankNameByAccount.get(row.debitAccount) || row.debitAccount,
    totalEmployees: row.beneficiaryCount,
    totalAmount: Number(row.totalAmount) || 0,
    status: row.status === "success" ? "success" : row.status === "failed" ? "failed" : "processing",
    createdAt: row.createdAt,
    completedAt: row.createdAt,
    bankReference: row.bankReference,
    soapAction: "CreatePayout (REST)",
    xmlPayload: `REST POST /api/payroll/payouts\nidempotencyKey=${row.idempotencyKey ?? ""}`,
    xmlResponse: `transactionId=${row.id}\nbankReference=${row.bankReference}`,
    deduped: row.deduped,
  };
}

export default function BankIntegrationPage() {
  const [partners, setPartners] = useState<BankPartner[]>([]);
  const [transactions, setTransactions] = useState<SoapTransaction[]>([]);
  const [gatewayConfig, setGatewayConfig] = useState(initialSoapGatewayConfig);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [testModalOpen, setTestModalOpen] = useState(false);
  const [createDisburseOpen, setCreateDisburseOpen] = useState(false);
  const [selectedPayloadTx, setSelectedPayloadTx] =
    useState<SoapTransaction | null>(null);
  const [selectedBankConfig, setSelectedBankConfig] =
    useState<BankPartner | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [accounts, payouts] = await Promise.all([
        apiGet<BankAccountRow[]>("/api/payroll/bank-accounts"),
        apiGet<PayoutRow[]>("/api/payroll/payouts"),
      ]);
      const mappedPartners = (accounts || []).map(accountToPartner);
      setPartners(mappedPartners);
      const bankNameByAccount = new Map(
        mappedPartners.map((p) => [p.accountNumber, p.shortName] as const)
      );
      setTransactions((payouts || []).map((r) => payoutToTx(r, bankNameByAccount)));
    } catch (e) {
      setError(e instanceof GatewayError ? e.message : "Lỗi tải dữ liệu ngân hàng");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    apiGet<any>("/api/soap-config")
      .then((c) => {
        if (c && typeof c === "object") {
          setGatewayConfig({
            endpointUrl: c.endpointUrl ?? "",
            wsdlUrl: c.wsdlUrl ?? "",
            serviceName: c.serviceName ?? "",
            port: Number(c.port) || 0,
            securityMode: c.securityMode ?? "",
            allowedIPs: Array.isArray(c.allowedIPs) ? c.allowedIPs : [],
            status: c.status ?? "unknown",
            lastPingTime: c.lastPingTime ?? "—",
            avgResponseTime: c.avgResponseTime ?? "—",
          });
        }
      })
      .catch(() => {});
  }, [fetchData]);

  const handleSetPrimary = async (bankId: string) => {
    try {
      const res = await fetch(`${GATEWAY_URL}/api/payroll/bank-accounts/${bankId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrimary: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message || `HTTP_${res.status}`);
      }
      setPartners((prev) =>
        prev.map((p) => ({
          ...p,
          isPrimary: p.id === bankId,
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi đặt tài khoản chính");
    }
  };

  const handleDisburseSuccess = (newTx: SoapTransaction, deduped: boolean) => {
    setTransactions((prev) => [{ ...newTx, deduped }, ...prev]);
    // Refetch để cập nhật số dư tài khoản công ty sau khi chi.
    fetchData();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Liên kết Ngân hàng & Chi lương Tự động"
          breadcrumb={[
            { label: "HRM", href: "#" },
            { label: "Ngân hàng & Chi lương" },
          ]}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-3" />
              <div className="h-7 bg-gray-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-500">Đang tải dữ liệu ngân hàng qua Gateway...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Liên kết Ngân hàng & Chi lương Tự động"
        breadcrumb={[
          { label: "HRM", href: "#" },
          { label: "Ngân hàng & Chi lương" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="white"
              onClick={() => setTestModalOpen(true)}
              className="text-xs"
            >
              <FontAwesomeIcon icon={faRotateRight} fontSize={12} /> Kiểm tra đường truyền
            </Button>
            <Button
              onClick={() => setCreateDisburseOpen(true)}
              className="text-xs"
              disabled={partners.length === 0}
            >
              <FontAwesomeIcon icon={faPlus} fontSize={12} /> Tạo lệnh chi lương mới
            </Button>
          </div>
        }
      />

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button variant="white" onClick={fetchData} className="text-xs shrink-0">
            Thử lại
          </Button>
        </div>
      )}

      {/* 1. Thẻ thống kê tổng quan Gateway & Tài khoản */}
      <BankHeaderStats
        gatewayConfig={gatewayConfig}
        partners={partners}
        transactions={transactions}
        onTestSoap={() => setTestModalOpen(true)}
      />

      {/* 2. Danh sách Ngân hàng Đối tác liên kết */}
      <BankPartnersList
        partners={partners}
        onSetPrimary={handleSetPrimary}
        onOpenConfig={(p) => setSelectedBankConfig(p)}
      />

      {/* 3. Bảng Lịch sử Lệnh Chi lương SOAP API */}
      <SoapTransactionsTable
        transactions={transactions}
        onViewPayload={(t) => setSelectedPayloadTx(t)}
        onCreateDisbursement={() => setCreateDisburseOpen(true)}
      />

      {/* Modals */}
      <SoapTestModal
        open={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        config={gatewayConfig}
      />

      <CreatePayrollDisbursementModal
        open={createDisburseOpen}
        onClose={() => setCreateDisburseOpen(false)}
        partners={partners}
        onDisburseSuccess={handleDisburseSuccess}
      />

      <SoapPayloadDetailModal
        transaction={selectedPayloadTx}
        onClose={() => setSelectedPayloadTx(null)}
      />

      <BankConfigModal
        partner={selectedBankConfig}
        onClose={() => setSelectedBankConfig(null)}
        onSaved={(updated) => {
          setPartners((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        }}
      />
    </div>
  );
}
