import type { NewsItem } from "./types";

export function canManageNews(role: string, branchId: string | null | undefined, item: NewsItem) {
  return role === "admin" || (role === "manager" && !!branchId && item.branchId === branchId);
}

export function getTagColor(tag: string) {
  switch (tag) {
    case "Khẩn cấp":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "Nghỉ lễ":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "Khen thưởng":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Vận hành":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Thông báo":
    default:
      return "bg-blue-50 text-blue-700 border-blue-200";
  }
}
