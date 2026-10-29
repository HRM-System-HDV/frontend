import { cn } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowTrendDown, faArrowTrendUp } from "@fortawesome/free-solid-svg-icons";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  bottomValue?: string;
  description?: string;
  diff?: number;
  tone?: "primary" | "success" | "warning" | "danger" | "info" | "dark";
  onClick?: () => void;
}

const toneClasses: Record<string, { icon: string; bg: string }> = {
  primary: { icon: "text-primary", bg: "bg-primary-50" },
  success: { icon: "text-success", bg: "bg-success-100" },
  warning: { icon: "text-warning-700", bg: "bg-warning-100" },
  danger: { icon: "text-danger", bg: "bg-danger-100" },
  info: { icon: "text-info-700", bg: "bg-info-100" },
  dark: { icon: "text-gray-700", bg: "bg-gray-100" },
};

export default function StatCard({
  title,
  value,
  icon,
  bottomValue,
  description,
  diff,
  tone = "primary",
  onClick,
}: StatCardProps) {
  const t = toneClasses[tone];
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-300 shadow-card p-5 flex flex-col gap-5 h-full transition-shadow hover:shadow-lg",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-700 text-sm">{title}</span>
        <span className={cn("icon-shape w-10 h-10 rounded-lg flex items-center justify-center", t.bg, t.icon)}>
          {icon}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="text-2xl font-bold text-gray-800 leading-none">{value}</div>
        <div className="text-sm text-gray-500">
          {diff !== undefined && (
            <span className={cn("inline-flex items-center gap-0.5 font-semibold mr-1", diff >= 0 ? "text-success" : "text-danger")}>
              {diff >= 0 ? <FontAwesomeIcon icon={faArrowTrendUp} fontSize={14} /> : <FontAwesomeIcon icon={faArrowTrendDown} fontSize={14} />}
              {Math.abs(diff)}%
            </span>
          )}
          {bottomValue && <span className="font-semibold mr-1 text-gray-700">{bottomValue}</span>}
          {description && <span>{description}</span>}
        </div>
      </div>
    </div>
  );
}
