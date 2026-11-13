export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  publishDate: string; // ISO YYYY-MM-DD (BE serialize trả về dạng này)
  tag: string;
  pinned?: boolean;
  branchId: string | null;
  authorName?: string; // BE tự gán từ phiên đăng nhập khi tạo tin
  createdAt?: string; // ISO datetime, dùng làm tie-break khi hai tin cùng publishDate
}
