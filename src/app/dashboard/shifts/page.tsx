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
import { apiGet, apiPost, apiPut, apiDelete, GatewayError } from "@/lib/api";
import type { Employee, Branch } from "@/types";
import type { ShiftTemplate, WorkShift, WeeklyRegistration, ShiftRegistrationRecord, BackendShift } from "@/features/shifts/types";
import ShiftTemplateSection from "@/features/shifts/ShiftTemplates";
import WorkShiftSection from "@/features/shifts/ShiftList";
import GeneralScheduleSection from "@/features/shifts/ScheduleOverview";
import WeeklyRegistrationSection from "@/features/shifts/WeekWishes";
import RegistrationHistorySection from "@/features/shifts/RegistrationHistory";
import TemplateModal from "@/features/shifts/TemplateForm";
import AssignShiftModal from "@/features/shifts/ShiftAssign";
import AttendanceTimeModal, { AttendanceTimePayload } from "@/features/shifts/AttendanceTimeModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useCurrentUser } from "@/context/AuthContext";
import { canAccessPath, NoAccessNotice } from "@/lib/permissions";
import { useLocalStorageState } from "@/hooks/useLocalStorage";
import { formatDate, formatDateTime, parseDate, getTodayVN, toHHmm } from "@/lib/utils";

// Thông điệp lỗi cho người dùng: lỗi mạng/403 không được biến thành danh sách
// rỗng (màn sẽ hiện "không có dữ liệu" như thật).
function errorMessage(reason: unknown, fallback: string): string {
  if (reason instanceof GatewayError) return reason.message;
  if (reason instanceof Error && reason.message) return reason.message;
  return fallback;
}

function resolveBranchDisplay(
  branchRaw: string | undefined | null,
  branchesList: Branch[] = []
): { branchName: string; branchId: string } {
  if (!branchRaw || branchRaw === "—") return { branchName: "—", branchId: "—" };
  const raw = branchRaw.trim();
  const found = branchesList.find((b) => b.id === raw);
  if (found) {
    return { branchName: found.name, branchId: found.id };
  }
  // Không map được branchId vào /api/branches -> fallback giá trị gốc,
  // bỏ heuristic giả "UUID dài => Quận 1/CN-0001".
  return { branchName: raw, branchId: raw };
}

