import type { RegulationStatus } from "@/types";

export function getStatusTone(status: RegulationStatus) {
  switch (status) {
    case "hiệu lực":
      return "success";
    case "dự thảo":
      return "warning";
    case "hết hiệu lực":
      return "gray";
    default:
      return "primary";
  }
}

export function getCategoryColor(cat: string) {
  switch (cat) {
    case "Nội quy lao động":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "Chấm công & Kỷ luật":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Thưởng & Kỷ luật":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "An toàn lao động":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "Bảo mật & Dữ liệu":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}
