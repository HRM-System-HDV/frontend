export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  author: string;
  date: string;
  tag: string;
  tagTone: "danger" | "warning" | "success" | "primary" | "gray";
  pinned?: boolean;
}
