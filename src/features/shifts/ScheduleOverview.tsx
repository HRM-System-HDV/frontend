"use client";

import { useState, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendar, faCheck, faChevronDown, faChevronLeft, faChevronRight, faChevronUp, faCircleExclamation, faClock, faCloudSun, faFilter, faMagnifyingGlass, faMoon, faPhone, faStore, faSun, faUserCheck, faUserPlus, faUsers } from "@fortawesome/free-solid-svg-icons";
import Badge from "@/components/ui/Badge";
import StaffShiftDetailModal from "./ShiftDetail";
import { useLocalStorageState } from "@/hooks/useLocalStorage";
import { apiGet } from "@/lib/api";
import { formatDate, parseDate } from "@/lib/utils";
import type { Branch } from "@/types";
import type { ShiftTemplate, WorkShift, WeeklyRegistration } from "./types";

export interface StaffInShift {
  id: string;
  rawId?: string;
  name: string;
  role: string;
  branch: string;
  avatarLetter: string;
  phone: string;
  checkInStatus: "checked_in" | "in_progress" | "not_yet";
  checkInTime?: string;
  checkOutTime?: string;
}

export interface GeneralShiftItem {
  id: string;
  templateId?: string;
  shiftName: string;
  timeRange: string;
  iconType: "morning" | "afternoon" | "evening";
  status: "completed" | "active" | "upcoming";
  staffList: StaffInShift[];
}

interface Props {
  mode?: "registration" | "schedule";
  workShifts: WorkShift[];
  registrations?: WeeklyRegistration[];
  templates: ShiftTemplate[];
  defaultBranch?: string;
  isManager?: boolean;
  managerBranch?: string;
  onOpenAssignModal?: (templateId: string, date: string, branch: string) => void;
  onDeleteShift?: (shiftId: string) => void;
  onDeleteRegistration?: (regId: string) => void;
  weekOffset?: number;
  onWeekOffsetChange?: (offset: number) => void;
  selectedDayIndex?: number;
  onDayIndexChange?: (idx: number) => void;
  selectedBranch?: string;
  onBranchChange?: (branch: string) => void;
}

