"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet } from "@/lib/api";

/** Only the most recently selected record may open a detail view. */
export function useApiDetail() {
  const requestId = useRef(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => () => { requestId.current += 1; }, []);

  const loadDetail = useCallback(async <T,>(path: string, onLoaded: (row: T) => void) => {
    const current = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const row = await apiGet<T>(path);
      if (current === requestId.current) onLoaded(row);
    } catch (error) {
      if (current === requestId.current) setError(error instanceof Error ? error.message : "Không tải được chi tiết");
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, []);

  return { loadDetail, loading, error };
}

export function DetailLoadStatus({ loading, error }: { loading: boolean; error: string | null }) {
  if (loading) return <div role="status" className="mb-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">Đang tải chi tiết...</div>;
  if (error) return <div role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>;
  return null;
}
