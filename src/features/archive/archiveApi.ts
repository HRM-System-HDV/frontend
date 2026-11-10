import { apiGet, apiPost } from "@/lib/api";
import { parseDate } from "@/lib/utils";
import type {
  ArchiveCounts,
  ArchiveFilterType,
  ArchiveListParams,
  ArchivePage,
  ArchivePreview,
  ArchiveRunResult,
  ArchiveSelection,
  ArchiveType,
  ArchivedRecord,
} from "./types";

const BASE: Record<ArchiveType, string> = {
  task: "/api/archive/work",
  request: "/api/archive/integration",
  notification: "/api/archive/integration",
};

const PLURAL: Record<ArchiveType, string> = {
  task: "tasks",
  request: "requests",
  notification: "notifications",
};

const GROUPS: { base: string; types: ArchiveType[] }[] = [
  { base: "/api/archive/work", types: ["task"] },
  { base: "/api/archive/integration", types: ["request", "notification"] },
];

function sumCounts(counts: ArchiveCounts): number {
  return Object.values(counts).reduce((acc, n) => acc + (n || 0), 0);
}

export async function previewAll(selection: ArchiveSelection): Promise<ArchivePreview> {
  const results = await Promise.all(
    GROUPS.map((g) =>
      apiPost<ArchivePreview>(`${g.base}/preview`, { ...selection, types: g.types })
    )
  );
  const counts: ArchiveCounts = {};
  for (const r of results) Object.assign(counts, r.counts);
  return { cutoffDate: results[0].cutoffDate, counts };
}

export interface RunProgress {
  moved: ArchiveCounts;
  remaining: ArchiveCounts;
}

/** Lặp batch tới khi remaining = 0; mỗi lời gọi ≤ 2000 row để nằm trong timeout 5s. */
export async function runAll(
  selection: ArchiveSelection,
  onProgress?: (progress: RunProgress) => void,
  limit = 500
): Promise<ArchiveCounts> {
  const movedTotal: ArchiveCounts = { task: 0, request: 0, notification: 0 };
  for (const group of GROUPS) {
    let remaining: ArchiveCounts = {};
    do {
      const res = await apiPost<ArchiveRunResult>(`${group.base}/run`, {
        ...selection,
        types: group.types,
        limit,
      });
      for (const type of group.types) {
        movedTotal[type] = (movedTotal[type] || 0) + (res.moved[type] || 0);
      }
      remaining = res.remaining;
      onProgress?.({ moved: { ...movedTotal }, remaining });
    } while (sumCounts(remaining) > 0);
  }
  return movedTotal;
}

export async function listArchive(
  type: ArchiveFilterType,
  params: ArchiveListParams = {}
): Promise<ArchivePage> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  if (type === "all") {
    const [tasksRes, requestsRes, notifsRes] = await Promise.all([
      apiGet<ArchivePage>(`${BASE.task}/${PLURAL.task}${suffix}`).catch(() => ({ items: [], total: 0, page: 1, pageSize: 0 })),
      apiGet<ArchivePage>(`${BASE.request}/${PLURAL.request}${suffix}`).catch(() => ({ items: [], total: 0, page: 1, pageSize: 0 })),
      apiGet<ArchivePage>(`${BASE.notification}/${PLURAL.notification}${suffix}`).catch(() => ({ items: [], total: 0, page: 1, pageSize: 0 })),
    ]);

    const taskItems = (tasksRes.items || []).map((t) => ({ ...t, archiveType: "task" as const }));
    const requestItems = (requestsRes.items || []).map((r) => ({ ...r, archiveType: "request" as const }));
    const notifItems = (notifsRes.items || []).map((n) => ({ ...n, archiveType: "notification" as const }));

    const allItems = [...taskItems, ...requestItems, ...notifItems];
    allItems.sort(
      (a, b) =>
        (parseDate(b.archivedAt)?.getTime() ?? 0) - (parseDate(a.archivedAt)?.getTime() ?? 0)
    );

    return {
      items: allItems,
      total: allItems.length,
      page: 1,
      pageSize: allItems.length,
    };
  }

  const res = await apiGet<ArchivePage>(`${BASE[type]}/${PLURAL[type]}${suffix}`);
  const items = (res.items || []).map((item) => ({ ...item, archiveType: type }));
  return { ...res, items };
}

export function getArchived(type: ArchiveType, id: string): Promise<ArchivedRecord> {
  return apiGet<ArchivedRecord>(`${BASE[type]}/${PLURAL[type]}/${encodeURIComponent(id)}`);
}

export function restoreArchived(type: ArchiveType, id: string): Promise<{ restored: boolean; id: string }> {
  return apiPost(`${BASE[type]}/${PLURAL[type]}/${encodeURIComponent(id)}/restore`, {});
}