function mapBackendShiftToWorkShift(
  s: BackendShift,
  empMap?: Map<string, string>,
  empPhoneMap?: Map<string, string>,
  branchesList: Branch[] = [],
  employees: Employee[] = [],
  templates: ShiftTemplate[] = []
): WorkShift {
  const empName = (s.employeeId && empMap?.get(s.employeeId)) || "Chưa phân công";
  const phone = (s.employeeId && empPhoneMap?.get(s.employeeId)) || "";

  const template = templates.find((t) => t.id === s.templateId);
  const scheduled =
    s.scheduledStart && s.scheduledEnd
      ? `${s.scheduledStart}-${s.scheduledEnd}`
      : `${template?.startTime ?? "07:00"}-${template?.endTime ?? "14:00"}`;

  const rawBranch = s.branchId || employees.find((e) => e.id === s.employeeId)?.branchId || "—";
  const { branchName, branchId } = resolveBranchDisplay(rawBranch, branchesList);

  // Mobile ghi ngày ISO (yyyy-MM-dd), web ghi dd/MM/yyyy; chuẩn hóa về dd/MM/yyyy
  // để khối Lịch làm việc chung khớp đúng ngày và bảng không lẫn lộn định dạng.
  const date = formatDate(s.workDate) || "—";

  const attendance = s.attendance ?? null;
  const attendanceState: string = s.attendanceState || "";
  const attendanceResult: string = String(attendance?.status ?? "");
  // BE lưu checkIn/checkOut là mốc thời gian (DateTime) ở attendance -> FE cần "HH:mm".
  const checkInTime = toHHmm(attendance?.checkIn);
  const checkOutTime = toHHmm(attendance?.checkOut);
  const isCheckedIn = !!checkInTime;
  let status: WorkShift["status"] = "Chưa chấm công";
  if (s.status === "đã hủy") {
    status = "Quên chấm công";
  } else if (attendanceState === "completed" || attendanceResult === "present") {
    status = "Đúng giờ";
  } else if (attendanceResult === "late" || attendanceResult === "late_early_leave") {
    status = "Trễ";
  } else if (attendanceResult === "early_leave") {
    status = "Về sớm";
  } else if (attendanceState === "missed_checkin" || attendanceState === "missed_checkout") {
    status = "Quên chấm công";
  } else {
    // Nếu chưa check-in và đã quá giờ bắt đầu ca (hoặc ngày trong quá khứ) -> Quên chấm công
    if (!isCheckedIn && date !== "—") {
      const parsed = parseDate(date);
      if (parsed) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const shiftDate = new Date(parsed);
        shiftDate.setHours(0, 0, 0, 0);

        if (shiftDate.getTime() < today.getTime()) {
          status = "Quên chấm công";
        } else if (shiftDate.getTime() === today.getTime()) {
          const startStr = (s.scheduledStart || scheduled.split("-")[0] || "07:00").trim();
          const [sh, sm] = startStr.split(":").map(Number);
          const startMin = (sh || 0) * 60 + (sm || 0);

          const now = new Date();
          const nowMin = now.getHours() * 60 + now.getMinutes();
          if (nowMin >= startMin) {
            status = "Quên chấm công";
          } else {
            status = "Chưa chấm công";
          }
        } else {
          status = "Chưa chấm công";
        }
      } else {
        status = "Chưa chấm công";
      }
    } else {
      status = "Chưa chấm công";
    }
  }

  return {
    id: s.id,
    employee: empName,
    employeeId: s.employeeId,
    phone,
    branch: branchName,
    branchId,
    date,
    templateName: template?.name || "",
    scheduled,
    checkIn: checkInTime || "—",
    checkOut: checkOutTime || "—",
    rawCheckIn: attendance?.checkIn ? new Date(attendance.checkIn).toISOString() : null,
    rawCheckOut: attendance?.checkOut ? new Date(attendance.checkOut).toISOString() : null,
    status,
  };
}

function resolveShiftName(shiftId: string, templates: ShiftTemplate[]): string {
  if (!shiftId || shiftId === "off") return "Nghỉ";
  const matched = templates.find(
    (t) => t.id.toLowerCase() === shiftId.toLowerCase() || t.name.toLowerCase() === shiftId.toLowerCase()
  );
  if (matched) return matched.name;
  return shiftId;
}

function parseDayKey(wish: string): string | null {
  if (!wish) return null;
  const w = wish.trim().toUpperCase();
  const validKeys = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  if (validKeys.includes(w)) return w;

  if (w.includes("HAI") || w === "THỨ 2" || w === "THU 2") return "T2";
  if (w.includes("BA") || w === "THỨ 3" || w === "THU 3") return "T3";
  if (w.includes("TƯ") || w.includes("TU") || w === "THỨ 4" || w === "THU 4") return "T4";
  if (w.includes("NĂM") || w.includes("NAM") || w === "THỨ 5" || w === "THU 5") return "T5";
  if (w.includes("SÁU") || w.includes("SAU") || w === "THỨ 6" || w === "THU 6") return "T6";
  if (w.includes("BẢY") || w.includes("BAY") || w === "THỨ 7" || w === "THU 7") return "T7";
  if (w.includes("NHẬT") || w.includes("NHAT") || w.includes("CHU NHAT")) return "CN";

  // Ngày đầy đủ (DD/MM/YYYY, DD-MM-YYYY hoặc ISO) -> thứ trong tuần
  const parsed = parseDate(w);
  if (parsed) {
    return validKeys[(parsed.getDay() + 6) % 7] || null;
  }

  // Dạng ngắn DD/MM (thiếu năm) -> dùng năm hiện tại
  const parts = w.split("/");
  if (parts.length === 2) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    if (!isNaN(day) && !isNaN(month)) {
      const d = new Date(new Date().getFullYear(), month - 1, day);
      const dayIndex = (d.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
      return validKeys[dayIndex] || null;
    }
  }
  return null;
}

