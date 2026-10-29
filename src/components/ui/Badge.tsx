import { cn } from "@/lib/utils";

type BadgeTone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "gray"
  | "dark";

const toneClasses: Record<BadgeTone, string> = {
  primary: "bg-primary-100 text-primary-700",
  success: "bg-success-100 text-success-700",
  warning: "bg-warning-100 text-warning-700",
  danger: "bg-danger-100 text-danger-700",
  info: "bg-info-100 text-info-700",
  gray: "bg-gray-100 text-gray-600",
  dark: "bg-gray-800 text-white",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
}

export default function Badge({
  tone = "gray",
  dot = false,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        toneClasses[tone],
        className
      )}
      {...rest}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />}
      {children}
    </span>
  );
}

/** Badge tự map theo trạng thái tiếng Việt trong spec */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: BadgeTone; label: string }> = {
    "Hoạt động": { tone: "success", label: "Hoạt động" },
    "Đang hoạt động": { tone: "success", label: "Đang hoạt động" },
    active: { tone: "success", label: "Hoạt động" },
    "Bị khóa": { tone: "danger", label: "Bị khóa" },
    locked: { tone: "danger", label: "Bị khóa" },
    "Vô hiệu hóa": { tone: "gray", label: "Vô hiệu hóa" },
    "Ngưng kích hoạt": { tone: "gray", label: "Ngưng kích hoạt" },
    inactive: { tone: "gray", label: "Ngưng" },
    "Đã thanh toán": { tone: "success", label: "Đã thanh toán" },
    "Chưa thanh toán": { tone: "warning", label: "Chưa thanh toán" },
    "Đã hủy": { tone: "danger", label: "Đã hủy" },
    "Đang mở": { tone: "primary", label: "Đang mở" },
    "Đã kết ca": { tone: "gray", label: "Đã kết ca" },
    "Mới": { tone: "primary", label: "Mới" },
    "Đang xử lý": { tone: "warning", label: "Đang xử lý" },
    "Đã xử lý": { tone: "success", label: "Đã xử lý" },
    "Đã đóng": { tone: "gray", label: "Đã đóng" },
    "Khẩn cấp": { tone: "danger", label: "Khẩn cấp" },
    "Cao": { tone: "danger", label: "Cao" },
    "Trung bình": { tone: "warning", label: "Trung bình" },
    "Thấp": { tone: "gray", label: "Thấp" },
    "Thành công": { tone: "success", label: "Thành công" },
    "Sai nội dung": { tone: "warning", label: "Sai nội dung" },
    "Lỗi": { tone: "danger", label: "Lỗi" },
    "Còn hàng": { tone: "success", label: "Còn hàng" },
    "Hết hàng": { tone: "danger", label: "Hết hàng" },
    "Trống": { tone: "gray", label: "Trống" },
    "Đang phục vụ": { tone: "primary", label: "Đang phục vụ" },
    "Chờ duyệt": { tone: "warning", label: "Chờ duyệt" },
    "Đã duyệt": { tone: "success", label: "Đã duyệt" },
    "Từ chối": { tone: "danger", label: "Từ chối" },
    "Chưa chốt": { tone: "warning", label: "Chưa chốt" },
    "Đã chốt": { tone: "success", label: "Đã chốt" },
    "đã gọi": { tone: "success", label: "Đã gọi" },
    "đang gọi": { tone: "warning", label: "Đang gọi" },
    "Đang tạo": { tone: "warning", label: "Đang tạo" },
    "Đã xuất": { tone: "success", label: "Đã xuất" },
    "Đúng giờ": { tone: "success", label: "Đúng giờ" },
    "Trễ": { tone: "warning", label: "Trễ" },
    "Về sớm": { tone: "danger", label: "Về sớm" },
    "Chưa làm": { tone: "gray", label: "Chưa làm" },
  };
  const matched = map[status] ?? { tone: "gray" as BadgeTone, label: status };

  return <Badge tone={matched.tone}>{matched.label}</Badge>;
}
