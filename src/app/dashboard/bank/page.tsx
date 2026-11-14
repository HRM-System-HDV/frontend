"use client";

import { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faGear,
} from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import BankHeaderStats from "@/features/bank/BankStats";
import BankPartnersList from "@/features/bank/BankPartners";
import SoapTransactionsTable from "@/features/bank/SoapHistory";
import SoapConfigForm from "@/features/bank/SoapConfigForm";
import SoapTestModal from "@/features/bank/SoapTest";
import SoapPayloadDetailModal from "@/features/bank/PayloadDetail";
import CreatePayrollDisbursementModal from "@/features/bank/PayoutCreate";
import BankConfigModal, { CreateBankAccountModal } from "@/features/bank/BankForm";
import { DEFAULT_SOAP_GATEWAY_CONFIG } from "@/features/bank/constants";
import type { BankPartner, SoapTransaction, SoapGatewayConfig } from "@/features/bank/types";
import type { Branch } from "@/types";
import { apiGet, apiPost, apiPut, GatewayError } from "@/lib/api";
import { useCurrentUser } from "@/context/AuthContext";
import { canAccessPath, NoAccessNotice } from "@/lib/permissions";

// Khớp dòng bank_accounts của payroll-service: balance là Decimal(15,0)
// (JSON serialize thành chuỗi), branchId trỏ branches.id của organization.
interface BankAccountRow {
  id: string;
  accountNumber: string;
  accountName?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  branchId?: string | null;
  balance: string | number;
  isPrimary?: boolean;
}

// Khớp dòng payouts: khóa nợ là debitAccountId/debitAccountNumber, không có `debitAccount`.
interface PayoutRow {
  id: string;
  bankReference: string;
  debitAccountNumber?: string | null;
  totalAmount: string | number;
  content?: string | null;
  beneficiaryCount: number;
  status: string;
  createdAt: string;
}

function parseSoapConfig(configData: Record<string, unknown> | null): SoapGatewayConfig {
  if (!configData || typeof configData !== "object") return DEFAULT_SOAP_GATEWAY_CONFIG;
  return {
    endpointUrl: (configData.endpointUrl as string) ?? "",
    wsdlUrl: (configData.wsdlUrl as string) ?? "",
    serviceName: (configData.serviceName as string) ?? "",
    securityMode: (configData.securityMode as string) ?? "",
    status: ((configData.status as string) || "unknown") as SoapGatewayConfig["status"],
    lastPingTime: (configData.lastPingTime as string) ?? null,
    avgResponseTime: configData.avgResponseTime != null ? String(configData.avgResponseTime) : null,
    certExpiry: (configData.certExpiry as string) ?? "Chưa thiết lập",
  };
}

function accountToPartner(
  row: BankAccountRow,
  gatewayConfig: SoapGatewayConfig,
  branchNames: Map<string, string>
): BankPartner {
  const displayName = row.bankName || row.accountName || `Tài khoản ${row.accountNumber}`;
  const shortName = row.bankName || displayName.split(" ").slice(0, 2).join(" ");
  return {
    id: row.id,
    name: displayName,
    shortName,
    accountNumber: row.accountNumber,
    accountName: row.accountName || displayName,
    branchId: row.branchId ?? null,
    branch: row.branchId ? branchNames.get(row.branchId) || row.branchId : "Chưa gán chi nhánh",
    bankBranch: row.bankBranch || "",
    balance: Number(row.balance) || 0,
    isPrimary: row.isPrimary === true,
    certExpiry: gatewayConfig.certExpiry || "Chưa thiết lập",
    connectionStatus: gatewayConfig.status === "healthy" ? "connected" : "disconnected",
  };
}

