"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGear,
  faTriangleExclamation,
  faCircleCheck,
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";
import { apiGet, apiPut, GatewayError } from "@/lib/api";
import type { ShiftRequest, Employee, Branch } from "@/types";
import ShiftRequestSection from "@/features/requests/RequestList";
import AttendanceConfigModal, { type AttendanceConfigState } from "@/features/shifts/AttendanceForm";
import { configQuery, mapApiToConfig, mapConfigToApi } from "@/features/shifts/attendanceConfig";
import { useCurrentUser } from "@/context/AuthContext";
import { useLocalStorageState } from "@/hooks/useLocalStorage";
import { formatDate, formatDateTime } from "@/lib/utils";

// BE chỉ trả 4 giá trị enum RequestType (integration-service).
const TYPE_LABELS: Record<string, ShiftRequest["type"]> = {
  leave: "nghỉ phép",
  advance: "tạm ứng",
  shift_swap: "đổi ca",
  work_supplement: "bổ sung công",
};

function mapBackendRequest(r: any, empMap?: Map<string, string>): ShiftRequest {
  const empName = (r.employeeId && empMap?.get(r.employeeId)) || r.employeeId || "—";
  const type: ShiftRequest["type"] = TYPE_LABELS[r.type] ?? "đổi ca";
  const status: ShiftRequest["status"] =
    r.status === "approved" ? "đã duyệt" : r.status === "rejected" ? "từ chối" : "chờ duyệt";

  // BE không có cột from/to: suy từ ngày nghỉ (leaveStartDate/leaveEndDate,
  // YYYY-MM-DD) hoặc giờ đề nghị bổ sung công (requestedCheckIn/Out, ISO).
  let from = "—";
  let to = "—";
  if (r.leaveStartDate || r.leaveEndDate) {
    from = r.leaveStartDate ? formatDate(r.leaveStartDate) : "—";
    to = r.leaveEndDate ? formatDate(r.leaveEndDate) : "—";
  } else if (r.requestedCheckIn || r.requestedCheckOut) {
    from = r.requestedCheckIn ? formatDateTime(r.requestedCheckIn) : "—";
    to = r.requestedCheckOut ? formatDateTime(r.requestedCheckOut) : "—";
  }

  // advanceAmount là chuỗi Decimal (số nguyên VNĐ) do BE serialize.
  const amount =
    r.advanceAmount != null && Number.isFinite(Number(r.advanceAmount))
      ? `${Number(r.advanceAmount).toLocaleString("vi-VN")} ₫`
      : undefined;

  return {
    id: r.id,
    employee: empName,
    branch: r.branchId || "",
    type,
    title: r.title,
    amount,
    from,
    to,
    reason: r.content || r.title || "",
    status,
    shiftSwapMode: r.shiftSwapMode ?? undefined,
    createdAt: r.createdAt ? formatDateTime(r.createdAt) : "—",
    reviewedByName: r.reviewedByName || undefined,
    reviewNote: r.reviewNote || undefined,
    reviewedAt: r.reviewedAt ? formatDateTime(r.reviewedAt) : undefined,
  };
}

