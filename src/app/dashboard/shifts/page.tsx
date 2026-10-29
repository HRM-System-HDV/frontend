"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDay,
  faCalendarWeek,
  faGear,
  faTriangleExclamation,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { apiGet, apiPost, GatewayError, GATEWAY_URL } from "@/lib/api";
import type { Employee, Branch } from "@/types";
import type { ShiftTemplate, WorkShift, WeeklyRegistration } from "@/features/shifts/types";
import ShiftTemplateSection from "@/features/shifts/ShiftTemplates";
import WorkShiftSection from "@/features/shifts/ShiftList";
import GeneralScheduleSection from "@/features/shifts/ScheduleOverview";
import RegistrationTimetableSection from "@/features/shifts/RegTimetable";
import TemplateModal from "@/features/shifts/TemplateForm";
import AssignShiftModal from "@/features/shifts/ShiftAssign";
import ExportModal from "@/features/shifts/ShiftExport";
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

function mapBackendShiftToWorkShift(s: any, empMap?: Map<string, string>): WorkShift {
  const empName =
    (s.employeeId && empMap?.get(s.employeeId)) ||
    s.employee ||
    s.employeeName ||
    s.employeeId ||
    "Chưa phân công";

  let status: WorkShift["status"] = "Chưa làm";
  if (s.status === "Đúng giờ" || s.status === "hoàn thành" || s.status === "completed") {
    status = "Đúng giờ";
  } else if (s.status === "Trễ" || s.status === "late") {
    status = "Trễ";
  } else if (s.status === "Về sớm" || s.status === "early_leave") {
    status = "Về sớm";
  } else {
    status = "Chưa làm";
  }

  const scheduled =
    s.scheduled ||
    (s.scheduledStart && s.scheduledEnd ? `${s.scheduledStart}-${s.scheduledEnd}` : "07:00-14:00");

  return {
    id: s.id,
    employee: empName,
    branch: s.branchSlug || s.branch || "—",
    date: s.date || "—",
    templateName: s.template || s.templateName || "Ca Sáng",
    scheduled,
    checkIn: s.checkIn || "—",
    checkOut: s.checkOut || "—",
    status,
    note: s.note || "",
    isRecurring: s.isRecurring !== undefined ? Boolean(s.isRecurring) : true,
  };
}

function mapBackendRegistration(r: any, empMap?: Map<string, string>): WeeklyRegistration {
  const empName =
    (r.employeeId && empMap?.get(r.employeeId)) ||
    r.employeeName ||
    r.employeeId ||
    "Nhân sự";

  const defaultDays: Record<string, string> = {
    "T2": "Ca Sáng",
    "T3": "Ca Sáng",
    "T4": "Ca Chiều",
    "T5": "Nghỉ",
    "T6": "Ca Sáng",
    "T7": "Ca Chiều",
    "CN": "Nghỉ",
  };

  return {
    id: r.id || `reg-${Date.now()}`,
    employeeName: empName,
    role: r.role || "Nhân viên",
    branch: r.branchSlug || r.branch || "—",
    requestedCount: r.requestedCount || (r.days ? Object.values(r.days).filter((v) => v !== "Nghỉ").length : 5),
    registeredAt: r.registeredAt || (r.createdAt ? new Date(r.createdAt).toLocaleDateString("vi-VN") : "—"),
    order: r.order || 1,
    days: r.days || defaultDays,
    note: r.note || r.wish || "",
  };
}