function payoutToTx(row: PayoutRow, partners: BankPartner[]): SoapTransaction {
  const accountNumber = row.debitAccountNumber || "—";
  const match = partners.find((p) => p.accountNumber === accountNumber);
  return {
    id: row.id,
    batchName: row.content || "Lệnh chi lương",
    bankName: match?.shortName || accountNumber,
    accountNumber,
    accountName: match?.accountName,
    totalEmployees: row.beneficiaryCount,
    totalAmount: Number(row.totalAmount) || 0,
    status: row.status === "success" ? "success" : row.status === "failed" ? "failed" : "processing",
    createdAt: row.createdAt,
    completedAt: row.createdAt,
    bankReference: row.bankReference,
    soapAction: "CreatePayout (REST)",
    xmlPayload: `REST POST /api/payroll/payouts\npayslipIds theo lệnh chi ${row.bankReference}`,
    xmlResponse: `transactionId=${row.id}\nbankReference=${row.bankReference}`,
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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [gatewayConfig, setGatewayConfig] = useState<SoapGatewayConfig>(DEFAULT_SOAP_GATEWAY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [soapConfigOpen, setSoapConfigOpen] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [pingMessage, setPingMessage] = useState<string | null>(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [createDisburseOpen, setCreateDisburseOpen] = useState(false);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [selectedPayloadTx, setSelectedPayloadTx] =
    useState<SoapTransaction | null>(null);
  const [selectedBankConfig, setSelectedBankConfig] =
    useState<BankPartner | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [accounts, payouts, branchRows, configData] = await Promise.all([
        apiGet<BankAccountRow[]>("/api/payroll/bank-accounts"),
        apiGet<PayoutRow[]>("/api/payroll/payouts"),
        apiGet<Branch[]>("/api/branches"),
        apiGet<Record<string, unknown>>("/api/soap-config").catch(() => null),
      ]);

      setError(null);
      const currentConfig = parseSoapConfig(configData);
      setGatewayConfig(currentConfig);
      const branchList = Array.isArray(branchRows) ? branchRows : [];
      setBranches(branchList);
      const branchNames = new Map(branchList.map((b) => [b.id, b.name] as const));
      const mappedPartners = (accounts || []).map((acc) => accountToPartner(acc, currentConfig, branchNames));
      setPartners(mappedPartners);
      setTransactions((payouts || []).map((r) => payoutToTx(r, mappedPartners)));
    } catch (e) {
      setError(e instanceof GatewayError ? e.message : "Lỗi tải dữ liệu ngân hàng");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Vai trò khác admin đã bị NoAccessNotice chặn ở return dưới đây,
    // nên chỉ cần tải dữ liệu khi là admin.
    if (!isAdmin) return;
    let active = true;
    void Promise.resolve().then(() => { if (active) return fetchData(); });
    return () => { active = false; };
  }, [isAdmin, fetchData]);

  const handlePing = async () => {
    if (pinging) return;
    setPinging(true);
    setError(null);
    setPingMessage(null);
    try {
      const result = parseSoapConfig(await apiPost<Record<string, unknown>>("/api/soap-config/ping", {}));
      setGatewayConfig(result);
      setPartners((rows) => rows.map((partner) => ({ ...partner, connectionStatus: result.status === "healthy" ? "connected" : "disconnected" })));
      setPingMessage(result.status === "healthy" ? "Kiểm tra kết nối thành công." : result.status === "degraded" ? "Dịch vụ đã phản hồi nhưng trả lỗi." : "Không kết nối được dịch vụ SOAP.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không kiểm tra được kết nối SOAP");
    } finally {
      setPinging(false);
    }
  };

  const handleSetPrimary = async (bankId: string) => {
    try {
      await apiPut(`/api/payroll/bank-accounts/${encodeURIComponent(bankId)}`, { isPrimary: true });
      await fetchData();
    } catch (e) {
      setError(e instanceof GatewayError ? e.message : "Không đổi được tài khoản chính");
    }
  };

  // Nguồn trạng thái thật là BE nên mọi thao tác ghi xong tải lại, không cập nhật cục bộ.
  const handleSavedPartner = () => {
    void fetchData();
  };

  const handleDeletedPartner = () => {
    void fetchData();
  };

  if (!canAccessPath(role, "/dashboard/bank")) {
    return <NoAccessNotice />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tích hợp Ngân hàng & Cổng thanh toán"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="white" disabled={loading || pinging} onClick={() => setSoapConfigOpen(true)}>
              <FontAwesomeIcon icon={faGear} fontSize={11} /> Cấu hình SOAP
            </Button>
            <Button variant="white" onClick={() => setTestModalOpen(true)}>Gửi lệnh SOAP</Button>
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

      {pingMessage && <div role="status" className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">{pingMessage}</div>}
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
            onTestSoap={handlePing}
            pinging={pinging}
          />

          {/* Partner Banks Grid */}
          <BankPartnersList
            partners={partners}
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
      {soapConfigOpen && <SoapConfigForm config={gatewayConfig} onClose={() => setSoapConfigOpen(false)} onSaved={() => {
        setSoapConfigOpen(false);
        setPingMessage(null);
        void fetchData();
      }} />}
      <SoapTestModal
        open={testModalOpen}
        onClose={() => {
          setTestModalOpen(false);
          void fetchData();
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
          branches={branches}
          onClose={() => setSelectedBankConfig(null)}
          onSaved={handleSavedPartner}
          onDeleted={handleDeletedPartner}
          onSetPrimary={handleSetPrimary}
        />
      )}

      {createAccountOpen && (
        <CreateBankAccountModal
          key="create-account-modal"
          open={createAccountOpen}
          branches={branches}
          onClose={() => setCreateAccountOpen(false)}
          onCreated={() => fetchData()}
          isFirstAccount={partners.length === 0}
        />
      )}
    </div>
  );
}
