"use client";

import { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import BankHeaderStats from "@/features/bank/BankStats";
import BankPartnersList from "@/features/bank/BankPartners";
import SoapTransactionsTable from "@/features/bank/SoapHistory";
import SoapTestModal from "@/features/bank/SoapTest";
import SoapPayloadDetailModal from "@/features/bank/PayloadDetail";
import CreatePayrollDisbursementModal from "@/features/bank/PayoutCreate";
import BankConfigModal, { CreateBankAccountModal } from "@/features/bank/BankForm";
import { DEFAULT_SOAP_GATEWAY_CONFIG } from "@/features/bank/constants";
import type { BankPartner, SoapTransaction, SoapGatewayConfig } from "@/features/bank/types";
import { apiGet, apiPut, GatewayError } from "@/lib/api";
import { useCurrentUser } from "@/context/AuthContext";
import { canAccessPath, NoAccessNotice } from "@/lib/permissions";

interface BankAccountRow {
  id: string;
  accountNumber: string;
  accountName?: string;
  bankName?: string;
  branch?: string;
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

function accountToPartner(row: BankAccountRow, gatewayConfig: SoapGatewayConfig): BankPartner {
  const displayName = row.bankName || row.accountName || `Tài khoản ${row.accountNumber}`;
  const shortName = row.bankName || displayName.split(" ").slice(0, 2).join(" ");
  const isHealthy = gatewayConfig.status === "healthy";
  return {
    id: row.id,
    name: displayName,
    shortName,
    accountNumber: row.accountNumber,
    accountName: row.accountName || displayName,
    branch: row.branch || "Chưa cập nhật chi nhánh",
    balance: Number(row.balance) || 0,
    isPrimary: row.isPrimary === true,
    status: row.status === "vô hiệu hóa" ? "maintenance" : "active",
    soapProtocol: gatewayConfig.securityMode || "SOAP 1.2 / HTTPS (qua Gateway :4000)",
    mTLSStatus: isHealthy ? "valid" : "not_configured",
    certExpiry: gatewayConfig.certExpiry || "Chưa thiết lập",
    channel: gatewayConfig.channel || "Gateway",
    connectionStatus: isHealthy ? "connected" : "disconnected",
  };
}

function payoutToTx(
  row: PayoutRow,
  bankNameByAccount: Map<string, string>,
  accountNameByAccount: Map<string, string>
): SoapTransaction {
  return {
    id: row.id,
    batchName: row.content || "Lệnh chi lương",
    bankName: bankNameByAccount.get(row.debitAccount) || row.debitAccount,
    accountNumber: row.debitAccount,
    accountName: accountNameByAccount.get(row.debitAccount) || "CÔNG TY CỔ PHẦN HRM",
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
  const { role } = useCurrentUser();
  // Số tài khoản, lệnh chi và cấu hình SOAP là dữ liệu quản trị hệ thống:
  // gateway chặn GET bank-accounts/payouts/soap-config cho admin. Vì vậy trang
  // này chỉ render với admin và không gửi request nào khi vai trò khác mở URL.
  const isAdmin = role === "admin";

  const [partners, setPartners] = useState<BankPartner[]>([]);
  const [transactions, setTransactions] = useState<SoapTransaction[]>([]);
  const [gatewayConfig, setGatewayConfig] = useState<SoapGatewayConfig>(DEFAULT_SOAP_GATEWAY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [testModalOpen, setTestModalOpen] = useState(false);
  const [createDisburseOpen, setCreateDisburseOpen] = useState(false);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [selectedPayloadTx, setSelectedPayloadTx] =
    useState<SoapTransaction | null>(null);
  const [selectedBankConfig, setSelectedBankConfig] =
    useState<BankPartner | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [accounts, payouts, configData] = await Promise.all([
        apiGet<BankAccountRow[]>("/api/payroll/bank-accounts"),
        apiGet<PayoutRow[]>("/api/payroll/payouts"),
        apiGet<Record<string, unknown>>("/api/soap-config").catch(() => null),
      ]);

      let currentConfig = DEFAULT_SOAP_GATEWAY_CONFIG;
      if (configData && typeof configData === "object") {
        currentConfig = {
          endpointUrl: (configData.endpointUrl as string) ?? "",
          wsdlUrl: (configData.wsdlUrl as string) ?? "",
          serviceName: (configData.serviceName as string) ?? "",
          port: Number(configData.port) || 0,
          securityMode: (configData.securityMode as string) ?? "",
          allowedIPs: Array.isArray(configData.allowedIPs) ? configData.allowedIPs : [],
          status: ((configData.status as any) || "unknown") as "healthy" | "degraded" | "down" | "unknown",
          lastPingTime: (configData.lastPingTime as string) ?? null,
          avgResponseTime: configData.avgResponseTime != null ? String(configData.avgResponseTime) : null,
          certExpiry: (configData.certExpiry as string) ?? "Chưa thiết lập",
          channel: (configData.channel as string) ?? "Gateway",
        };
        setGatewayConfig(currentConfig);
      }

      const mappedPartners = (accounts || []).map((acc) => accountToPartner(acc, currentConfig));
      setPartners(mappedPartners);
      const bankNameByAccount = new Map(
        mappedPartners.map((p) => [p.accountNumber, p.shortName] as const)
      );
      const accountNameByAccount = new Map(
        mappedPartners.map((p) => [p.accountNumber, p.accountName] as const)
      );
      setTransactions((payouts || []).map((r) => payoutToTx(r, bankNameByAccount, accountNameByAccount)));
    } catch (e) {
      setError(e instanceof GatewayError ? e.message : "Lỗi tải dữ liệu ngân hàng");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    let ignore = false;
    Promise.all([
      apiGet<BankAccountRow[]>("/api/payroll/bank-accounts"),
      apiGet<PayoutRow[]>("/api/payroll/payouts"),
      apiGet<Record<string, unknown>>("/api/soap-config").catch(() => null),
    ])
      .then(([accounts, payouts, configData]) => {
        if (!ignore) {
          let currentConfig = DEFAULT_SOAP_GATEWAY_CONFIG;
          if (configData && typeof configData === "object") {
            currentConfig = {
              endpointUrl: (configData.endpointUrl as string) ?? "",
              wsdlUrl: (configData.wsdlUrl as string) ?? "",
              serviceName: (configData.serviceName as string) ?? "",
              port: Number(configData.port) || 0,
              securityMode: (configData.securityMode as string) ?? "",
              allowedIPs: Array.isArray(configData.allowedIPs) ? configData.allowedIPs : [],
              status: ((configData.status as any) || "unknown") as "healthy" | "degraded" | "down" | "unknown",
              lastPingTime: (configData.lastPingTime as string) ?? null,
              avgResponseTime: configData.avgResponseTime != null ? String(configData.avgResponseTime) : null,
              certExpiry: (configData.certExpiry as string) ?? "Chưa thiết lập",
              channel: (configData.channel as string) ?? "Gateway",
            };
            setGatewayConfig(currentConfig);
          }

          const mappedPartners = (accounts || []).map((acc) => accountToPartner(acc, currentConfig));
          setPartners(mappedPartners);
          const bankNameByAccount = new Map(
            mappedPartners.map((p) => [p.accountNumber, p.shortName] as const)
          );
          const accountNameByAccount = new Map(
            mappedPartners.map((p) => [p.accountNumber, p.accountName] as const)
          );
          setTransactions((payouts || []).map((r) => payoutToTx(r, bankNameByAccount, accountNameByAccount)));
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!ignore) {
          setError(e instanceof GatewayError ? e.message : "Lỗi tải dữ liệu ngân hàng");
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [isAdmin]);

  const handleSetPrimary = async (bankId: string) => {
    try {
      await apiPut(`/api/payroll/bank-accounts/${bankId}`, { isPrimary: true });
      setPartners((prev) =>
        prev.map((p) => ({
          ...p,
          isPrimary: p.id === bankId,
        }))
      );
    } catch {
      // ignore
    }
  };

  const handleSavedPartner = (updated: BankPartner) => {
    setPartners((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    fetchData();
  };

  const handleDeletedPartner = (deletedId: string) => {
    setPartners((prev) => prev.filter((p) => p.id !== deletedId));
    fetchData();
  };

  if (!canAccessPath(role, "/dashboard/bank")) {
    return <NoAccessNotice />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tích hợp Ngân hàng & Cổng thanh toán"
        actions={
          <div className="flex items-center gap-2">
            <Button
              key="btn-add-bank" variant="white"
              onClick={() => setCreateAccountOpen(true)}
            >
              <FontAwesomeIcon icon={faPlus} fontSize={11} /> Thêm tài khoản ngân hàng
            </Button>
            <Button
              key="btn-create-payout" onClick={() => setCreateDisburseOpen(true)}
              disabled={partners.length === 0}
            >
              <FontAwesomeIcon icon={faPlus} fontSize={11} /> Tạo lệnh chi lương
            </Button>
          </div>
        }
      />

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
          {error}
        </div>
      )}

      {/* Header Metrics */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 animate-pulse space-y-3">
          <div className="h-4 bg-gray-100 rounded w-1/4" />
          <div className="h-10 bg-gray-100 rounded" />
        </div>
      ) : (
        <>
          <BankHeaderStats
            gatewayConfig={gatewayConfig}
            partners={partners}
            transactions={transactions}
            onTestSoap={() => setTestModalOpen(true)}
          />

          {/* Partner Banks Grid */}
          <BankPartnersList
            partners={partners}
            onSetPrimary={handleSetPrimary}
            onOpenConfig={(p) => setSelectedBankConfig(p)}
          />

          {/* History Transactions Table */}
          <SoapTransactionsTable
            transactions={transactions}
            onViewPayload={(tx) => setSelectedPayloadTx(tx)}
          />
        </>
      )}

      {/* Modals */}
      <SoapTestModal
        open={testModalOpen}
        onClose={() => {
          setTestModalOpen(false);
          fetchData();
        }}
        config={gatewayConfig}
      />

      <SoapPayloadDetailModal
        transaction={selectedPayloadTx}
        onClose={() => setSelectedPayloadTx(null)}
      />

      {createDisburseOpen && (
        <CreatePayrollDisbursementModal
          key="disburse-modal"
          open={createDisburseOpen}
          onClose={() => setCreateDisburseOpen(false)}
          partners={partners}
          onDisburseSuccess={() => fetchData()}
        />
      )}

      {selectedBankConfig && (
        <BankConfigModal
          key={selectedBankConfig.id}
          partner={selectedBankConfig}
          onClose={() => setSelectedBankConfig(null)}
          onSaved={handleSavedPartner}
          onDeleted={handleDeletedPartner}
        />
      )}

      {createAccountOpen && (
        <CreateBankAccountModal
          key="create-account-modal"
          open={createAccountOpen}
          onClose={() => setCreateAccountOpen(false)}
          onCreated={() => fetchData()}
          isFirstAccount={partners.length === 0}
        />
      )}
    </div>
  );
}
