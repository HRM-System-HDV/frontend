"use client";

import { useSyncExternalStore, useCallback, useMemo } from "react";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

/**
 * Hook quản lý trạng thái UI đồng bộ với localStorage (tab đang mở, bộ lọc, từ khóa tìm kiếm...).
 * Tuyệt đối không lưu dữ liệu nghiệp vụ vào localStorage; chỉ lưu trạng thái thao tác người dùng.
 * An toàn với SSR / Next.js Hydration bằng useSyncExternalStore.
 */
export function useLocalStorageState<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);

  const getServerSnapshot = useCallback(() => null, []);

  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const value = useMemo<T>(() => {
    if (raw === null) return initialValue;
    try {
      return JSON.parse(raw);
    } catch {
      return raw as unknown as T;
    }
  }, [raw, initialValue]);

  const setPersistedState = useCallback(
    (action: T | ((prev: T) => T)) => {
      if (typeof window === "undefined") return;
      try {
        let currentValue = initialValue;
        const currentRaw = localStorage.getItem(key);
        if (currentRaw !== null) {
          try {
            currentValue = JSON.parse(currentRaw);
          } catch {
            currentValue = currentRaw as unknown as T;
          }
        }
        const next =
          typeof action === "function"
            ? (action as (prev: T) => T)(currentValue)
            : action;
        localStorage.setItem(key, JSON.stringify(next));
        window.dispatchEvent(new StorageEvent("storage", { key }));
      } catch {
        // Bỏ qua lỗi quotaExceeded
      }
    },
    [key, initialValue]
  );

  return [value, setPersistedState];
}