export default function RequestsPage() {
  const { role, branchId } = useCurrentUser();
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  // Duyệt/từ chối đơn và cấu hình chấm công là nghiệp vụ quản lý (MANAGERS ở
  // gateway) — nhân viên chỉ xem đơn của mình nên control không được render.
  const canReviewRequests = role !== "staff";
  const managerBranch = branchId;

  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "danger" } | null>(null);

  // Bộ lọc
  const [statusFilter, setStatusFilter] = useLocalStorageState<"all" | "pending" | "approved" | "rejected">(
    "hrm_requests_status_filter",
    "all"
  );
  const [typeFilter, setTypeFilter] = useLocalStorageState<string>("hrm_requests_type_filter", "all");
  const [savedBranchFilter, setSavedBranchFilter] = useLocalStorageState<string>("hrm_requests_branch_filter_by_id", "all");
  const [searchQuery, setSearchQuery] = useLocalStorageState<string>("hrm_requests_search", "");
  // Chỉ admin được chọn chi nhánh; manager và staff bị ghim chi nhánh của token
  // nên không gửi branchId do người dùng chọn (gateway đã suy ra từ token).
  const branchFilter = isAdmin ? savedBranchFilter : managerBranch;
  const setBranchFilter = useCallback(
    (b: string) => {
      if (isAdmin) setSavedBranchFilter(b);
    },
    [isAdmin, setSavedBranchFilter]
  );

  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [attConfigSaving, setAttConfigSaving] = useState(false);
  const [attConfig, setAttConfig] = useState<AttendanceConfigState>({
    gracePeriod: "5",
    shiftSwapMode: "manager_approval",
    requireReasonSwap: true,
    allowDoubleCheckin: true,
    latePenaltyPct: "10",
    earlyLeavePenaltyPct: "10",
    earlyCheckinMinutes: "15",
    checkoutWindowMinutes: "60",
    doubleCheckinEarlyMinutes: "0",
    doubleCheckinLateMinutes: "0",
  });
  // Admin chọn cấu hình mặc định hệ thống ("") hoặc theo chi nhánh; manager bị ghim chi nhánh mình.
  const [attBranch, setAttBranch] = useState("");
  const effectiveAttBranch = isManager ? managerBranch || "" : attBranch;

  const fetchAttConfig = useCallback(async () => {
    try {
      const c = await apiGet<any>(`/api/attendance/config${configQuery(effectiveAttBranch)}`);
      if (c) setAttConfig((prev) => mapApiToConfig(c, prev));
    } catch {
      // Không đọc được cấu hình thì giữ giá trị mặc định của form.
    }
  }, [effectiveAttBranch]);

  useEffect(() => {
    void fetchAttConfig();
  }, [fetchAttConfig]);

  const showToast = (text: string, tone: "success" | "danger" = "success") => {
    setToast({ text, tone });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const effectiveBranch = branchFilter === "all" ? "" : branchFilter;
      const queryParams = new URLSearchParams();
      if (effectiveBranch) queryParams.set("branchId", effectiveBranch);
      // Không lọc status/type ở server: mảng trả về phải chứa đủ đơn để badge
      // đếm đúng (trước đây server lọc trước nên badge "Đã duyệt" luôn 0).
      // Việc lọc hiển thị vẫn thực hiện ở client (filteredRequests).

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

      const [requestsRes, employeesRes, branchesRes] = await Promise.allSettled([
        apiGet<any[]>(`/api/requests${queryString}`),
        apiGet<Employee[]>("/api/employees"),
        apiGet<Branch[]>("/api/branches"),
      ]);

      if (branchesRes.status === "fulfilled" && Array.isArray(branchesRes.value)) {
        setBranches(branchesRes.value);
      }

      let employeesData: Employee[] = [];
      if (employeesRes.status === "fulfilled" && Array.isArray(employeesRes.value)) {
        employeesData = employeesRes.value;
      }

      const currentEmpMap = new Map<string, string>();
      for (const e of employeesData) {
        currentEmpMap.set(e.id, e.name);
      }

      if (requestsRes.status === "fulfilled" && Array.isArray(requestsRes.value)) {
        setRequests(requestsRes.value.map((r) => mapBackendRequest(r, currentEmpMap)));
      } else if (requestsRes.status === "rejected") {
        // Lỗi mạng/403 không được hiển thị như "không có yêu cầu nào".
        setError(
          requestsRes.reason instanceof GatewayError
            ? requestsRes.reason.message
            : "Không thể tải danh sách yêu cầu từ gateway"
        );
      }
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Không thể tải danh sách yêu cầu từ gateway";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [branchFilter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Lọc hiển thị theo chi nhánh & trạng thái
  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests.filter((r) => {
      // Chi nhánh (manager không xác định được chi nhánh trong token -> xem toàn công ty)
      if (isManager) {
        if (branchId) {
          const match = r.branch === branchId;
          if (!match) return false;
        }
      } else if (branchFilter !== "all") {
        if (r.branch !== branchFilter) return false;
      }

      // Trạng thái
      if (statusFilter === "pending" && r.status !== "chờ duyệt") return false;
      if (statusFilter === "approved" && r.status !== "đã duyệt") return false;
      if (statusFilter === "rejected" && r.status !== "từ chối") return false;

      // Loại yêu cầu
      if (typeFilter === "leave" && r.type !== "nghỉ phép") return false;
      if (typeFilter === "shift_swap" && r.type !== "đổi ca") return false;
      if (typeFilter === "work_supplement" && r.type !== "bổ sung công") return false;
      if (typeFilter === "advance" && r.type !== "tạm ứng") return false;

      // Tìm kiếm tự do trên các trường hiển thị ở bảng
      if (q) {
        const haystack = [r.employee, r.branch, r.type, r.title, r.reason, r.from, r.to, r.status, r.amount]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [requests, isManager, branchId, branchFilter, statusFilter, typeFilter, searchQuery]);

  // Bộ đếm
  const counts = useMemo(() => {
    const list =
      isManager && branchId
        ? requests.filter(
            (r) => r.branch === branchId
          )
        : requests;
    return {
      all: list.length,
      pending: list.filter((r) => r.status === "chờ duyệt").length,
      approved: list.filter((r) => r.status === "đã duyệt").length,
      rejected: list.filter((r) => r.status === "từ chối").length,
    };
  }, [requests, isManager, branchId]);

  // Duyệt yêu cầu (PUT /api/requests/:id/approve)
  const handleApprove = async (id: string) => {
    try {
      await apiPut(`/api/requests/${encodeURIComponent(id)}/approve`, {
        reviewNote: "Đã duyệt yêu cầu",
      });
      showToast("Đã phê duyệt yêu cầu thành công! Thông báo tự động đã được gửi.", "success");
      fetchData();
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi phê duyệt yêu cầu";
      showToast(msg, "danger");
    }
  };

  // Từ chối yêu cầu (PUT /api/requests/:id/reject)
  const handleReject = async (id: string) => {
    try {
      await apiPut(`/api/requests/${encodeURIComponent(id)}/reject`, {
        reviewNote: "Từ chối yêu cầu",
      });
      showToast("Đã từ chối yêu cầu. Thông báo tự động đã được gửi.", "success");
      fetchData();
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi từ chối yêu cầu";
      showToast(msg, "danger");
    }
  };

  // Lưu cấu hình chấm công vào backend DB
  const handleSaveAttendanceConfig = async () => {
    try {
      setAttConfigSaving(true);
      await apiPut(`/api/attendance/config${configQuery(effectiveAttBranch)}`, mapConfigToApi(attConfig));
      showToast("Đã lưu cấu hình chấm công vào hệ thống", "success");
      setAttendanceOpen(false);
    } catch (e: any) {
      showToast(e?.message || "Lưu cấu hình thất bại", "danger");
    } finally {
      setAttConfigSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast thông báo nổi */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all ${
            toast.tone === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <FontAwesomeIcon
            icon={toast.tone === "success" ? faCircleCheck : faTriangleExclamation}
            className="text-base"
          />
          <span>{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      <PageHeader
        breadcrumb={[{ label: "HRM", href: "#" }, { label: "Phê duyệt yêu cầu" }]}
        actions={
          canReviewRequests ? (
            <div className="flex items-center gap-2">
              <Button variant="white" onClick={() => setAttendanceOpen(true)}>
                <FontAwesomeIcon icon={faGear} fontSize={16} /> Cấu hình chấm công
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Hiển thị lỗi tải nếu có */}
      {error && !loading && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50/80 flex items-center justify-between text-sm text-red-700">
          <div className="flex items-center gap-2.5">
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500 text-base" />
            <span>{error}</span>
          </div>
          <Button variant="white" size="sm" onClick={fetchData}>
            Thử lại
          </Button>
        </div>
      )}

      {/* Thanh tìm kiếm & bộ lọc: trạng thái, loại yêu cầu, chi nhánh */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          {/* Tìm kiếm tự do, khớp cách làm ở danh sách Phòng ban & Chi nhánh */}
          <div className="relative w-64 min-w-0">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              fontSize={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <Input
              placeholder="Tìm theo nhân viên, lý do, thời gian..."
              className="pl-8 pr-7 py-1.5 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                title="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>
          {/* Bộ lọc trạng thái (gộp từ 4 tab Tất cả/Chờ duyệt/Đã duyệt/Từ chối) */}
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | "pending" | "approved" | "rejected")
              }
              className="min-w-0 max-w-full text-xs font-medium border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-primary"
            >
              <option value="all">Tất cả trạng thái ({counts.all})</option>
              <option value="pending">Chờ duyệt ({counts.pending})</option>
              <option value="approved">Đã duyệt ({counts.approved})</option>
              <option value="rejected">Từ chối ({counts.rejected})</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="min-w-0 max-w-full text-xs font-medium border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-primary"
            >
              <option value="all">Tất cả loại đơn</option>
              <option value="shift_swap">Đổi ca</option>
              <option value="leave">Nghỉ phép</option>
              <option value="work_supplement">Bổ sung công</option>
              <option value="advance">Tạm ứng</option>
            </select>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="min-w-0 max-w-full text-xs font-medium border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-primary"
              >
                <option value="all">Tất cả chi nhánh</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.branchCode || b.id})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="h-6 w-52 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 bg-gray-100/80 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <ShiftRequestSection
          requests={filteredRequests}
          onApprove={canReviewRequests ? handleApprove : undefined}
          onReject={canReviewRequests ? handleReject : undefined}
          canReviewPeerAcceptedSwap={isAdmin}
          branchLabel={(branchId) =>
            branches.find((b) => b.id === branchId)?.name || branchId || "—"
          }
          emptyMessage={
            searchQuery.trim()
              ? `Không tìm thấy yêu cầu phù hợp với "${searchQuery.trim()}"`
              : "Không có yêu cầu nào"
          }
        />
      )}

      <AttendanceConfigModal
        open={attendanceOpen}
        onClose={() => setAttendanceOpen(false)}
        onSave={handleSaveAttendanceConfig}
        saving={attConfigSaving}
        config={attConfig}
        setConfig={setAttConfig}
        configBranchId={effectiveAttBranch}
        onConfigBranchChange={setAttBranch}
        configBranchLocked={isManager}
        branchOptions={isManager ? branches.filter((b) => b.id === branchId) : branches}
      />
    </div>
  );
}