function parseBackendRegistrations(
  rawList: any[],
  empMap: Map<string, string>,
  empList: Employee[],
  templates: ShiftTemplate[],
  branchesList: Branch[] = []
): WeeklyRegistration[] {
  if (!Array.isArray(rawList) || rawList.length === 0) return [];

  const grouped = new Map<string, any[]>();
  const directWeeklyList: WeeklyRegistration[] = [];

  for (const item of rawList) {
    if (item.days && typeof item.days === "object") {
      const empName = (item.employeeId && empMap.get(item.employeeId)) || item.employeeName || item.employee || "Nhân sự";
      const empObj = empList.find((e) => e.id === item.employeeId || e.name === empName);
      const rawBranch = item.branchId || empObj?.branchId || "—";
      const { branchName, branchId } = resolveBranchDisplay(rawBranch, branchesList);
      directWeeklyList.push({
        id: item.id || `reg-${Date.now()}`,
        employeeName: empName,
        role: item.role || empObj?.role || "Nhân viên",
        branch: branchName,
        branchId,
        requestedCount: item.requestedCount || Object.values(item.days).filter((v) => v !== "Nghỉ").length,
        registeredAt: formatDateTime(item.registeredAt || item.createdAt) || "—",
        order: item.order || 1,
        days: item.days,
        note: item.note || item.wish || "",
      });
      continue;
    }

    const key = item.employeeId || item.employeeName || item.employee || "unknown";
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(item);
  }

  for (const [empId, items] of grouped.entries()) {
    const empObj = empList.find((e) => e.id === empId || e.name === empId);
    const empName = empMap.get(empId) || empObj?.name || items[0]?.employeeName || empId;
    const rawBranch = items[0]?.branchId || empObj?.branchId || "—";
    const { branchName, branchId } = resolveBranchDisplay(rawBranch, branchesList);
    const role = empObj?.role || items[0]?.role || "Nhân viên";

    const days: Record<string, string> = {
      T2: "Nghỉ",
      T3: "Nghỉ",
      T4: "Nghỉ",
      T5: "Nghỉ",
      T6: "Nghỉ",
      T7: "Nghỉ",
      CN: "Nghỉ",
    };
    const dayRegistrationIds: Record<string, string> = {};

    let note = "";
    let latestTime = 0;

    for (const r of items) {
      if (r.createdAt) {
        const t = parseDate(r.createdAt)?.getTime() ?? 0;
        if (t > latestTime) latestTime = t;
      }
      const wishStr = r.registerDate || "";
      if (r.shiftId === "preference_note") {
        note = wishStr;
        continue;
      }

      const dayKey = parseDayKey(wishStr);
      if (dayKey) {
        const shiftName = resolveShiftName(r.templateId, templates);
        if (shiftName && shiftName !== "Nghỉ") {
          if (!days[dayKey] || days[dayKey] === "Nghỉ") {
            days[dayKey] = shiftName;
          } else if (!days[dayKey].includes(shiftName)) {
            days[dayKey] = `${days[dayKey]}, ${shiftName}`;
          }
        }
        if (r.id) {
          dayRegistrationIds[dayKey] = r.id;
        }
      }
    }

    const requestedCount = items.filter((r) => r.shiftId !== "preference_note" && r.shiftId !== "off").length || Object.values(days).filter((v) => v !== "Nghỉ").length;
    const registeredAt = latestTime > 0 ? formatDateTime(new Date(latestTime)) : "Hôm nay";

    directWeeklyList.push({
      id: items[0]?.id || `reg-${empId}`,
      employeeName: empName,
      role,
      branch: branchName,
      branchId,
      requestedCount,
      registeredAt,
      order: 1,
      days,
      dayRegistrationIds,
      note,
    });
  }

  return directWeeklyList;
}