export default function ShiftsPage() {
  const { role, branchSlug } = useCurrentUser();
  const isManager = role === "manager";
  const managerBranch = branchSlug.toUpperCase();
  const [activeTab, setActiveTab] = useState<"scheduling" | "general_schedule" | "templates">("scheduling");

  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  // Khung ca mẫu chưa có API backend -> giữ local state (xử lý sau).
  // Ca làm việc & nguyện vọng: khởi rỗng, chỉ nhận từ API; DB rỗng -> empty state.
  const [workShiftList, setWorkShiftList] = useState<WorkShift[]>([]);
  const [weeklyRegistrations, setWeeklyRegistrations] = useState<WeeklyRegistration[]>([]);
  const [empList, setEmpList] = useState<Employee[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "danger" } | null>(null);

  // Bộ chọn ngày & chi nhánh cho khối Xếp ca (mặc định hôm nay)
  const todayStr = (() => {
    const n = new Date();
    return `${String(n.getDate()).padStart(2, "0")}/${String(n.getMonth() + 1).padStart(2, "0")}/${n.getFullYear()}`;
  })();
  const [schedulerDate, setSchedulerDate] = useState(todayStr);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [assignEmployee, setAssignEmployee] = useState("");
  const [assignBranch, setAssignBranch] = useState("");
  const [assignDate, setAssignDate] = useState(todayStr);
  const [assignTemplateId, setAssignTemplateId] = useState("");
  const [assignNote, setAssignNote] = useState("");
  const [assignIsRecurring, setAssignIsRecurring] = useState(true);

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

      // Admin/staff xem toàn chi nhánh (không lọc); manager chỉ xem chi nhánh phụ trách.
      const effectiveBranch = isManager ? managerBranch : "";
      const queryParams = new URLSearchParams();
      if (effectiveBranch) queryParams.set("branchSlug", effectiveBranch);

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

      const [shiftsRes, regRes, employeesRes, templatesRes, branchesRes] = await Promise.allSettled([
        apiGet<any[]>(`/api/shifts${queryString}`),
        apiGet<any[]>(`/api/shifts/registrations${queryString}`),
        apiGet<Employee[]>("/api/employees"),
        apiGet<any[]>(`/api/shift-templates`),
        apiGet<Branch[]>("/api/branches"),
      ]);
      if (branchesRes.status === "fulfilled" && Array.isArray(branchesRes.value)) {
        setBranches(branchesRes.value);
      }

      let employeesData: Employee[] = [];
      if (employeesRes.status === "fulfilled" && Array.isArray(employeesRes.value)) {
        employeesData = employeesRes.value;
      }
      // Luôn đồng bộ (kể cả mảng rỗng) để hiện empty state thật thay vì mock.
      setEmpList(employeesData);

      const currentEmpMap = new Map<string, string>();
      for (const e of employeesData) {
        currentEmpMap.set(e.id, e.name);
      }

      if (templatesRes.status === "fulfilled" && Array.isArray(templatesRes.value)) {
        setTemplates(templatesRes.value);
      }

      if (shiftsRes.status === "fulfilled" && Array.isArray(shiftsRes.value)) {
        setWorkShiftList(shiftsRes.value.map((s) => mapBackendShiftToWorkShift(s, currentEmpMap)));
      }

      if (regRes.status === "fulfilled" && Array.isArray(regRes.value)) {
        setWeeklyRegistrations(regRes.value.map((r) => mapBackendRegistration(r, currentEmpMap)));
      }
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Không thể tải dữ liệu ca làm việc từ gateway";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isManager, managerBranch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Tự chọn nhân viên đầu tiên khi danh sách API về
  useEffect(() => {
    if (!assignEmployee && empList.length > 0) {
      setAssignEmployee(empList[0].name);
    }
  }, [empList, assignEmployee]);

  // Reset assignBranch nếu bị giữ lệnh chi nhánh không còn tồn tại trong DB.
  // assignBranch rỗng = "chọn chi nhánh khi phân công", không tự gán.
  const validBranchSlugs = useMemo(
    () => new Set(branches.map((b) => b.slug.toUpperCase())),
    [branches]
  );
  useEffect(() => {
    if (branches.length === 0) return;
    const firstSlug = branches[0].slug.toUpperCase();
    if (!isManager && assignBranch && !validBranchSlugs.has(assignBranch.toUpperCase())) {
      setAssignBranch(firstSlug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches, isManager, validBranchSlugs]);

  // Mặc định khung ca đầu tiên cho modal phân ca
  useEffect(() => {
    if (!assignTemplateId && templates.length > 0) {
      setAssignTemplateId(templates[0].id);
    }
  }, [templates, assignTemplateId]);

  // Manager chỉ thấy dữ liệu chi nhánh mình
  const displayedWorkShifts = isManager
    ? workShiftList.filter((s) => s.branch.toLowerCase().replace("-", "") === branchSlug.replace("-", ""))
    : workShiftList;
  const displayedRegistrations = isManager
    ? weeklyRegistrations.filter((r) => r.branch.toLowerCase().replace("-", "") === branchSlug.replace("-", ""))
    : weeklyRegistrations;

  const [exportOpen, setExportOpen] = useState(false);
  const [addTemplateOpen, setAddTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);
  const [assignShiftOpen, setAssignShiftOpen] = useState(false);

  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateStart, setNewTemplateStart] = useState("07:00");
  const [newTemplateEnd, setNewTemplateEnd] = useState("14:00");

  const openAddTemplate = () => {
    setEditingTemplate(null);
    setNewTemplateName("");
    setNewTemplateStart("07:00");
    setNewTemplateEnd("14:00");
    setAddTemplateOpen(true);
  };

  const openEditTemplate = (t: ShiftTemplate) => {
    setEditingTemplate(t);
    setNewTemplateName(t.name);
    setNewTemplateStart(t.startTime);
    setNewTemplateEnd(t.endTime);
    setAddTemplateOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName) return;
    try {
      setActionInProgress(true);
      if (editingTemplate) {
        const updated = await apiPut<any>(`/api/shift-templates/${encodeURIComponent(editingTemplate.id)}`, {
          name: newTemplateName,
          startTime: newTemplateStart,
          endTime: newTemplateEnd,
        });
        const row = updated && typeof updated === "object" && "data" in updated ? (updated as any).data : updated;
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === editingTemplate.id
              ? { ...t, name: row?.name ?? newTemplateName, startTime: row?.startTime ?? newTemplateStart, endTime: row?.endTime ?? newTemplateEnd }
              : t
          )
        );
        showToast(`Đã cập nhật khung ca "${newTemplateName}"`, "success");
      } else {
        const created: any = await apiPost<any>(`/api/shift-templates`, {
          name: newTemplateName,
          startTime: newTemplateStart,
          endTime: newTemplateEnd,
        });
        const row = created && typeof created === "object" && "data" in created ? created.data : created;
        setTemplates((prev) => [...prev, { id: row?.id ?? `st-${Date.now()}`, name: row?.name ?? newTemplateName, startTime: row?.startTime ?? newTemplateStart, endTime: row?.endTime ?? newTemplateEnd }]);
        showToast(`Đã thêm khung ca "${newTemplateName}"`, "success");
      }
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi lưu khung ca mẫu";
      showToast(msg, "danger");
    } finally {
      setActionInProgress(false);
    }
    setAddTemplateOpen(false);
    setEditingTemplate(null);
    setNewTemplateName("");
  };

  // Xóa phân công ca (DELETE /api/shifts/:id)
  const handleRemoveShift = async (workShiftId: string) => {
    try {
      setActionInProgress(true);
      await apiDelete(`/api/shifts/${encodeURIComponent(workShiftId)}`);
      setWorkShiftList((prev) => prev.filter((s) => s.id !== workShiftId));
      showToast("Đã xóa phân công ca làm việc", "success");
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi xóa ca làm việc";
      showToast(msg, "danger");
    } finally {
      setActionInProgress(false);
    }
  };

  // Cập nhật phân công ca (PUT /api/shifts/:id)
  const handleUpdateShift = async (shiftId: string, payload: Partial<WorkShift>) => {
    try {
      setActionInProgress(true);
      await apiPut(`/api/shifts/${encodeURIComponent(shiftId)}`, payload);
      setWorkShiftList((prev) =>
        prev.map((s) => (s.id === shiftId ? { ...s, ...payload } : s))
      );
      showToast("Đã cập nhật ca làm việc", "success");
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi cập nhật ca";
      showToast(msg, "danger");
    } finally {
      setActionInProgress(false);
    }
  };

  // Phân công ca trực tiếp cho nhân sự (POST /api/shifts/:id/assign)
  const handleAssignEmployeeToShift = async (shiftId: string, employeeId: string) => {
    try {
      setActionInProgress(true);
      await apiPost(`/api/shifts/${encodeURIComponent(shiftId)}/assign`, { employeeId });
      await fetchData();
      showToast("Đã phân công nhân sự vào ca thành công", "success");
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi phân công nhân sự";
      showToast(msg, "danger");
    } finally {
      setActionInProgress(false);
    }
  };


  // Tạo & phân ca mới (POST /api/shifts)
  const handleAssignShift = async () => {
    if (!assignBranch) {
      showToast("Vui lòng chọn chi nhánh cho ca làm việc", "danger");
      return;
    }
    const template = templates.find((t) => t.id === assignTemplateId) || templates[0];
    const matchedEmp = empList.find((e) => e.name === assignEmployee);
    const payload = {
      employeeId: matchedEmp?.id || assignEmployee,
      branchSlug: assignBranch,
      date: assignDate,
      template: template.name,
      scheduledStart: template.startTime,
      scheduledEnd: template.endTime,
      status: "Chưa làm",
      note: assignNote,
      isRecurring: assignIsRecurring,
    };

    try {
      setActionInProgress(true);
      const res = await apiPost<any>("/api/shifts", payload);
      const createdShift = res && typeof res === "object" && "data" in res ? res.data : res;
      const mapped = mapBackendShiftToWorkShift(createdShift || { id: `ws-${Date.now()}`, ...payload }, empNameMap);
      setWorkShiftList((prev) => [mapped, ...prev]);
      showToast(`Đã phân công thành công cho "${assignEmployee}" (${template.name})`, "success");
      setAssignShiftOpen(false);
      setAssignNote("");
      setAssignIsRecurring(true);
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi phân công ca làm việc";
      showToast(msg, "danger");
    } finally {
      setActionInProgress(false);
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
        title={isManager ? "Lịch làm việc & Phân ca Chi nhánh" : "Quản lý Lịch ca & Xếp ca Doanh nghiệp"}
        breadcrumb={[{ label: "HRM", href: "#" }, { label: "Lịch ca" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="white" size="sm" onClick={() => setExportOpen(true)}>
              Xuất báo cáo
            </Button>
            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => setActiveTab("scheduling")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  activeTab === "scheduling"
                    ? "bg-white text-primary shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <FontAwesomeIcon icon={faCalendarWeek} fontSize={15} />
                <span>Quản lý đăng ký ca</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("general_schedule")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  activeTab === "general_schedule"
                    ? "bg-white text-primary shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <FontAwesomeIcon icon={faCalendarDay} fontSize={15} />
                <span>Lịch làm việc chung</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("templates")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  activeTab === "templates"
                    ? "bg-white text-primary shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <FontAwesomeIcon icon={faGear} fontSize={15} />
                <span>Cấu hình ca mẫu</span>
              </button>
            </div>
          </div>
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

      {/* Loading Skeleton */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-9 w-64 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-100/80 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Tab 1: Lịch làm việc chung toàn chi nhánh */}
          {activeTab === "general_schedule" && (
            <GeneralScheduleSection
              workShifts={displayedWorkShifts}
              templates={templates}
              defaultBranch="all"
              isManager={isManager}
              managerBranch={managerBranch}
              onOpenAssignModal={(templateId, date, branch) => {
                // "all" = admin đang xem toàn chi nhánh -> mở khóa để chọn chi nhánh trong modal;
                // lọc cụ thể 1 chi nhánh -> khóa cứng luôn chi nhánh đó.
                const effectiveBranch = isManager ? managerBranch : (branch === "all" ? "" : branch);
                setAssignTemplateId(templateId);
                setAssignDate(date);
                setAssignBranch(effectiveBranch);
                setAssignIsRecurring(true);
                setAssignShiftOpen(true);
              }}
            />
          )}

          {/* Tab 2: Quản lý đăng ký ca */}
          {activeTab === "scheduling" && (
            <div className="flex flex-col gap-6">
              <RegistrationTimetableSection
                registrations={displayedRegistrations}
                templates={templates}
                defaultBranch="all"
                isManager={isManager}
                managerBranch={managerBranch}
              />

              {/* Bảng danh sách chi tiết phân công */}
              <WorkShiftSection
                workShifts={displayedWorkShifts}
                onDelete={handleRemoveShift}
              />
            </div>
          )}

          {/* Tab 3: Cấu hình ca mẫu */}
          {activeTab === "templates" && (
            <div className="flex flex-col gap-6">
              <ShiftTemplateSection
                templates={templates}
                onAdd={openAddTemplate}
                onEdit={openEditTemplate}
                onDelete={async (id) => {
                  try {
                    await apiDelete(`/api/shift-templates/${encodeURIComponent(id)}`);
                    setTemplates((prev) => prev.filter((t) => t.id !== id));
                    showToast("Đã xóa khung ca mẫu", "success");
                  } catch (e: any) {
                    const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi xóa khung ca mẫu";
                    showToast(msg, "danger");
                  }
                }}
              />
            </div>
          )}
        </>
      )}

      <TemplateModal
        open={addTemplateOpen}
        onClose={() => setAddTemplateOpen(false)}
        editing={!!editingTemplate}
        name={newTemplateName}
        start={newTemplateStart}
        end={newTemplateEnd}
        onNameChange={setNewTemplateName}
        onStartChange={setNewTemplateStart}
        onEndChange={setNewTemplateEnd}
        onSave={handleSaveTemplate}
      />

      <AssignShiftModal
        open={assignShiftOpen}
        onClose={() => setAssignShiftOpen(false)}
        templates={templates}
        employee={assignEmployee}
        branch={assignBranch}
        date={assignDate}
        templateId={assignTemplateId}
        note={assignNote}
        isRecurring={assignIsRecurring}
        isManager={isManager}
        managerBranch={managerBranch}
        employees={empList}
        onEmployeeChange={setAssignEmployee}
        onBranchChange={setAssignBranch}
        onNoteChange={setAssignNote}
        onRecurringChange={setAssignIsRecurring}
        onSave={handleAssignShift}
      />

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} workShifts={displayedWorkShifts} />
    </div>
  );
}
