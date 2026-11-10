import { formatDateTime as formatDateTimeVN } from "@/lib/utils";

export type ArchiveType = "task" | "request" | "notification";export type ArchiveFilterType = "all" | ArchiveType;

export const ARCHIVE_TYPE_LABELS: Record<ArchiveType, string> = {
  task: "Nhiệm vụ",
  request: "Yêu cầu",
  notification: "Thông báo",
};

export const ARCHIVE_FILTER_LABELS: Record<ArchiveFilterType, string> = {
  all: "Tất cả",
  task: "Nhiệm vụ",
  request: "Yêu cầu",
  notification: "Thông báo",
};

export interface ArchiveSelection {
  months?: number;
  cutoffDate?: string;
}

export type ArchiveCounts = Partial<Record<ArchiveType, number>>;

export interface ArchivePreview {
  cutoffDate: string;
  counts: ArchiveCounts;
}

export interface ArchiveRunResult {
  batchId: string;
  cutoffDate: string;
  moved: ArchiveCounts;
  remaining: ArchiveCounts;
}

interface ArchiveMeta {
  archivedAt: string;
  archiveBatchId: string;
  archiveType?: ArchiveType;
}

export interface ArchivedTask extends ArchiveMeta {
  id: string;
  title: string;
  description?: string | null;
  assignedTo?: string | null;
  branchSlug?: string | null;
  dueDate?: string | null;
  status: string;
  sourceType?: string | null;
  assignedByName?: string | null;
  shiftName?: string | null;
  priority?: string | null;
  assignedToEmail?: string | null;
  assignedToName?: string | null;
  completedAt?: string | null;
  requirePhoto?: boolean | null;
  proofPhotoUrl?: string | null;
  photoSubmittedBy?: string | null;
  photoSubmittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArchivedRequest extends ArchiveMeta {
  id: string;
  type: string;
  employeeId: string;
  targetEmployeeId?: string | null;
  branchSlug?: string | null;
  title: string;
  content: string;
  attachmentUrl?: string | null;
  status: string;
  reviewedBy?: string | null;
  reviewNote?: string | null;
  sourceShiftId?: string | null;
  targetShiftId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArchivedNotification extends ArchiveMeta {
  id: string;
  targetEmployeeId?: string | null;
  branchSlug?: string | null;
  title: string;
  body: string;
  isRead: boolean;
  metadata?: unknown;
  requestType?: string | null;
  shiftName?: string | null;
  shiftDate?: string | null;
  shiftTime?: string | null;
  shiftHours?: string | null;
  senderName?: string | null;
  senderRole?: string | null;
  senderPhone?: string | null;
  createdAt: string;
}

export type ArchivedRecord = ArchivedTask | ArchivedRequest | ArchivedNotification;

export interface ArchivePage {
  items: ArchivedRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ArchiveListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  branchSlug?: string;
  from?: string;
  to?: string;
  all?: boolean | string;
}

export function formatDateTime(value?: string | null): string {
  // Dùng helper dùng chung để mọi nơi hiển thị DD/MM/YYYY HH:mm
  if (!value) return "—";
  return formatDateTimeVN(value) || "—";
}