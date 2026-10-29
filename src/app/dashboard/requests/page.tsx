"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGear,
  faTriangleExclamation,
  faCircleCheck,
  faFilter,
  faClock,
  faCheck,
  faXmark,
  faListCheck,
} from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { apiGet, apiPost, GatewayError, GATEWAY_URL } from "@/lib/api";
import type { ShiftRequest, Employee, Branch } from "@/types";
import ShiftRequestSection from "@/features/requests/RequestList";
import AttendanceConfigModal, { type AttendanceConfigState } from "@/features/shifts/AttendanceForm";
import { useCurrentUser } from "@/context/AuthContext";

async function parseEnvelope(res: Response) {
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const err = (body as { error?: { code: string; message: string } } | null)?.error;
    throw new GatewayError(
      err?.code || `HTTP_${res.status}`,
      err?.message || `Lỗi hệ thống (${res.status})`,
      res.status
    );
  }
  if (body !== null && typeof body === "object" && "data" in body) {
    return (body as { data: unknown }).data;
  }
  return body;
}

async function apiPut<T>(path: string, payload?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${GATEWAY_URL}${path}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
      signal: controller.signal,
    });
    return (await parseEnvelope(res)) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function apiDelete<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${GATEWAY_URL}${path}`, {
      method: "DELETE",
      credentials: "include",
      signal: controller.signal,
    });
    return (await parseEnvelope(res)) as T;
  } finally {
    clearTimeout(timer);
  }
}

function mapBackendRequest(r: any, empMap?: Map<string, string>): ShiftRequest {
  const empName =
    (r.employeeId && empMap?.get(r.employeeId)) ||
    r.employee ||
    r.employeeName ||
    r.employeeId ||
    "Nhân sự";

  let type: ShiftRequest["type"] = "đổi ca";
  if (r.type === "leave" || r.type === "nghỉ phép") {
    type = "nghỉ phép";
  } else if (r.type === "work_supplement" || r.type === "bổ sung công") {
    type = "bổ sung công";
  } else if (r.type === "advance" || r.type === "tạm ứng") {
    type = "tạm ứng";
  } else {
    type = "đổi ca";
  }

  let status: ShiftRequest["status"] = "chờ duyệt";
  if (r.status === "approved" || r.status === "đã duyệt") {
    status = "đã duyệt";
  } else if (r.status === "rejected" || r.status === "từ chối") {
    status = "từ chối";
  } else {
    status = "chờ duyệt";
  }

  const createdDate = r.createdAt ? new Date(r.createdAt).toLocaleDateString("vi-VN") : "—";
  const from = r.from || `${createdDate} 08:00`;
  const to = r.to || `${createdDate} 17:30`;

  return {
    id: r.id,
    employee: empName,
    branch: r.branchSlug || r.branch || "HN-1",
    type,
    from,
    to,
    reason: r.content || r.title || r.reason || "Yêu cầu nội bộ cần phê duyệt",
    status,
    createdAt: r.createdAt || createdDate,
  };
}

export default function RequestsPage() {
  const { role, branchSlug, name: currentUserRealName } = useCurrentUser();
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const managerBranch = branchSlug.toUpperCase();

  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [empList, setEmpList] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "danger" } | null>(null);

  // Bộ lọc
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>(isManager ? managerBranch : "all");

  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [attConfig, setAttConfig] = useState<AttendanceConfigState>({
    gracePeriod: "5",
    shiftSwapMode: "manager",
    requireReasonSwap: true,
    allowDoubleCheckin: true,
    latePenaltyPct: "10",
    earlyLeavePenaltyPct: "10",
    earlyCheckinMinutes: "15",
    maxPenaltiesPerMonth: "10 lần",
    deductOnCheckout: true,
    maxCheckinsPerDay: "3 lần",
    maxSwapsPerMonth: "3 lần",
  });

  const showToast = (text: string, tone: "success" | "danger" = "success") => {
    setToast({ text, tone });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const empNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of empList) {
      map.set(e.id, e.name);
    }
    return map;
  }, [empList]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const effectiveBranch = isManager ? managerBranch : (branchFilter === "all" ? "" : branchFilter);
      const queryParams = new URLSearchParams();
      if (effectiveBranch) queryParams.set("branchSlug", effectiveBranch);
      if (statusFilter !== "all") queryParams.set("status", statusFilter);
      if (typeFilter !== "all") queryParams.set("type", typeFilter);

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

      const [requestsRes, employeesRes, configRes, branchesRes] = await Promise.allSettled([
        apiGet<any[]>(`/api/requests${queryString}`),
        apiGet<Employee[]>("/api/employees"),
        apiGet<any>("/api/attendance/config"),
        apiGet<Branch[]>("/api/branches"),
      ]);

      if (branchesRes.status === "fulfilled" && Array.isArray(branchesRes.value)) {
        setBranches(branchesRes.value);
      }

      let employeesData: Employee[] = [];
      if (employeesRes.status === "fulfilled" && Array.isArray(employeesRes.value)) {
        employeesData = employeesRes.value;
      }
      setEmpList(employeesData);

      const currentEmpMap = new Map<string, string>();
      for (const e of employeesData) {
        currentEmpMap.set(e.id, e.name);
      }

      if (requestsRes.status === "fulfilled" && Array.isArray(requestsRes.value)) {
        setRequests(requestsRes.value.map((r) => mapBackendRequest(r, currentEmpMap)));
      }

      if (configRes.status === "fulfilled" && configRes.value) {
        const c = configRes.value;
        setAttConfig((prev) => ({
          ...prev,
          gracePeriod: String(c.gracePeriodMinutes ?? prev.gracePeriod),
          shiftSwapMode: c.shiftSwapMode || prev.shiftSwapMode,
          requireReasonSwap: c.requireReasonSwap ?? prev.requireReasonSwap,
          allowDoubleCheckin: c.allowDoubleCheckin ?? prev.allowDoubleCheckin,
          latePenaltyPct: String(c.latePenaltyPct ?? prev.latePenaltyPct),
          earlyLeavePenaltyPct: String(c.earlyLeavePenaltyPct ?? prev.earlyLeavePenaltyPct),
          earlyCheckinMinutes: String(c.earlyCheckinMinutes ?? prev.earlyCheckinMinutes),
          maxPenaltiesPerMonth: c.maxPenaltiesPerMonth != null ? `${c.maxPenaltiesPerMonth} lần` : prev.maxPenaltiesPerMonth,
          deductOnCheckout: c.deductOnCheckout ?? prev.deductOnCheckout,
          maxCheckinsPerDay: c.maxCheckinsPerDay != null ? `${c.maxCheckinsPerDay} lần` : prev.maxCheckinsPerDay,
          maxSwapsPerMonth: c.maxSwapsPerMonth != null ? `${c.maxSwapsPerMonth} lần` : prev.maxSwapsPerMonth,
        }));
      }
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Không thể tải danh sách yêu cầu từ gateway";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isManager, managerBranch, branchFilter, statusFilter, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Lọc hiển thị theo chi nhánh & trạng thái
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // Chi nhánh
      if (isManager) {
        const match = r.branch.toLowerCase().replace("-", "") === branchSlug.toLowerCase().replace("-", "") || r.branch === "HN-1";
        if (!match) return false;
      } else if (branchFilter !== "all") {
        if (r.branch.toLowerCase().replace("-", "") !== branchFilter.toLowerCase().replace("-", "")) return false;
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

      return true;
    });
  }, [requests, isManager, branchSlug, branchFilter, statusFilter, typeFilter]);

  // Bộ đếm
  const counts = useMemo(() => {
    const list = isManager
      ? requests.filter((r) => r.branch.toLowerCase().replace("-", "") === branchSlug.toLowerCase().replace("-", "") || r.branch === "HN-1")
      : requests;
    return {
      all: list.length,
      pending: list.filter((r) => r.status === "chờ duyệt").length,
      approved: list.filter((r) => r.status === "đã duyệt").length,
      rejected: list.filter((r) => r.status === "từ chối").length,
    };
  }, [requests, isManager, branchSlug]);

  const currentUserName =
    currentUserRealName && currentUserRealName !== "Đang tải..."
      ? `${currentUserRealName} (${isAdmin ? "Admin" : "Quản lý"})`
      : isAdmin
        ? "Quản trị viên"
        : "Quản lý chi nhánh";

  // Duyệt yêu cầu (PUT /api/requests/:id/approve)
  const handleApprove = async (id: string, note?: string) => {
    try {
      setActionInProgress(true);
      await apiPut(`/api/requests/${encodeURIComponent(id)}/approve`, {
        reviewedBy: currentUserName,
        reviewNote: note || "Đã duyệt yêu cầu",
      });
      setRequests((prev) =>
        prev.map((x) => (x.id === id ? { ...x, status: "đã duyệt" as const } : x))
      );
      showToast("Đã phê duyệt yêu cầu thành công! Thông báo tự động đã được gửi.", "success");
      // Tải lại danh sách để đồng bộ trạng thái mới nhất từ backend
      fetchData();
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi phê duyệt yêu cầu";
      showToast(msg, "danger");
    } finally {
      setActionInProgress(false);
    }
  };

  // Từ chối yêu cầu (PUT /api/requests/:id/reject)
  const handleReject = async (id: string, note?: string) => {
    try {
      setActionInProgress(true);
      await apiPut(`/api/requests/${encodeURIComponent(id)}/reject`, {
        reviewedBy: currentUserName,
        reviewNote: note || "Từ chối yêu cầu",
      });
      setRequests((prev) =>
        prev.map((x) => (x.id === id ? { ...x, status: "từ chối" as const } : x))
      );
      showToast("Đã từ chối yêu cầu. Thông báo tự động đã được gửi.", "success");
      fetchData();
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi từ chối yêu cầu";
      showToast(msg, "danger");
    } finally {
      setActionInProgress(false);
    }
  };

  // Lưu cấu hình chấm công khi đóng modal
  const handleCloseAttendanceModal = async () => {
    setAttendanceOpen(false);
    try {
      await apiPut("/api/attendance/config", {
        gracePeriodMinutes: parseInt(attConfig.gracePeriod, 10) || 5,
        shiftSwapMode: attConfig.shiftSwapMode,
        requireReasonSwap: attConfig.requireReasonSwap,
        allowDoubleCheckin: attConfig.allowDoubleCheckin,
        latePenaltyPct: parseInt(attConfig.latePenaltyPct, 10) || 0,
        earlyLeavePenaltyPct: parseInt(attConfig.earlyLeavePenaltyPct, 10) || 0,
        earlyCheckinMinutes: parseInt(attConfig.earlyCheckinMinutes, 10) || 0,
        maxPenaltiesPerMonth: parseInt(attConfig.maxPenaltiesPerMonth, 10) || 0,
        deductOnCheckout: attConfig.deductOnCheckout,
        maxCheckinsPerDay: parseInt(attConfig.maxCheckinsPerDay, 10) || 0,
        maxSwapsPerMonth: parseInt(attConfig.maxSwapsPerMonth, 10) || 0,
      });
      showToast("Đã lưu cấu hình chấm công vào hệ thống", "success");
    } catch {
      // ignore
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
        title={isManager ? "Phê duyệt yêu cầu Chi nhánh Hoàn Kiếm (HN-1)" : "Phê duyệt yêu cầu Toàn hệ thống"}
        breadcrumb={[{ label: "HRM", href: "#" }, { label: "Phê duyệt yêu cầu" }]}
        actions={
          !isManager ? (
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

      {/* Thanh lọc trạng thái, loại yêu cầu & chi nhánh */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Bộ lọc trạng thái */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl border border-gray-200">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              statusFilter === "all" ? "bg-white text-primary shadow-xs" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <FontAwesomeIcon icon={faListCheck} fontSize={14} />
            <span>Tất cả ({counts.all})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              statusFilter === "pending" ? "bg-white text-amber-600 shadow-xs" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <FontAwesomeIcon icon={faClock} fontSize={14} />
            <span>Chờ duyệt ({counts.pending})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("approved")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              statusFilter === "approved" ? "bg-white text-emerald-600 shadow-xs" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <FontAwesomeIcon icon={faCheck} fontSize={14} />
            <span>Đã duyệt ({counts.approved})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("rejected")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              statusFilter === "rejected" ? "bg-white text-red-600 shadow-xs" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <FontAwesomeIcon icon={faXmark} fontSize={14} />
            <span>Từ chối ({counts.rejected})</span>
          </button>
        </div>

        {/* Lọc loại yêu cầu & Chi nhánh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Loại đơn:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs font-medium border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-primary"
            >
              <option value="all">Tất cả loại đơn</option>
              <option value="shift_swap">Đổi ca</option>
              <option value="leave">Nghỉ phép</option>
              <option value="work_supplement">Bổ sung công</option>
              <option value="advance">Tạm ứng</option>
            </select>
          </div>

          {!isManager && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">Chi nhánh:</span>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="text-xs font-medium border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-primary"
              >
                <option value="all">Tất cả chi nhánh</option>
                {branches.map((b) => (
                  <option key={b.id || b.slug} value={b.slug.toUpperCase()}>
                    {b.name} ({b.slug.toUpperCase()})
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
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      <AttendanceConfigModal
        open={attendanceOpen}
        onClose={handleCloseAttendanceModal}
        config={attConfig}
        setConfig={setAttConfig}
      />
    </div>
  );
}
