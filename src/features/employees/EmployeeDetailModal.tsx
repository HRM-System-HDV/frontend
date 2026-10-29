"use client";

import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPencil,
  faCheck,
  faXmark,
  faUser,
  faBuilding,
  faIdCard,
  faMoneyBillWave,
  faShieldHalved,
  faBuildingColumns,
  faInfoCircle,
  faLocationDot,
  faHouse,
  faCloudArrowUp,
  faTrashCan,
  faEye,
  faImage,
  faSpinner,
  faRotateRight,
  faCamera,
} from "@fortawesome/free-solid-svg-icons";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";
import { StatusBadge } from "@/components/ui/Badge";
import type { Employee, UserRole, Branch, Department } from "@/types";
import { apiPost } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  employee: Employee | null;
  branches?: Branch[];
  departments?: Department[];
  onSave?: (updated: Employee) => Promise<Employee | void>;
  onDelete?: (employee: Employee) => void;
  isManager?: boolean;
  managerBranch?: string;
}

const COMMON_BANKS = [
  "Vietcombank",
  "VietinBank",
  "BIDV",
  "Techcombank",
  "MBBank",
  "Agribank",
  "VPBank",
  "ACB",
  "TPBank",
  "Sacombank",
  "HDBank",
  "VIB",
];

type DetailTab = "profile" | "job" | "salary" | "cccd";

