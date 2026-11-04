export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  date: string;
  tag: string;
  tagTone: "danger" | "warning" | "success" | "primary" | "gray";
  pinned?: boolean;
  branch?: string;
}