// Danh sách ca được dựng 100% từ `workShifts` (API /api/shifts).
// DB rỗng -> hiển thị Trống (empty state), không dùng mock cứng.
function getMondayOfCurrentWeek(): Date {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // Thứ 2 = 0
  const monday = new Date(now);
  monday.setDate(now.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export default function GeneralScheduleSection({
  mode = "schedule",
  workShifts,
  registrations = [],
  templates,
  defaultBranch = "all",
  isManager = false,
  managerBranch,
  onOpenAssignModal,
  onDeleteShift,
  onDeleteRegistration,
  weekOffset: propsWeekOffset,
  onWeekOffsetChange,
  selectedDayIndex: propsDayIndex,
  onDayIndexChange,
  selectedBranch: propsBranch,
  onBranchChange,
}: Props) {
  // Offset tuần (0: Tuần này, -1: Tuần trước, 1: Tuần sau...)
  const [internalWeekOffset, setInternalWeekOffset] = useState(0);
  const weekOffset = propsWeekOffset !== undefined ? propsWeekOffset : internalWeekOffset;
  const setWeekOffset = (valOrFn: number | ((prev: number) => number)) => {
    const next = typeof valOrFn === "function" ? valOrFn(weekOffset) : valOrFn;
    if (onWeekOffsetChange) onWeekOffsetChange(next);
    else setInternalWeekOffset(next);
  };

  const [internalDayIndex, setInternalDayIndex] = useState(0);
  const selectedDayIndex = propsDayIndex !== undefined ? propsDayIndex : internalDayIndex;
  const setSelectedDayIndex = (valOrFn: number | ((prev: number) => number)) => {
    const next = typeof valOrFn === "function" ? valOrFn(selectedDayIndex) : valOrFn;
    if (onDayIndexChange) onDayIndexChange(next);
    else setInternalDayIndex(next);
  };

  const effectiveDefaultBranch = isManager && managerBranch ? managerBranch : defaultBranch;
  const [internalBranch, setInternalBranch] = useState(effectiveDefaultBranch);
  const selectedBranch = propsBranch !== undefined ? propsBranch : internalBranch;
  const setSelectedBranch = (branch: string) => {
    if (onBranchChange) onBranchChange(branch);
    else setInternalBranch(branch);
  };
  const [statusFilter, setStatusFilter] = useLocalStorageState<"all" | "checked_in" | "not_yet">(
    "hrm_shifts_status_filter",
    "all"
  );
  const [expandedShifts, setExpandedShifts] = useState<Record<string, boolean>>({
    "shift_0": true,
    "shift_1": true,
    "shift_2": true,
  });
  const [detailStaff, setDetailStaff] = useState<StaffInShift | null>(null);
  const [detailShift, setDetailShift] = useState<GeneralShiftItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [staffOverrides, setStaffOverrides] = useState<Record<string, { checkInStatus: StaffInShift["checkInStatus"]; checkInTime?: string; checkOutTime?: string }>>({});
  const [canceledIds, setCanceledIds] = useState<Set<string>>(new Set());
  const [branches, setBranches] = useState<Branch[]>([]);
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState<number>(5);

  useEffect(() => {
    apiGet<Branch[]>("/api/branches").then((d) => setBranches(d || [])).catch(() => {});
    apiGet<any>("/api/attendance/config").then((cfg) => {
      const g = cfg?.gracePeriodMinutes ?? cfg?.data?.gracePeriodMinutes;
      if (typeof g === "number") setGracePeriodMinutes(g);
    }).catch(() => {});
  }, []);

  // Tính toán các ngày trong tuần được chọn (tuần hiện tại thật + offset)
  const weekDays = useMemo(() => {
    const baseMonday = getMondayOfCurrentWeek();
    const monday = new Date(baseMonday);
    monday.setDate(baseMonday.getDate() + weekOffset * 7);

    const dayKeys = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    const dayNames = [
      "Thứ Hai",
      "Thứ Ba",
      "Thứ Tư",
      "Thứ Năm",
      "Thứ Sáu",
      "Thứ Bảy",
      "Chủ Nhật",
    ];

    return dayKeys.map((key, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const dayNum = String(d.getDate()).padStart(2, "0");
      const monthNum = String(d.getMonth() + 1).padStart(2, "0");
      const yearNum = d.getFullYear();
      const dateStr = `${dayNum}/${monthNum}`;
      const fullDate = `${dayNum}/${monthNum}/${yearNum}`;
      const today = new Date();
      const isToday =
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();

      return {
        key,
        name: dayNames[idx],
        date: dateStr,
        fullDate,
        isToday,
      };
    });
  }, [weekOffset]);

  const currentDay = weekDays[selectedDayIndex] || weekDays[0];

  // Xây dựng danh sách ca làm việc của ngày được chọn — chỉ từ API.
  const dayShifts: GeneralShiftItem[] = useMemo(() => {
    const shiftsOfDay = workShifts.filter((ws) => formatDate(ws.date) === currentDay.fullDate);

    const toStaff = (ws: WorkShift): StaffInShift => ({
      id: ws.id,
      rawId: ws.id,
      name: ws.employee,
      role: ws.templateName || "Nhân viên trực ca",
      branch: ws.branch,
      avatarLetter: (ws.employee || "?").charAt(0).toUpperCase(),
      phone: ws.phone || "",
      checkInStatus: ws.checkIn && ws.checkIn !== "—" ? "checked_in" : "not_yet",
      checkInTime: ws.checkIn !== "—" ? ws.checkIn : undefined,
      checkOutTime: ws.checkOut !== "—" ? ws.checkOut : undefined,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parsedDay = parseDate(currentDay.fullDate);
    const dayDate = parsedDay ? new Date(parsedDay) : new Date(NaN);
    dayDate.setHours(0, 0, 0, 0);
    // Trạng thái theo ngày + giờ: ca đã qua giờ kết thúc -> hoàn thành,
    // chưa tới giờ bắt đầu -> sắp diễn ra, đang trong khung -> đang diễn ra.
    const calcStatus = (startTime: string, endTime: string): GeneralShiftItem["status"] => {
      if (dayDate.getTime() < today.getTime()) return "completed";
      if (dayDate.getTime() > today.getTime()) return "upcoming";
      const toMinutes = (hms: string) => {
        const [h, m] = (hms || "00:00").split(":").map(Number);
        return (h || 0) * 60 + (m || 0);
      };
      const startMin = toMinutes(startTime);
      let endMin = toMinutes(endTime);
      // Ca kết thúc sau nửa đêm (VD: 22:00 - 00:00) -> cộng thêm 24h.
      if (endMin <= startMin) endMin += 1440;
      const now = new Date();
      const elapsed = now.getHours() * 60 + now.getMinutes();
      if (elapsed >= endMin) return "completed";
      if (elapsed < startMin) return "upcoming";
      return "active";
    };

    const iconFor = (start: string): GeneralShiftItem["iconType"] => {
      const h = Number((start || "07:00").split(":")[0]);
      if (h >= 17) return "evening";
      if (h >= 12) return "afternoon";
      return "morning";
    };

    const matchesTemplate = (regShiftVal: string, t: ShiftTemplate) => {
      if (!regShiftVal || regShiftVal === "Nghỉ") return false;
      const cleanReg = regShiftVal.trim().toLowerCase();
      const cleanTName = t.name.trim().toLowerCase();
      return (
        cleanReg === cleanTName ||
        cleanReg === t.id.toLowerCase() ||
        cleanReg.includes(cleanTName) ||
        cleanTName.includes(cleanReg)
      );
    };

    // Chỉ hiển thị nhóm theo khung ca mẫu; chưa có khung -> không hiện nhóm ảo nào.
    const groups = templates.map((t, ti) => {
      const assigned = shiftsOfDay
        .filter((ws) => !ws.templateName || matchesTemplate(ws.templateName, t))
        .map(toStaff);

      const registered = (registrations || [])
        .filter((r) => {
          if (selectedBranch !== "all") {
            const cleanSelected = selectedBranch.toLowerCase().replace("-", "");
            const cleanBranch = (r.branch || "").toLowerCase().replace("-", "");
            const cleanSlug = (r.branchSlug || "").toLowerCase().replace("-", "");
            if (cleanBranch !== cleanSelected && cleanSlug !== cleanSelected) {
              return false;
            }
          }
          return matchesTemplate(r.days[currentDay.key], t);
        })
        .map((r, idx): StaffInShift => ({
          id: `reg-${r.id}-${idx}`,
          rawId: r.dayRegistrationIds?.[currentDay.key] || r.id,
          name: r.employeeName,
          role: r.role || "Nhân sự",
          branch: r.branch,
          avatarLetter: (r.employeeName || "?").charAt(0).toUpperCase(),
          phone: "",
          checkInStatus: "not_yet",
        }));

      // Nếu ở chế độ đăng ký ca: CHỈ hiển thị nhân viên đã đăng ký ca này
      // Nếu ở chế độ xếp ca chung: hiển thị nhân viên được phân công làm ca này
      const currentStaffList = mode === "registration" ? registered : assigned;

      // Áp dụng override chấm công và loại bỏ ca đã hủy
      const withOverrides = currentStaffList
        .filter((s) => !canceledIds.has(s.id))
        .map((s) => {
          const ov = staffOverrides[s.id];
          return ov
            ? { ...s, checkInStatus: ov.checkInStatus, checkInTime: ov.checkInTime ?? s.checkInTime, checkOutTime: ov.checkOutTime ?? s.checkOutTime }
            : s;
        });
      const filteredByBranch =
        selectedBranch === "all"
          ? withOverrides
          : withOverrides.filter((s) => s.branch.toLowerCase().replace("-", "") === selectedBranch.toLowerCase().replace("-", ""));
      return {
        id: `shift_${ti}`,
        templateId: t.id,
        shiftName: t.name,
        timeRange: `${t.startTime} - ${t.endTime}`,
        iconType: iconFor(t.startTime),
        status: calcStatus(t.startTime, t.endTime),
        staffList: filteredByBranch,
      };
    });
    return groups;
  }, [mode, currentDay, workShifts, registrations, templates, selectedBranch, staffOverrides, canceledIds]);

  const toggleExpand = (shiftId: string) => {
    setExpandedShifts((prev) => ({
      ...prev,
      [shiftId]: !prev[shiftId],
    }));
  };

  const getWeekTitle = () => {
    if (weekOffset === 0) return "Tuần này";
    if (weekOffset === -1) return "Tuần trước";
    if (weekOffset === 1) return "Tuần sau";
    if (weekOffset < -1) return `${Math.abs(weekOffset)} tuần trước`;
    return `${weekOffset} tuần sau`;
  };

  const getWeekRange = () => {
    if (weekDays.length < 7) return "";
    return `${weekDays[0].fullDate} - ${weekDays[6].fullDate}`;
  };

  // Tổng số lượt nhân sự trực trong ngày
  const totalStaffInDay = dayShifts.reduce(
    (sum, s) => sum + s.staffList.length,
    0
  );

  return (
    <div className="flex flex-col gap-5">
      {/* ── THANH ĐIỀU HƯỚNG TUẦN & BỘ LỌC CHI NHÁNH - ngang hàng cùng kích thước ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Chuyển tuần - cùng chiều cao với ô tìm kiếm */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 shadow-xs">
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev - 1)}
                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-50 text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                title="Tuần trước"
              >
                <FontAwesomeIcon icon={faChevronLeft} fontSize={16} />
              </button>
              <div className="text-center min-w-[130px]">
                <div className="font-bold text-gray-900 text-xs leading-tight">
                  {getWeekTitle()}
                </div>
                <div className="text-[11px] text-gray-400 font-normal leading-tight">
                  {getWeekRange()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev + 1)}
                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-50 text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                title="Tuần sau"
              >
                <FontAwesomeIcon icon={faChevronRight} fontSize={16} />
              </button>
            </div>
            {weekOffset !== 0 && (
              <button
                type="button"
                onClick={() => {
                  setWeekOffset(0);
                  setSelectedDayIndex(0);
                }}
                className="text-xs font-semibold text-primary hover:underline px-2 py-1 whitespace-nowrap"
              >
                Về hôm nay
              </button>
            )}
          </div>

          {/* Bộ lọc chi nhánh & tìm kiếm */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {isManager ? (
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700">
                <FontAwesomeIcon icon={faStore} fontSize={15} className="text-primary" />
                <span>Chi nhánh: <strong className="text-gray-900">{managerBranch}</strong></span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-50 text-primary border border-primary-200 ml-1">Cố định</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700">
                <FontAwesomeIcon icon={faStore} fontSize={15} className="text-primary" />
                <span>Chi nhánh:</span>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-gray-900 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">Tất cả chi nhánh</option>
                  {branches.map((b) => (
                    <option key={b.id || b.slug} value={b.slug.toUpperCase()}>
                      {b.name || b.slug.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {mode !== "registration" && (
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs">
                <FontAwesomeIcon icon={faFilter} fontSize={14} className="text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as "all" | "checked_in" | "not_yet")
                  }
                  className="bg-transparent border-none text-xs text-gray-700 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="checked_in">Đã chấm công</option>
                  <option value="not_yet">Chưa chấm công</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ── THẺ CHỌN 7 NGÀY TRONG TUẦN (GIỐNG MOBILE) ── */}
        <div className="grid grid-cols-7 gap-2 mt-4 pt-4 border-t border-gray-100">
          {weekDays.map((day, idx) => {
            const isSelected = idx === selectedDayIndex;
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedDayIndex(idx)}
                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl transition-all cursor-pointer border min-h-[78px] ${
                  isSelected
                    ? "bg-primary text-white border-primary shadow-sm ring-2 ring-primary/20 scale-[1.02]"
                    : day.isToday
                    ? "bg-primary-50 text-primary border-primary-200 hover:bg-primary-100/50"
                    : "bg-gray-50/70 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                }`}
              >
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider ${
                    isSelected
                      ? "text-white/90"
                      : day.isToday
                      ? "text-primary font-bold"
                      : "text-gray-500"
                  }`}
                >
                  {day.key}
                </span>
                <span
                  className={`text-base font-extrabold my-0.5 ${
                    isSelected ? "text-white" : "text-gray-900"
                  }`}
                >
                  {day.date.split("/")[0]}
                </span>
                <div className="flex items-center justify-center gap-1 h-[16px] min-h-[16px]">
                  {day.isToday ? (
                    <span
                      className={`text-[10px] px-1 py-0.5 rounded font-bold leading-none ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-primary text-white"
                      }`}
                    >
                      Hôm nay
                    </span>
                  ) : (
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isSelected ? "bg-white" : "bg-gray-300"
                      }`}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TIÊU ĐỀ NGÀY ĐANG CHỌN & THỐNG KÊ ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">
              {currentDay.name}, Ngày {currentDay.fullDate}
            </h2>
            {currentDay.isToday && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary border border-primary-200">
                Hôm nay
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {mode === "registration"
              ? "Danh sách nhân viên đăng ký ca làm việc • Xem danh sách đăng ký theo ngày và chi nhánh"
              : "Lịch phân công ca làm việc chung toàn bộ nhân sự chi nhánh • Chạm vào từng ca để xem chi tiết"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone="primary">
            <FontAwesomeIcon icon={faCalendar} fontSize={13} /> {dayShifts.length} ca làm việc
          </Badge>
          <Badge tone="gray">
            <FontAwesomeIcon icon={faUsers} fontSize={13} /> {totalStaffInDay} {mode === "registration" ? "lượt đăng ký" : "lượt nhân sự"}
          </Badge>
        </div>
      </div>

      {/* ── DANH SÁCH CÁC CA LÀM VIỆC TRONG NGÀY (ACCORDION GIỐNG MOBILE) ── */}
      <div className="flex flex-col gap-4">
        {dayShifts.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            <FontAwesomeIcon icon={faCalendar} fontSize={30} className="text-gray-200" />
            <p className="text-sm text-gray-400 mt-3">Chưa có ca làm việc nào trong ngày này</p>
          </div>
        )}
        {dayShifts.map((shift) => {
          const isExpanded = !!expandedShifts[shift.id];

          // Lọc nhân sự theo ô tìm kiếm và trạng thái checkin
          const visibleStaff = shift.staffList.filter((s) => {
            const matchesStatus =
              statusFilter === "all"
                ? true
                : statusFilter === "checked_in"
                ? s.checkInStatus === "checked_in" || s.checkInStatus === "in_progress"
                : s.checkInStatus === "not_yet";

            return matchesStatus;
          });

          const getStatusBadge = () => {
            if (shift.status === "completed") {
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <FontAwesomeIcon icon={faCheck} fontSize={13} /> Đã hoàn thành
                </span>
              );
            }
            if (shift.status === "active") {
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  Đang diễn ra
                </span>
              );
            }
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                <FontAwesomeIcon icon={faClock} fontSize={13} /> Sắp diễn ra
              </span>
            );
          };

          const getShiftIcon = () => {
            if (shift.iconType === "morning") {
              return (
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
                  <FontAwesomeIcon icon={faSun} fontSize={22} />
                </div>
              );
            }
            if (shift.iconType === "afternoon") {
              return (
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200 shrink-0">
                  <FontAwesomeIcon icon={faCloudSun} fontSize={22} />
                </div>
              );
            }
            return (
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200 shrink-0">
                <FontAwesomeIcon icon={faMoon} fontSize={22} />
              </div>
            );
          };

          return (
            <div
              key={shift.id}
              className={`bg-white border rounded-xl overflow-hidden transition-all shadow-xs ${
                isExpanded
                  ? "border-primary/40 ring-1 ring-primary/10"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {/* Header ca làm việc (Clickable để xổ xuống) */}
              <div
                onClick={() => toggleExpand(shift.id)}
                className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-gray-50/70 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getShiftIcon()}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900 text-sm md:text-base truncate">
                        {shift.shiftName}
                      </h3>
                      {getStatusBadge()}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1 font-mono font-medium text-gray-700">
                        <FontAwesomeIcon icon={faClock} fontSize={13} className="text-gray-400" />
                        {shift.timeRange}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200">
                    <FontAwesomeIcon icon={faUsers} fontSize={14} className="text-primary" />
                    {shift.staffList.length} {mode === "registration" ? "đăng ký" : "nhân sự"}
                  </span>

                  {mode !== "registration" && onOpenAssignModal && shift.templateId && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAssignModal(
                          shift.templateId!,
                          currentDay.fullDate,
                          selectedBranch === "all" ? "all" : selectedBranch
                        );
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary-50 text-primary hover:bg-primary hover:text-white transition-all cursor-pointer"
                      title="Phân công nhân sự vào ca này"
                    >
                      Thêm NV
                    </button>
                  )}

                  <div className="text-gray-400 p-1">
                    {isExpanded ? (
                      <FontAwesomeIcon icon={faChevronUp} fontSize={20} className="text-primary" />
                    ) : (
                      <FontAwesomeIcon icon={faChevronDown} fontSize={20} />
                    )}
                  </div>
                </div>
              </div>

              {/* Danh sách nhân sự trong ca khi mở rộng */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/50 p-3">
                  {visibleStaff.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-xs">
                      {mode === "registration" ? "Chưa có nhân viên đăng ký ca này" : "Trống (Chưa có nhân sự được phân công)"}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                      {visibleStaff.map((staff) => {
                        const isCheckedIn =
                          staff.checkInStatus === "checked_in" ||
                          staff.checkInStatus === "in_progress";

                        return (
                          <div
                            key={staff.id}
                            onClick={() => { setDetailStaff(staff); setDetailShift(shift); setDetailOpen(true); }}
                            className="bg-white border border-gray-200 rounded-xl p-2.5 flex items-center justify-between gap-2.5 shadow-2xs hover:shadow-xs transition-shadow cursor-pointer hover:border-primary/30"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${
                                  isCheckedIn
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-gray-100 text-gray-600 border-gray-200"
                                }`}
                              >
                                {staff.avatarLetter}
                              </div>

                              <div className="min-w-0">
                                <div className="font-bold text-gray-900 text-sm truncate">
                                  {staff.name}{staff.phone ? ` - ${staff.phone}` : ""}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {staff.role} • Chi nhánh {staff.branch && staff.branch.startsWith("c") && staff.branch.length >= 20 ? "Quận 1" : staff.branch}
                                </div>

                                {/* Trạng thái Check-in hoặc Đã đăng ký */}
                                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                  {mode === "registration" ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                      <FontAwesomeIcon icon={faUserCheck} fontSize={12} />
                                      Đã đăng ký ca
                                    </span>
                                  ) : (
                                    <>
                                      {staff.checkInStatus === "checked_in" && (() => {
                                        const isLate = (() => {
                                          if (!staff.checkInTime || !shift.timeRange) return false;
                                          const startStr = shift.timeRange.split("-")[0]?.trim().split(" ")[0];
                                          if (!startStr) return false;
                                          const [sh, sm] = startStr.split(":").map(Number);
                                          const [ch, cm] = staff.checkInTime.split(":").map(Number);
                                          if ([sh, sm, ch, cm].some((n) => Number.isNaN(n))) return false;
                                          return ch * 60 + cm - (sh * 60 + sm) > gracePeriodMinutes;
                                        })();
                                        return (
                                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${isLate ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                                            <FontAwesomeIcon icon={faUserCheck} fontSize={12} />
                                            {isLate ? "Trễ" : "Đúng giờ"}
                                          </span>
                                        );
                                      })()}
                                      {staff.checkInStatus === "in_progress" && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                                          Đang trong ca
                                        </span>
                                      )}
                                      {staff.checkInStatus === "not_yet" && (() => {
                                        const isForgot = (() => {
                                          if (shift.status === "completed") return true;
                                          const now = new Date();
                                          const today = new Date();
                                          today.setHours(0, 0, 0, 0);
                                          const parsedDay = parseDate(currentDay.fullDate);
                                          if (!parsedDay) return false;
                                          const dayDate = new Date(parsedDay);
                                          dayDate.setHours(0, 0, 0, 0);
                                          if (dayDate.getTime() < today.getTime()) return true;
                                          if (dayDate.getTime() > today.getTime()) return false;
                                          // Hôm nay: nếu giờ hiện tại đã qua giờ bắt đầu ca mà chưa check-in -> Quên chấm công
                                          const startStr = shift.timeRange.split("-")[0]?.trim().split(" ")[0];
                                          if (!startStr) return false;
                                          const [sh, sm] = startStr.split(":").map(Number);
                                          if (Number.isNaN(sh) || Number.isNaN(sm)) return false;
                                          const currentMin = now.getHours() * 60 + now.getMinutes();
                                          const startMin = sh * 60 + sm;
                                          return currentMin >= startMin;
                                        })();
                                        return (
                                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${isForgot ? "bg-red-50 text-red-700 border-red-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                            <FontAwesomeIcon icon={faCircleExclamation} fontSize={12} />
                                            {isForgot ? "Quên chấm công" : "Chưa chấm công"}
                                          </span>
                                        );
                                      })()}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <StaffShiftDetailModal
        mode={mode}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        gracePeriodMinutes={gracePeriodMinutes}
        staff={(() => {
          if (!detailStaff) return null;
          const found = dayShifts.flatMap((s) => s.staffList).find((s) => s.id === detailStaff.id);
          return found || detailStaff;
        })()}
        shift={detailShift}
        day={currentDay}
        onCancelShift={(staffId) => {
          const targetStaff = dayShifts.flatMap((s) => s.staffList).find((s) => s.id === staffId);
          const realId = targetStaff?.rawId || (staffId.startsWith("reg-") ? staffId.replace(/^reg-/, "").replace(/-\d+$/, "") : staffId.startsWith("api-") ? staffId.split("-")[1] : staffId);
          if (mode === "registration") {
            if (onDeleteRegistration) {
              onDeleteRegistration(realId);
            }
          } else if (onDeleteShift) {
            onDeleteShift(realId);
          }
          setCanceledIds((prev) => new Set(prev).add(staffId));
        }}
        onCheckIn={(staffId) => {
          const now = new Date();
          const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
          setStaffOverrides((prev) => ({ ...prev, [staffId]: { checkInStatus: "checked_in", checkInTime: time } }));
        }}
        onCheckOut={(staffId) => {
          const now = new Date();
          const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
          setStaffOverrides((prev) => ({
            ...prev,
            [staffId]: {
              ...prev[staffId],
              checkInStatus: "checked_in",
              checkInTime: prev[staffId]?.checkInTime ?? detailStaff?.checkInTime ?? "07:00",
              checkOutTime: time,
            },
          }));
        }}
        onSupplement={(staffId) => {
          const now = new Date();
          const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
          setStaffOverrides((prev) => ({ ...prev, [staffId]: { checkInStatus: "checked_in", checkInTime: time } }));
        }}
      />
    </div>
  );
}