export default function EmployeeDetailModal({
  open,
  onClose,
  employee,
  branches = [],
  departments = [],
  onSave,
  onDelete,
  isManager = false,
  managerBranch = "",
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("profile");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // 1. Hồ sơ cá nhân & Liên hệ
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("Nam");
  const [birthDate, setBirthDate] = useState("");

  // 2. Địa chỉ hiện tại
  const [province, setProvince] = useState("");
  const [ward, setWard] = useState("");
  const [street, setStreet] = useState("");

  // 3. Công tác & Phân quyền
  const [branch, setBranch] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");
  const [systemRole, setSystemRole] = useState<UserRole>("staff");
  const [status, setStatus] = useState<"đang làm" | "vô hiệu hóa">("đang làm");
  const [joinDate, setJoinDate] = useState("");

  // 4. Tiền lương & Ngân hàng
  const [salaryType, setSalaryType] = useState<"hourly" | "monthly">("monthly");
  const [hourlySalary, setHourlySalary] = useState<number>(0);
  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");

  // 5. Thông tin CCCD
  const [cccd, setCccd] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [issuePlace, setIssuePlace] = useState("");
  const [cccdFront, setCccdFront] = useState("");
  const [cccdBack, setCccdBack] = useState("");
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Avatar
  const [avatar, setAvatar] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  // Đồng bộ dữ liệu khi mở modal hoặc thay đổi employee
  useEffect(() => {
    if (employee) {
      setName(employee.name);
      setPhone(employee.phone);
      setEmail(employee.email);
      setGender(employee.gender || "");
      setBirthDate(employee.birthDate || "");

      setProvince(employee.province || "");
      setWard(employee.ward || "");
      setStreet(employee.street || "");

      setBranch((employee.branch || "").toUpperCase());
      setDepartment(employee.department || "");
      setRole(employee.role);
      setSystemRole(employee.systemRole || "staff");
      setStatus(employee.status);
      setJoinDate(employee.joinDate || "");

      setSalaryType(employee.salaryType || "monthly");
      setHourlySalary(employee.hourlySalary ?? 0);
      setBaseSalary(employee.baseSalary ?? 0);
      setBankName(employee.bankName || "");
      setBankAccountNumber(employee.bankAccountNumber || "");
      setBankAccountName(employee.bankAccountName || "");

      setCccd(employee.cccd || "");
      setIssueDate(employee.issueDate || "");
      setIssuePlace(employee.issuePlace || "");
      setCccdFront(typeof employee.cccdFront === "string" ? employee.cccdFront : "");
      setCccdBack(typeof employee.cccdBack === "string" ? employee.cccdBack : "");
      setAvatar(employee.avatar || "");
      setUploadingFront(false);
      setUploadingBack(false);
      setUploadingAvatar(false);
      setPreviewImage(null);

      setIsEditing(false);
      setActiveTab("profile");
      setSaveError("");
    }
  }, [employee, open]);

  if (!employee) return null;

  const handleCancelEdit = () => {
    // Hoàn tác về thông tin ban đầu
    setName(employee.name);
    setPhone(employee.phone);
    setEmail(employee.email);
    setGender(employee.gender || "");
    setBirthDate(employee.birthDate || "");

    setProvince(employee.province || "");
    setWard(employee.ward || "");
    setStreet(employee.street || "");

    setBranch((employee.branch || "").toUpperCase());
    setDepartment(employee.department || "");
    setRole(employee.role);
    setSystemRole(employee.systemRole || "staff");
    setStatus(employee.status);
    setJoinDate(employee.joinDate || "");

    setSalaryType(employee.salaryType || "monthly");
    setHourlySalary(employee.hourlySalary ?? 0);
    setBaseSalary(employee.baseSalary ?? 0);
    setBankName(employee.bankName || "");
    setBankAccountNumber(employee.bankAccountNumber || "");
    setBankAccountName(employee.bankAccountName || "");

    setCccd(employee.cccd || "");
    setIssueDate(employee.issueDate || "");
    setIssuePlace(employee.issuePlace || "");
    setCccdFront(typeof employee.cccdFront === "string" ? employee.cccdFront : "");
    setCccdBack(typeof employee.cccdBack === "string" ? employee.cccdBack : "");
    setAvatar(employee.avatar || "");
    setUploadingFront(false);
    setUploadingBack(false);
    setUploadingAvatar(false);

    setSaveError("");
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setSaveError("Vui lòng nhập họ và tên nhân viên");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setSaveError("Vui lòng nhập địa chỉ email hợp lệ");
      return;
    }

    const updated: Employee = {
      ...employee,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      gender,
      birthDate,
      province,
      ward,
      street,
      branch: isManager ? managerBranch : branch,
      department,
      role,
      systemRole,
      status,
      joinDate,
      salaryType,
      hourlySalary: Number(hourlySalary) || 0,
      baseSalary: Number(baseSalary) || 0,
      bankName,
      bankAccountNumber: bankAccountNumber.trim(),
      bankAccountName: bankAccountName.trim().toUpperCase(),
      cccd,
      issueDate,
      issuePlace,
      cccdFront: cccdFront.trim(),
      cccdBack: cccdBack.trim(),
      avatar: avatar.trim(),
    };

    try {
      setSaving(true);
      setSaveError("");
      if (onSave) await onSave(updated);
      setIsEditing(false);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Không thể lưu thay đổi vào cơ sở dữ liệu");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setSaveError("Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, WEBP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSaveError("Dung lượng ảnh đại diện tối đa 5MB");
      return;
    }

    try {
      setUploadingAvatar(true);
      setSaveError("");

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Không thể đọc file ảnh"));
        reader.readAsDataURL(file);
      });

      try {
        const res = await apiPost<{ url: string }>("/api/upload", {
          file: dataUrl,
          folder: "hrm/avatars",
        });
        if (res && res.url) {
          setAvatar(res.url);
          return;
        }
      } catch (uploadErr) {
        console.warn("Upload API không khả dụng, dùng data URL:", uploadErr);
      }

      setAvatar(dataUrl);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Lỗi khi xử lý ảnh đại diện");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleFileUpload = async (file: File, side: "front" | "back") => {
    if (!file.type.startsWith("image/")) {
      setSaveError("Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, WEBP)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setSaveError("Dung lượng ảnh tối đa 10MB");
      return;
    }

    const setUploading = side === "front" ? setUploadingFront : setUploadingBack;
    const setTarget = side === "front" ? setCccdFront : setCccdBack;

    try {
      setUploading(true);
      setSaveError("");

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Không thể đọc file ảnh"));
        reader.readAsDataURL(file);
      });

      try {
        const res = await apiPost<{ url: string }>("/api/upload", {
          file: dataUrl,
          folder: "hrm/cccd",
        });
        if (res && res.url) {
          setTarget(res.url);
          return;
        }
      } catch (uploadErr) {
        console.warn("Upload API không khả dụng, dùng data URL:", uploadErr);
      }

      setTarget(dataUrl);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Lỗi khi xử lý ảnh CCCD");
    } finally {
      setUploading(false);
    }
  };

  const getSystemRoleLabel = (r: UserRole) => {
    switch (r) {
      case "admin":
        return "Quản trị viên (Admin)";
      case "manager":
        return "Quản lý Chi nhánh (Manager)";
      case "staff":
      default:
        return "Nhân viên (Staff)";
    }
  };

  const fullAddress = (
    isEditing
      ? [street, ward, province]
      : [employee.street, employee.ward, employee.province]
  )
    .filter(Boolean)
    .join(", ");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Chỉnh sửa hồ sơ nhân viên" : "Hồ sơ chi tiết nhân sự"}
      size="2xl"
      footer={
        isEditing ? (
          <>
            {onDelete && !isManager && employee && (
              <Button
                type="button"
                variant="danger"
                className="mr-auto"
                disabled={saving}
                onClick={() => onDelete(employee)}
              >
                Xóa
              </Button>
            )}
            <Button variant="white" onClick={handleCancelEdit} disabled={saving}>
              <FontAwesomeIcon icon={faXmark} className="mr-1.5" />
              Huỷ
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <FontAwesomeIcon icon={faCheck} className="mr-1.5" />
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </>
        ) : (
          <>
            {onDelete && !isManager && employee && (
              <Button
                type="button"
                variant="danger"
                className="mr-auto"
                onClick={() => onDelete(employee)}
              >
                Xóa
              </Button>
            )}
            <Button variant="white" onClick={onClose}>
              Đóng
            </Button>
            <Button onClick={() => setIsEditing(true)}>
              <FontAwesomeIcon icon={faPencil} className="mr-1.5" />
              Sửa
            </Button>
          </>
        )
      }
    >
      <div className="space-y-6">
        {saveError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {saveError}
          </div>
        )}

        {/* ===================== HERO PROFILE CARD ===================== */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-50 via-white to-gray-50 border border-gray-200 p-5 sm:p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4 min-w-0">
              {/* Hidden avatar input */}
              <input
                type="file"
                ref={avatarInputRef}
                className="hidden"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleAvatarUpload(f);
                  e.target.value = "";
                }}
              />

              {/* Avatar frame */}
              <div className="relative group shrink-0">
                <div
                  onClick={() => {
                    if (isEditing) {
                      avatarInputRef.current?.click();
                    } else if (avatar || employee.avatar) {
                      setPreviewImage({
                        url: avatar || employee.avatar || "",
                        title: `Ảnh đại diện — ${employee.name}`,
                      });
                    }
                  }}
                  className={`w-16 h-16 rounded-2xl overflow-hidden border-2 flex items-center justify-center transition-all ${
                    isEditing
                      ? "cursor-pointer border-primary/40 hover:border-primary shadow-md hover:shadow-lg"
                      : (avatar || employee.avatar)
                      ? "cursor-pointer border-primary/20 hover:border-primary/50 shadow-inner"
                      : "border-primary/20 bg-primary/10 text-primary shadow-inner"
                  }`}
                  title={isEditing ? "Bấm để chọn ảnh đại diện mới" : "Ảnh đại diện"}
                >
                  {uploadingAvatar ? (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-xs">
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin text-lg" />
                    </div>
                  ) : (isEditing ? avatar : (employee.avatar || avatar)) ? (
                    <img
                      src={isEditing ? avatar : (employee.avatar || avatar)}
                      alt={employee.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-black text-primary">
                      {(isEditing ? name || employee.name : employee.name).charAt(0)}
                    </span>
                  )}

                  {/* Overlay camera icon in edit mode */}
                  {isEditing && !uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity rounded-2xl">
                      <FontAwesomeIcon icon={faCamera} className="text-sm mb-0.5" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Đổi ảnh</span>
                    </div>
                  )}
                </div>

                {/* Nút nhỏ xóa avatar khi đang edit nếu đã có avatar */}
                {isEditing && avatar && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAvatar("");
                    }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-[10px] shadow-sm cursor-pointer transition-transform hover:scale-110"
                    title="Xóa ảnh đại diện"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight truncate">
                    {isEditing ? name || employee.name : employee.name}
                  </h3>
                  <StatusBadge status={isEditing ? status : employee.status} />
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border ${
                      (isEditing ? salaryType : employee.salaryType) === "hourly"
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200"
                    }`}
                  >
                    {(isEditing ? salaryType : employee.salaryType) === "hourly"
                      ? "Lương theo giờ"
                      : "Lương cơ bản tháng"}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-x-4 gap-y-1 text-xs text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <strong className="text-gray-700">Mã NV:</strong>
                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-800 font-semibold">
                      {employee.id}
                    </span>
                  </span>
                  <span>•</span>
                  <span>
                    Chi nhánh: <strong className="text-gray-800">{isEditing ? branch : employee.branch}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Phòng ban: <strong className="text-gray-800">{isEditing ? department : employee.department || "Chưa gán"}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Chức danh: <strong className="text-gray-800">{isEditing ? role : employee.role}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Trạng thái chỉnh sửa */}
            {isEditing && (
              <div className="shrink-0 flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faPencil} className="text-amber-600" />
                  Đang chỉnh sửa
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===================== TABBED NAVIGATION ===================== */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-px" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={`py-2.5 px-3.5 inline-flex items-center gap-2 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === "profile"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <FontAwesomeIcon icon={faUser} />
              1. Hồ sơ cá nhân & Địa chỉ
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("job")}
              className={`py-2.5 px-3.5 inline-flex items-center gap-2 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === "job"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <FontAwesomeIcon icon={faBuilding} />
              2. Công tác & Phân quyền
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("salary")}
              className={`py-2.5 px-3.5 inline-flex items-center gap-2 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === "salary"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <FontAwesomeIcon icon={faMoneyBillWave} />
              3. Tiền lương & Ngân hàng
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("cccd")}
              className={`py-2.5 px-3.5 inline-flex items-center gap-2 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === "cccd"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <FontAwesomeIcon icon={faIdCard} />
              4. Định danh CCCD
            </button>
          </nav>
        </div>

        {/* ===================== TAB CONTENT AREA ===================== */}

        {/* ----- TAB 1: HỒ SƠ CÁ NHÂN & ĐỊA CHỈ ----- */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            {!isEditing ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Khối 1: Thông tin cá nhân */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm">
                      <FontAwesomeIcon icon={faUser} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">Thông tin cá nhân cơ bản</h4>
                      <p className="text-xs text-gray-500">Đồng bộ hồ sơ tài khoản hệ thống</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Họ và tên:</span>
                      <span className="font-bold text-gray-900 text-sm">{employee.name}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Giới tính:</span>
                      <span className="font-semibold text-gray-800 text-xs">
                        {employee.gender || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Ngày sinh:</span>
                      <span className="font-semibold text-gray-800 text-xs">
                        {employee.birthDate || "Chưa cập nhật"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Số điện thoại:</span>
                      <span className="font-mono font-semibold text-gray-900 text-xs">
                        {employee.phone}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-gray-500 text-xs">Email công việc:</span>
                      <span className="font-medium text-primary text-xs">{employee.email}</span>
                    </div>
                  </div>
                </div>

                {/* Khối 2: Địa chỉ hiện tại */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm">
                      <FontAwesomeIcon icon={faHouse} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">Địa chỉ cư trú hiện tại</h4>
                      <p className="text-xs text-gray-500">Nơi ở và địa chỉ liên lạc thường trú</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Tỉnh / Thành phố:</span>
                      <span className="font-semibold text-gray-800 text-xs">
                        {employee.province || "Chưa cập nhật"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Phường:</span>
                      <span className="font-semibold text-gray-800 text-xs">
                        {employee.ward || "Chưa cập nhật"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Số nhà / Tên đường:</span>
                      <span className="font-semibold text-gray-800 text-xs">
                        {employee.street || "Chưa cập nhật"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-gray-500 text-xs">Địa chỉ:</span>
                      <span className="font-semibold text-gray-800 text-xs text-right max-w-[65%]">
                        {fullAddress || "Chưa cập nhật"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Edit mode Tab 1 */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <FontAwesomeIcon icon={faUser} /> Thông tin cá nhân
                  </h5>
                  <Field label="Họ và tên nhân viên" required>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Giới tính" required>
                      <Select value={gender} onChange={(e) => setGender(e.target.value)}>
                        <option value="">— Chọn giới tính —</option>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </Select>
                    </Field>
                    <Field label="Ngày sinh" required>
                      <Input
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        placeholder="dd/mm/yyyy"
                      />
                    </Field>
                  </div>
                  <Field label="Số điện thoại" required>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0912345678"
                    />
                  </Field>
                  <Field label="Email công việc" required>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@company.com"
                    />
                  </Field>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-2">
                    <FontAwesomeIcon icon={faHouse} /> Địa chỉ cư trú
                  </h5>
                  <Field label="Tỉnh / Thành phố" required>
                    <Input
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      placeholder="Hà Nội / TP. Hồ Chí Minh / Đà Nẵng..."
                    />
                  </Field>
                  <Field label="Phường" required>
                    <Input
                      value={ward}
                      onChange={(e) => setWard(e.target.value)}
                      placeholder="Phường Tràng Tiền / Phường Hàng Bài..."
                    />
                  </Field>
                  <Field label="Số nhà / Tên đường" required>
                    <Input
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="12 Tràng Thi / 15 Phố Hàng Bài..."
                    />
                  </Field>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----- TAB 2: CÔNG TÁC & PHÂN QUYỀN ----- */}
        {activeTab === "job" && (
          <div className="space-y-6">
            {!isEditing ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Khối vị trí công tác */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm">
                      <FontAwesomeIcon icon={faBuilding} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">Cơ cấu & Vị trí công tác</h4>
                      <p className="text-xs text-gray-500">Đơn vị chi nhánh và phòng ban trực thuộc</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Mã nhân viên (ID):</span>
                      <span className="font-mono font-bold text-gray-900 text-xs">{employee.id}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Chi nhánh làm việc:</span>
                      <span className="font-semibold text-primary text-xs">
                        {employee.branch}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Phòng ban:</span>
                      <span className="font-semibold text-gray-800 text-xs">
                        {employee.department || "Chưa gán"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-gray-500 text-xs">Vị trí chức danh:</span>
                      <span className="font-bold text-gray-900 text-xs">{employee.role}</span>
                    </div>
                  </div>
                </div>

                {/* Khối phân quyền hệ thống */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-sm">
                      <FontAwesomeIcon icon={faShieldHalved} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">Phân quyền & Trạng thái</h4>
                      <p className="text-xs text-gray-500">Phạm vi thao tác trên cổng thông tin</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Cấp vai trò:</span>
                      <span className="font-bold text-purple-700 text-xs">
                        {getSystemRoleLabel(employee.systemRole)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Trạng thái hoạt động:</span>
                      <StatusBadge status={employee.status} />
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Ngày vào làm việc:</span>
                      <span className="font-semibold text-gray-800 text-xs">
                        {employee.joinDate || "Chưa cập nhật"}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 text-xs text-purple-900 space-y-1.5">
                      <div className="font-bold flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faInfoCircle} className="text-purple-600" />
                        Phạm vi quyền hạn:
                      </div>
                      <p className="text-[11px] leading-relaxed text-purple-800">
                        {employee.systemRole === "admin"
                          ? "Toàn quyền quản trị tất cả các phân hệ, quản lý tất cả chi nhánh, cấu hình Wi-Fi, bảng lương và cổng SOAP Ngân hàng."
                          : employee.systemRole === "manager"
                          ? "Quản lý vận hành chi nhánh phụ trách: xếp ca, phê duyệt đề xuất đổi ca / nghỉ phép, giám sát quân số trực ca thời gian thực."
                          : "Thao tác cá nhân: xem ca làm, đăng ký ca tuần tới, chấm công Wi-Fi chi nhánh, xin đổi ca và xem phiếu lương."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Edit mode Tab 2 */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <FontAwesomeIcon icon={faBuilding} /> Vị trí công tác
                  </h5>
                  <Field label="Chi nhánh làm việc" required>
                    {isManager ? (
                      <div className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-bold text-gray-800 flex items-center justify-between">
                        <span>{managerBranch}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-primary-50 text-primary border border-primary-200">
                          Cố định theo quản lý
                        </span>
                      </div>
                    ) : (
                      <Select value={branch} onChange={(e) => setBranch(e.target.value)}>
                        <option value="">— Chọn chi nhánh —</option>
                        {branch && !branches.some((b) => b.slug.toUpperCase() === branch) && (
                          <option value={branch}>{branch}</option>
                        )}
                        {branches.map((b) => (
                          <option key={b.id} value={b.slug.toUpperCase()}>
                            {b.name} ({b.slug.toUpperCase()})
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>

                  <Field label="Phòng ban trực thuộc" required>
                    <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
                      <option value="">— Chọn phòng ban —</option>
                      {department && !departments.some((d) => d.name === department) && (
                        <option value={department}>{department}</option>
                      )}
                      {departments.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Vị trí / Chức vụ" required>
                    <Input
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="Nhân viên kinh doanh / Thu ngân..."
                    />
                  </Field>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center gap-2">
                    <FontAwesomeIcon icon={faShieldHalved} /> Quyền hạn & Trạng thái
                  </h5>
                  <Field label="Cấp vai trò hệ thống" required>
                    <Select
                      value={systemRole}
                      onChange={(e) => setSystemRole(e.target.value as UserRole)}
                      disabled={isManager}
                    >
                      <option value="staff">Nhân viên (Staff)</option>
                      <option value="manager">Quản lý Chi nhánh (Manager)</option>
                      <option value="admin">Quản trị viên (Admin)</option>
                    </Select>
                  </Field>

                  <Field label="Trạng thái tài khoản" required>
                    <Select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as "đang làm" | "vô hiệu hóa")}
                    >
                      <option value="đang làm">Đang làm</option>
                      <option value="vô hiệu hóa">Vô hiệu hóa</option>
                    </Select>
                  </Field>

                  <Field label="Ngày vào làm việc" required>
                    <Input
                      value={joinDate}
                      onChange={(e) => setJoinDate(e.target.value)}
                      placeholder="01/01/2024"
                    />
                  </Field>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----- TAB 3: TIỀN LƯƠNG & NGÂN HÀNG ----- */}
        {activeTab === "salary" && (
          <div className="space-y-6">
            {!isEditing ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Khối cơ chế tính lương */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm">
                      <FontAwesomeIcon icon={faMoneyBillWave} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">Cơ chế tiền lương & Chấm công</h4>
                      <p className="text-xs text-gray-500">Quy tắc tính thù lao khi hoàn thành ca làm</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Hình thức tính lương:</span>
                      <span className="font-bold text-gray-900 text-xs">
                        {employee.salaryType === "hourly"
                          ? "Lương theo giờ"
                          : "Lương cơ bản tháng"}
                      </span>
                    </div>

                    {employee.salaryType === "hourly" ? (
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-gray-500 text-xs">Đơn giá giờ làm:</span>
                        <span className="font-bold text-amber-700 text-sm">
                          {(employee.hourlySalary ?? 0).toLocaleString("vi-VN")} ₫ / giờ
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-gray-500 text-xs">Lương cơ bản tháng:</span>
                        <span className="font-bold text-emerald-700 text-sm">
                          {(employee.baseSalary ?? 0).toLocaleString("vi-VN")} ₫ / tháng
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Khối tài khoản ngân hàng */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm">
                      <FontAwesomeIcon icon={faBuildingColumns} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">Tài khoản Ngân hàng nhận lương</h4>
                      <p className="text-xs text-gray-500">Kết nối trực tiếp Cổng SOAP Chi lương</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Ngân hàng:</span>
                      <span className="font-bold text-gray-900 text-xs">
                        {employee.bankName || "Chưa cập nhật"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Số tài khoản (STK):</span>
                      <span className="font-mono font-bold text-primary text-sm tracking-wider">
                        {employee.bankAccountNumber || "Chưa cập nhật"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Chủ tài khoản:</span>
                      <span className="font-bold text-gray-900 text-xs tracking-wide">
                        {employee.bankAccountName || "Chưa cập nhật"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-gray-500 text-xs">Trạng thái giải ngân:</span>
                      <span
                        className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${
                          employee.bankAccountNumber
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {employee.bankAccountNumber
                          ? "Đã cấu hình tài khoản nhận lương"
                          : "Chưa cấu hình tài khoản nhận lương"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Edit mode Tab 3 */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-2">
                    <FontAwesomeIcon icon={faMoneyBillWave} /> Cấu hình cơ chế tiền lương
                  </h5>
                  <Field label="Hình thức tính lương" required>
                    <Select
                      value={salaryType}
                      onChange={(e) => setSalaryType(e.target.value as "hourly" | "monthly")}
                    >
                      <option value="hourly">Lương theo giờ</option>
                      <option value="monthly">Lương cơ bản tháng</option>
                    </Select>
                  </Field>

                  {salaryType === "hourly" ? (
                    <Field label="Mức lương theo giờ (VNĐ/h)" required>
                      <Input
                        type="number"
                        value={hourlySalary}
                        onChange={(e) => setHourlySalary(Number(e.target.value))}
                        placeholder="35000"
                      />
                      <p className="text-[11px] text-amber-700 mt-1">
                        * Khi checkout, tiền công ca sẽ bằng: <strong>Số giờ làm × {Number(hourlySalary || 0).toLocaleString()} ₫</strong>
                      </p>
                    </Field>
                  ) : (
                    <Field label="Mức lương cơ bản tháng (VNĐ/tháng)" required>
                      <Input
                        type="number"
                        value={baseSalary}
                        onChange={(e) => setBaseSalary(Number(e.target.value))}
                        placeholder="8500000"
                      />
                    </Field>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <FontAwesomeIcon icon={faBuildingColumns} /> Tài khoản ngân hàng nhận lương
                  </h5>
                  <Field label="Tên ngân hàng" required>
                    <Select value={bankName} onChange={(e) => setBankName(e.target.value)}>
                      <option value="">— Chọn ngân hàng —</option>
                      {bankName && !COMMON_BANKS.includes(bankName) && (
                        <option value={bankName}>{bankName}</option>
                      )}
                      {COMMON_BANKS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Số tài khoản ngân hàng (STK)" required>
                    <Input
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      placeholder="108876543210"
                    />
                  </Field>

                  <Field label="Tên chủ tài khoản (In hoa không dấu)" required>
                    <Input
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value.toUpperCase())}
                      placeholder="NGUYEN THU HA"
                    />
                  </Field>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----- TAB 4: ĐỊNH DANH CCCD ----- */}
        {activeTab === "cccd" && (
          <div className="space-y-6">
            {!isEditing ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Thông tin Căn cước công dân */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm">
                      <FontAwesomeIcon icon={faIdCard} />
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm">Thông tin Căn cước công dân</h4>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Số CCCD (12 chữ số):</span>
                      <span className="font-mono font-bold text-gray-900 text-sm tracking-wider">
                        {employee.cccd || "Chưa cập nhật"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Ngày cấp:</span>
                      <span className="font-semibold text-gray-800 text-xs">
                        {employee.issueDate || "Chưa cập nhật"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Nơi cấp:</span>
                      <span className="font-semibold text-gray-800 text-xs">
                        {employee.issuePlace || "Chưa cập nhật"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-gray-500 text-xs">Trạng thái định danh:</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold flex items-center gap-1 ${
                          employee.cccd
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {employee.cccd && <FontAwesomeIcon icon={faCheck} className="text-[10px]" />}
                        {employee.cccd ? "Đã cập nhật số CCCD" : "Chưa cập nhật số CCCD"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hình ảnh Căn cước công dân */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs flex flex-col">
                  <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm">
                      <FontAwesomeIcon icon={faImage} />
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm">Hình ảnh Căn cước công dân</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                    {/* Mặt trước view */}
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between text-xs font-semibold text-gray-700 mb-2">
                        <span>Mặt trước</span>
                        {employee.cccdFront && (
                          <span className="text-emerald-600 flex items-center gap-1 text-[11px]">
                            <FontAwesomeIcon icon={faCheck} className="text-[10px]" /> Đã có ảnh
                          </span>
                        )}
                      </div>
                      {typeof employee.cccdFront === "string" && employee.cccdFront ? (
                        <div
                          onClick={() =>
                            setPreviewImage({
                              url: employee.cccdFront as string,
                              title: `CCCD Mặt trước — ${employee.name}`,
                            })
                          }
                          className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex-1 w-full min-h-[170px] cursor-pointer hover:border-primary transition-all shadow-2xs"
                        >
                          <img
                            src={employee.cccdFront}
                            alt="CCCD Mặt trước"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity text-white text-xs font-medium">
                            <FontAwesomeIcon icon={faEye} /> Xem ảnh lớn
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 flex-1 w-full min-h-[170px] flex flex-col items-center justify-center p-3 text-center text-gray-400 gap-1.5">
                          <FontAwesomeIcon icon={faIdCard} className="text-2xl text-gray-300" />
                          <span className="text-xs">Chưa tải lên mặt trước</span>
                        </div>
                      )}
                    </div>

                    {/* Mặt sau view */}
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between text-xs font-semibold text-gray-700 mb-2">
                        <span>Mặt sau</span>
                        {employee.cccdBack && (
                          <span className="text-emerald-600 flex items-center gap-1 text-[11px]">
                            <FontAwesomeIcon icon={faCheck} className="text-[10px]" /> Đã có ảnh
                          </span>
                        )}
                      </div>
                      {typeof employee.cccdBack === "string" && employee.cccdBack ? (
                        <div
                          onClick={() =>
                            setPreviewImage({
                              url: employee.cccdBack as string,
                              title: `CCCD Mặt sau — ${employee.name}`,
                            })
                          }
                          className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex-1 w-full min-h-[170px] cursor-pointer hover:border-primary transition-all shadow-2xs"
                        >
                          <img
                            src={employee.cccdBack}
                            alt="CCCD Mặt sau"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity text-white text-xs font-medium">
                            <FontAwesomeIcon icon={faEye} /> Xem ảnh lớn
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 flex-1 w-full min-h-[170px] flex flex-col items-center justify-center p-3 text-center text-gray-400 gap-1.5">
                          <FontAwesomeIcon icon={faIdCard} className="text-2xl text-gray-300" />
                          <span className="text-xs">Chưa tải lên mặt sau</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Edit mode Tab 4 */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cột 1: Thông tin số CCCD */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                    <FontAwesomeIcon icon={faIdCard} /> Thông tin số CCCD
                  </h5>
                  <Field label="Số CCCD (12 chữ số)" required>
                    <Input
                      value={cccd}
                      onChange={(e) => setCccd(e.target.value)}
                      placeholder="079098012345"
                    />
                  </Field>
                  <Field label="Ngày cấp" required>
                    <Input
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      placeholder="20/05/2021"
                    />
                  </Field>
                  <Field label="Nơi cấp" required>
                    <Input
                      value={issuePlace}
                      onChange={(e) => setIssuePlace(e.target.value)}
                      placeholder="Cục CS QLHC về TTXH"
                    />
                  </Field>
                </div>

                {/* Cột 2: Upload ảnh CCCD */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2 mb-4">
                    <FontAwesomeIcon icon={faImage} /> Ảnh chụp Căn cước công dân
                  </h5>

                  <input
                    type="file"
                    ref={frontInputRef}
                    className="hidden"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f, "front");
                      e.target.value = "";
                    }}
                  />
                  <input
                    type="file"
                    ref={backInputRef}
                    className="hidden"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f, "back");
                      e.target.value = "";
                    }}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                    {/* Upload Mặt trước */}
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between text-xs font-semibold text-gray-700 mb-2">
                        <span>Mặt trước</span>
                        {cccdFront && (
                          <button
                            type="button"
                            onClick={() => setCccdFront("")}
                            className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <FontAwesomeIcon icon={faTrashCan} /> Xóa ảnh
                          </button>
                        )}
                      </div>

                      {uploadingFront ? (
                        <div className="rounded-xl border border-primary/30 bg-primary/5 flex-1 w-full min-h-[190px] flex flex-col items-center justify-center gap-2 text-primary text-xs">
                          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-lg" />
                          <span>Đang tải ảnh lên...</span>
                        </div>
                      ) : cccdFront ? (
                        <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex-1 w-full min-h-[190px] shadow-2xs">
                          <img
                            src={cccdFront}
                            alt="CCCD Mặt trước"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                            <button
                              type="button"
                              onClick={() => frontInputRef.current?.click()}
                              className="px-2.5 py-1.5 rounded-lg bg-white/90 hover:bg-white text-gray-800 text-xs font-semibold shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <FontAwesomeIcon icon={faRotateRight} /> Đổi ảnh
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewImage({ url: cccdFront, title: "CCCD Mặt trước" })}
                              className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-gray-800 text-xs shadow-xs cursor-pointer"
                              title="Xem lớn"
                            >
                              <FontAwesomeIcon icon={faEye} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => frontInputRef.current?.click()}
                          className="rounded-xl border-2 border-dashed border-gray-300 hover:border-primary bg-gray-50 hover:bg-primary/5 flex-1 w-full min-h-[190px] flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-colors gap-2 group"
                        >
                          <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-gray-200 group-hover:border-primary/40 flex items-center justify-center text-gray-500 group-hover:text-primary transition-colors">
                            <FontAwesomeIcon icon={faCloudArrowUp} className="text-base" />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 group-hover:text-primary transition-colors">
                            Tải ảnh mặt trước
                          </span>
                          <span className="text-[10px] text-gray-400">PNG, JPG, WEBP (tối đa 10MB)</span>
                        </div>
                      )}
                    </div>

                    {/* Upload Mặt sau */}
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between text-xs font-semibold text-gray-700 mb-2">
                        <span>Mặt sau</span>
                        {cccdBack && (
                          <button
                            type="button"
                            onClick={() => setCccdBack("")}
                            className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <FontAwesomeIcon icon={faTrashCan} /> Xóa ảnh
                          </button>
                        )}
                      </div>

                      {uploadingBack ? (
                        <div className="rounded-xl border border-primary/30 bg-primary/5 flex-1 w-full min-h-[190px] flex flex-col items-center justify-center gap-2 text-primary text-xs">
                          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-lg" />
                          <span>Đang tải ảnh lên...</span>
                        </div>
                      ) : cccdBack ? (
                        <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex-1 w-full min-h-[190px] shadow-2xs">
                          <img
                            src={cccdBack}
                            alt="CCCD Mặt sau"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                            <button
                              type="button"
                              onClick={() => backInputRef.current?.click()}
                              className="px-2.5 py-1.5 rounded-lg bg-white/90 hover:bg-white text-gray-800 text-xs font-semibold shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <FontAwesomeIcon icon={faRotateRight} /> Đổi ảnh
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewImage({ url: cccdBack, title: "CCCD Mặt sau" })}
                              className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-gray-800 text-xs shadow-xs cursor-pointer"
                              title="Xem lớn"
                            >
                              <FontAwesomeIcon icon={faEye} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => backInputRef.current?.click()}
                          className="rounded-xl border-2 border-dashed border-gray-300 hover:border-primary bg-gray-50 hover:bg-primary/5 flex-1 w-full min-h-[190px] flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-colors gap-2 group"
                        >
                          <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-gray-200 group-hover:border-primary/40 flex items-center justify-center text-gray-500 group-hover:text-primary transition-colors">
                            <FontAwesomeIcon icon={faCloudArrowUp} className="text-base" />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 group-hover:text-primary transition-colors">
                            Tải ảnh mặt sau
                          </span>
                          <span className="text-[10px] text-gray-400">PNG, JPG, WEBP (tối đa 10MB)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox xem ảnh phóng to */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h4 className="text-sm font-bold text-gray-800">{previewImage.title}</h4>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="w-8 h-8 rounded-full hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <div className="p-4 overflow-auto flex items-center justify-center bg-gray-900/5">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