function mapToRegistrationRecords(
  rawList: any[],
  empMap: Map<string, string>,
  empList: Employee[],
  templates: ShiftTemplate[],
  branchesList: Branch[] = []
): ShiftRegistrationRecord[] {
  if (!Array.isArray(rawList)) return [];

  return rawList
    .filter((r) => r.shiftId !== "preference_note")
    .map((r) => {
      const empId = r.employeeId || "";
      const empObj = empList.find((e) => e.id === empId || e.name === empId);
      const empName = empMap.get(empId) || empObj?.name || r.employeeName || empId || "Nhân sự";
      const rawBranch = r.branchId || empObj?.branchId || "—";
      const { branchName, branchId } = resolveBranchDisplay(rawBranch, branchesList);
      const role = empObj?.role || r.role || "Nhân viên";

      const wishStr = r.registerDate || "";
      let dateFormatted = wishStr;
      if (wishStr.length <= 5 && wishStr.includes("/")) {
        const currentYear = new Date().getFullYear();
        dateFormatted = `${wishStr}/${currentYear}`;
      }
      // Chuẩn hóa DD/MM/YYYY cho mọi giá trị ngày (idempotent, giữ nguyên chuỗi ngày trong tuần).
      dateFormatted = formatDate(dateFormatted);

      const templateName = resolveShiftName(r.templateId, templates);
      const matchedTemplate = templates.find((t) => t.name.toLowerCase() === templateName.toLowerCase());
      const scheduled = matchedTemplate ? `${matchedTemplate.startTime} - ${matchedTemplate.endTime}` : (
        templateName === "Ca Sáng" ? "07:00 - 14:00" :
        templateName === "Ca Chiều" ? "14:00 - 22:00" :
        templateName === "Ca Tối" ? "18:00 - 23:00" : "07:00 - 14:00"
      );

      const registeredAt = r.createdAt ? formatDateTime(r.createdAt) : "—";

      return {
        id: r.id || `reg-rec-${Date.now()}-${Math.random()}`,
        employeeId: empId,
        employeeName: empName,
        role,
        branch: branchName,
        branchId,
        date: dateFormatted,
        templateName,
        scheduled,
        registeredAt,
        status: "Đã đăng ký" as const,
        note: r.note,
        rawShiftId: r.shiftId,
      };
    });
}

export default function ShiftsPage() {
  const { role, branchId } = useCurrentUser();
  const isManager = role === "manager";
  const managerBranch = branchId;
  const [activeTab, setActiveTab] = useLocalStorageState<"scheduling" | "general_schedule" | "templates">(
    "hrm_shifts_active_tab",
    "scheduling"
  );

  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  // Khung ca mẫu đã nối /api/shift-templates (fetch + CRUD ở các handler bên dưới).
  // Ca làm việc & nguyện vọng: khởi rỗng, chỉ nhận từ API; DB rỗng -> empty state.
  const [workShiftList, setWorkShiftList] = useState<WorkShift[]>([]);
  const [weeklyRegistrations, setWeeklyRegistrations] = useState<WeeklyRegistration[]>([]);
  const [registrationRecords, setRegistrationRecords] = useState<ShiftRegistrationRecord[]>([]);
  const [empList, setEmpList] = useState<Employee[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "danger" } | null>(null);

  // Bộ chọn ngày & chi nhánh cho khối Xếp ca (mặc định hôm nay)
  const todayStr = getTodayVN();
  const [schedulerDate, setSchedulerDate] = useState(todayStr);
  const [branches, setBranches] = useState<Branch[]>([]);
  // Ca đang mở form "Cập nhật giờ chấm công" (PUT /api/attendance/:shiftId).
  const [attendanceTarget, setAttendanceTarget] = useState<WorkShift | null>(null);

  // State dùng chung đồng bộ giữa Tab "Quản lý đăng ký ca" và Tab "Lịch làm việc chung"
  const [sharedWeekOffset, setSharedWeekOffset] = useLocalStorageState<number>("hrm_shifts_week_offset", 0);
  const defaultDayIndex = (new Date().getDay() + 6) % 7;
  const [sharedDayIndex, setSharedDayIndex] = useLocalStorageState<number>("hrm_shifts_day_index", defaultDayIndex);
  const [savedBranch, setSavedBranch] = useLocalStorageState<string>("hrm_shifts_branch_by_id", "all");
  const sharedBranch = isManager ? managerBranch : savedBranch;
  const setSharedBranch = useCallback(
    (b: string) => {
      if (!isManager) setSavedBranch(b);
    },
    [isManager, setSavedBranch]
  );

  const [assignEmployee, setAssignEmployee] = useState("");
  const [assignBranch, setAssignBranch] = useState("");
  const [assignDate, setAssignDate] = useState(todayStr);
  const [assignTemplateId, setAssignTemplateId] = useState("");

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
      if (effectiveBranch) queryParams.set("branchId", effectiveBranch);

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

      const [shiftsRes, regRes, employeesRes, templatesRes, branchesRes] = await Promise.allSettled([
        apiGet<any[]>(`/api/shifts${queryString}`),
        apiGet<any[]>(`/api/shifts/registrations${queryString}`),
        apiGet<Employee[]>("/api/employees"),
        apiGet<any[]>(`/api/shift-templates`),
        apiGet<Branch[]>("/api/branches"),
      ]);
      let branchesData: Branch[] = [];
      if (branchesRes.status === "fulfilled" && Array.isArray(branchesRes.value)) {
        branchesData = branchesRes.value;
        setBranches(branchesData);
      }

      let employeesData: Employee[] = [];
      if (employeesRes.status === "fulfilled" && Array.isArray(employeesRes.value)) {
        employeesData = employeesRes.value;
      }
      // Luôn đồng bộ (kể cả mảng rỗng) để hiện empty state thật thay vì mock.
      setEmpList(employeesData);

      const currentEmpMap = new Map<string, string>();
      const currentEmpPhoneMap = new Map<string, string>();
      for (const e of employeesData) {
        currentEmpMap.set(e.id, e.name);
        if (e.phone) currentEmpPhoneMap.set(e.id, e.phone);
      }

      let templatesData: ShiftTemplate[] = [];
      if (templatesRes.status === "fulfilled" && Array.isArray(templatesRes.value)) {
        templatesData = templatesRes.value;
        setTemplates(templatesData);
      }

      if (shiftsRes.status === "fulfilled" && Array.isArray(shiftsRes.value)) {
        setWorkShiftList(shiftsRes.value.map((s) => mapBackendShiftToWorkShift(s, currentEmpMap, currentEmpPhoneMap, branchesData, employeesData, templatesData)));
      } else if (shiftsRes.status === "rejected") {
        // Lỗi mạng/403 không được hiển thị như "không có ca nào".
        setError(errorMessage(shiftsRes.reason, "Không thể tải dữ liệu ca làm việc từ gateway"));
      }

      if (regRes.status === "fulfilled" && Array.isArray(regRes.value)) {
        setWeeklyRegistrations(
          parseBackendRegistrations(regRes.value, currentEmpMap, employeesData, templatesData, branchesData)
        );
        setRegistrationRecords(
          mapToRegistrationRecords(regRes.value, currentEmpMap, employeesData, templatesData, branchesData)
        );
      }
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Không thể tải dữ liệu ca làm việc từ gateway";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [isManager, managerBranch]);

  useEffect(() => {
    let ignore = false;
    const effectiveBranch = isManager ? managerBranch : "";
    const queryParams = new URLSearchParams();
    if (effectiveBranch) queryParams.set("branchId", effectiveBranch);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

    Promise.allSettled([
      apiGet<any[]>(`/api/shifts${queryString}`),
      apiGet<any[]>(`/api/shifts/registrations${queryString}`),
      apiGet<Employee[]>("/api/employees"),
      apiGet<any[]>(`/api/shift-templates`),
      apiGet<Branch[]>("/api/branches"),
    ])
      .then(([shiftsRes, regRes, employeesRes, templatesRes, branchesRes]) => {
        if (ignore) return;
        let branchesData: Branch[] = [];
        if (branchesRes.status === "fulfilled" && Array.isArray(branchesRes.value)) {
          branchesData = branchesRes.value;
          setBranches(branchesData);
        }

        let employeesData: Employee[] = [];
        if (employeesRes.status === "fulfilled" && Array.isArray(employeesRes.value)) {
          employeesData = employeesRes.value;
        }
        setEmpList(employeesData);

        const currentEmpMap = new Map<string, string>();
        const currentEmpPhoneMap = new Map<string, string>();
        for (const e of employeesData) {
          currentEmpMap.set(e.id, e.name);
          if (e.phone) currentEmpPhoneMap.set(e.id, e.phone);
        }

        let templatesData: ShiftTemplate[] = [];
        if (templatesRes.status === "fulfilled" && Array.isArray(templatesRes.value)) {
          templatesData = templatesRes.value;
          setTemplates(templatesData);
        }

        if (shiftsRes.status === "fulfilled" && Array.isArray(shiftsRes.value)) {
          setWorkShiftList(
            shiftsRes.value.map((s) =>
              mapBackendShiftToWorkShift(s, currentEmpMap, currentEmpPhoneMap, branchesData, employeesData, templatesData)
            )
          );
        } else if (shiftsRes.status === "rejected") {
          setError(errorMessage(shiftsRes.reason, "Không thể tải dữ liệu ca làm việc từ gateway"));
        }

        if (regRes.status === "fulfilled" && Array.isArray(regRes.value)) {
          setWeeklyRegistrations(
            parseBackendRegistrations(regRes.value, currentEmpMap, employeesData, templatesData, branchesData)
          );
          setRegistrationRecords(
            mapToRegistrationRecords(regRes.value, currentEmpMap, employeesData, templatesData, branchesData)
          );
        }
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!ignore) {
          const msg = e instanceof GatewayError ? e.message : "Không thể tải dữ liệu ca làm việc từ gateway";
          setError(msg);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [isManager, managerBranch]);

  const validBranchIds = useMemo(
    () => new Set(branches.map((b) => b.id)),
    [branches]
  );

  const currentAssignEmployee = assignEmployee || empList[0]?.name || "";
  const currentAssignBranch =
    !isManager && assignBranch && !validBranchIds.has(assignBranch)
      ? branches[0]?.id || ""
      : assignBranch;
  const currentAssignTemplateId = assignTemplateId || templates[0]?.id || "";

  // Manager chỉ thấy dữ liệu chi nhánh mình: so bằng ID (định danh),
  // tên chi nhánh chỉ để hiển thị.
  const sameBranch = (a?: string | null, b?: string | null) =>
    (a || "") === (b || "");
  const displayedWorkShifts = isManager
    ? workShiftList.filter((s) => sameBranch(s.branchId, branchId))
    : workShiftList;
  const displayedRegistrations = isManager
    ? weeklyRegistrations.filter((r) => sameBranch(r.branchId, branchId))
    : weeklyRegistrations;
  const displayedRegistrationRecords = isManager
    ? registrationRecords.filter((r) => sameBranch(r.branchId, branchId))
    : registrationRecords;

  const [addTemplateOpen, setAddTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);
  // Khung ca đang chờ xác nhận xoá (xoá khung ca là thao tác không hoàn tác được).
  const [pendingTemplateDelete, setPendingTemplateDelete] = useState<ShiftTemplate | null>(null);
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
      await fetchData();
      showToast("Đã xóa phân công ca làm việc", "success");
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi xóa ca làm việc";
      showToast(msg, "danger");
    } finally {
      setActionInProgress(false);
    }
  };

  // Xóa đăng ký ca (DELETE /api/shifts/registrations/:id)
  const handleDeleteRegistration = async (regId: string) => {
    try {
      setActionInProgress(true);
      await apiDelete(`/api/shifts/registrations/${encodeURIComponent(regId)}`);
      setRegistrationRecords((prev) => prev.filter((r) => r.id !== regId));
      await fetchData();
      showToast("Đã xóa bản ghi đăng ký ca", "success");
    } catch (e: any) {
      const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi xóa đăng ký ca";
      showToast(msg, "danger");
    } finally {
      setActionInProgress(false);
    }
  };

  // Luồng chấm công của QUẢN TRỊ trên web: PUT /api/attendance/:shiftId
  // (WorkService.saveAttendance) — nhập giờ vào/ra cho một ca đã phân, không đòi
  // Wi-Fi, tự tính công và ghi Backlog. POST /attendance/checkin|checkout dành cho
  // chính nhân viên (mobile đọc SSID/BSSID thật từ thiết bị); web từng gọi hai endpoint
  // đó bằng cách mượn BSSID của chi nhánh, vừa sai nghiệp vụ định vị vừa 403 với manager
  // vì GET /api/wifi-configs chỉ mở cho admin.
  const openAttendanceDialog = (employeeId: string, shiftId: string) => {
    if (!employeeId) {
      showToast("Không xác định được nhân sự để cập nhật chấm công (thiếu employeeId)", "danger");
      return;
    }
    const target = workShiftList.find((s) => s.id === shiftId);
    if (!target) {
      showToast("Không tìm thấy ca để cập nhật giờ chấm công", "danger");
      return;
    }
    setAttendanceTarget(target);
  };

  const handleSaveAttendance = async (payload: AttendanceTimePayload) => {
    if (!attendanceTarget) return;
    try {
      setActionInProgress(true);
      await apiPut(`/api/attendance/${encodeURIComponent(attendanceTarget.id)}`, payload);
      setAttendanceTarget(null);
      await fetchData();
      showToast("Đã lưu giờ chấm công cho ca", "success");
    } catch (e: unknown) {
      showToast(errorMessage(e, "Lỗi khi lưu giờ chấm công"), "danger");
    } finally {
      setActionInProgress(false);
    }
  };

  // Tạo & phân ca mới (POST /api/shifts)
  const handleAssignShift = async () => {
    const targetBranch = currentAssignBranch;
    if (!targetBranch) {
      showToast("Vui lòng chọn chi nhánh cho ca làm việc", "danger");
      return;
    }
    const template = templates.find((t) => t.id === currentAssignTemplateId) || templates[0];
    const matchedEmp = empList.find((e) => e.name === currentAssignEmployee);
    const payload = {
      employeeId: matchedEmp?.id || currentAssignEmployee,
      branchId: targetBranch,
      workDate: formatDate(assignDate),
      templateId: template?.id,
    };

    try {
      setActionInProgress(true);
      await apiPost("/api/shifts", payload);
      await fetchData();
      showToast(`Đã phân công thành công cho "${currentAssignEmployee}" (${template?.name || "Ca trực"})`, "success");
      setAssignShiftOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof GatewayError ? e.message : "Lỗi khi phân công ca làm việc";
      showToast(msg, "danger");
    } finally {
      setActionInProgress(false);
    }
  };

  // Phân ca là tính năng quản lý (WRITE /api/shifts* = manager + admin) nên
  // nhân viên không vào trang này; luồng đăng ký ca của họ dành cho app.
  if (!canAccessPath(role, "/dashboard/shifts")) {
    return <NoAccessNotice description="Phân ca làm việc chỉ dành cho Quản trị viên và Quản lý Chi nhánh." />;
  }

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
        breadcrumb={[{ label: "HRM", href: "#" }, { label: "Lịch ca" }]}
        actions={
          <div className="flex items-center gap-2">
            {/* Bỏ border ngoài: p-1 (8px) + pill 28px đã đúng 36px, thêm border
                1px mỗi bên sẽ đẩy khối tab lên 38px, lệch với các nút header. */}
            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
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
            <div className="flex flex-col gap-6">
              <GeneralScheduleSection
                mode="schedule"
                workShifts={displayedWorkShifts}
                registrations={displayedRegistrations}
                templates={templates}
                defaultBranch="all"
                isManager={isManager}
                managerBranch={managerBranch}
                weekOffset={sharedWeekOffset}
                onWeekOffsetChange={setSharedWeekOffset}
                selectedDayIndex={sharedDayIndex}
                onDayIndexChange={setSharedDayIndex}
                selectedBranch={sharedBranch}
                onBranchChange={setSharedBranch}
                onDeleteShift={handleRemoveShift}
                onCheckIn={openAttendanceDialog}
                onCheckOut={openAttendanceDialog}
                onOpenAssignModal={(templateId, date, branch) => {
                  const effectiveBranch = isManager
                    ? managerBranch
                    : (branch && branch !== "all" ? branch : (sharedBranch !== "all" ? sharedBranch : ""));
                  setAssignTemplateId(templateId);
                  setAssignDate(date);
                  setAssignBranch(effectiveBranch);
                  setAssignShiftOpen(true);
                }}
              />

              {/* Bảng danh sách chi tiết phân công */}
              <WorkShiftSection
                workShifts={displayedWorkShifts}
                isManager={isManager}
                onDelete={handleRemoveShift}
                onAddShift={() => {
                  const effectiveBranch = isManager ? managerBranch : "";
                  setAssignDate(todayStr);
                  setAssignBranch(effectiveBranch);
                  setAssignShiftOpen(true);
                }}
              />
            </div>
          )}

          {/* Tab 2: Quản lý đăng ký ca */}
          {activeTab === "scheduling" && (
            <div className="flex flex-col gap-6">
              <GeneralScheduleSection
                mode="registration"
                workShifts={displayedWorkShifts}
                registrations={displayedRegistrations}
                templates={templates}
                defaultBranch="all"
                isManager={isManager}
                managerBranch={managerBranch}
                weekOffset={sharedWeekOffset}
                onWeekOffsetChange={setSharedWeekOffset}
                selectedDayIndex={sharedDayIndex}
                onDayIndexChange={setSharedDayIndex}
                selectedBranch={sharedBranch}
                onBranchChange={setSharedBranch}
                onDeleteRegistration={handleDeleteRegistration}
              />

              {/* Bảng Lịch sử đăng ký ca */}
              <RegistrationHistorySection
                registrationRecords={displayedRegistrationRecords}
                weeklyRegistrations={displayedRegistrations}
                branches={branches}
                onAssignFromRegistration={(rec) => {
                  const matchedEmp = empList.find((e) => e.name === rec.employeeName || e.id === rec.employeeId);
                  if (matchedEmp) setAssignEmployee(matchedEmp.name);
                  if (rec.branchId && rec.branchId !== "—") setAssignBranch(rec.branchId);
                  setAssignDate(formatDate(rec.date));
                  const matchedT = templates.find((t) => t.name.toLowerCase() === rec.templateName.toLowerCase());
                  if (matchedT) setAssignTemplateId(matchedT.id);
                  setAssignShiftOpen(true);
                }}
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
                  const target = templates.find((t) => t.id === id);
                  setPendingTemplateDelete(target || null);
                }}
              />
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!pendingTemplateDelete}
        title="Xóa khung ca mẫu"
        message={`Xóa khung ca "${pendingTemplateDelete?.name || ""}"? Các ca đã phân công theo khung này không bị xóa.`}
        confirmLabel="Xóa"
        tone="danger"
        onCancel={() => setPendingTemplateDelete(null)}
        onConfirm={async () => {
          const target = pendingTemplateDelete;
          setPendingTemplateDelete(null);
          if (!target) return;
          try {
            await apiDelete(`/api/shift-templates/${encodeURIComponent(target.id)}`);
            setTemplates((prev) => prev.filter((t) => t.id !== target.id));
            showToast("Đã xóa khung ca mẫu", "success");
          } catch (e: any) {
            const msg = e instanceof GatewayError ? e.message : e?.message || "Lỗi khi xóa khung ca mẫu";
            showToast(msg, "danger");
          }
        }}
      />

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
        employee={currentAssignEmployee}
        branch={currentAssignBranch}
        date={assignDate}
        templateId={currentAssignTemplateId}
        isManager={isManager}
        managerBranch={managerBranch}
        isFilterLocked={!isManager && sharedBranch !== "all"}
        employees={empList}
        onEmployeeChange={setAssignEmployee}
        onBranchChange={setAssignBranch}
        onSave={handleAssignShift}
      />

      {attendanceTarget && (
        <AttendanceTimeModal
          key={attendanceTarget.id}
          open
          shiftLabel={`${attendanceTarget.employee} · ${attendanceTarget.date} · ${attendanceTarget.scheduled}`}
          initialCheckIn={attendanceTarget.rawCheckIn}
          initialCheckOut={attendanceTarget.rawCheckOut}
          saving={actionInProgress}
          onClose={() => setAttendanceTarget(null)}
          onSubmit={handleSaveAttendance}
        />
      )}
    </div>
  );
}
