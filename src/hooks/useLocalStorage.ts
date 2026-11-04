"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Hook quản lý trạng thái UI đồng bộ với localStorage (tab đang mở, bộ lọc, từ khóa tìm kiếm...).
 * Tuyệt đối không lưu dữ liệu nghiệp vụ vào localStorage; chỉ lưu trạng thái thao tác người dùng.
 * An toàn với SSR / Next.js Hydration.
 */
export function useLocalStorageState<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(initialValue);

  // Khôi phục trạng thái từ localStorage sau khi client mount để tránh hydration mismatch
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try {
          setState(JSON.parse(raw));
        } catch {
          setState(raw as unknown as T);
        }
      }
    } catch {
      // Bỏ qua lỗi trong môi trường bảo mật hoặc private browsing
    }
  }, [key]);

  // Đồng bộ giữa các tab trình duyệt nếu cùng mở trang
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setState(JSON.parse(e.newValue));
        } catch {
          setState(e.newValue as unknown as T);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [key]);

  const setPersistedState = useCallback(
    (action: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof action === "function" ? (action as (prev: T) => T)(prev) : action;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // Bỏ qua lỗi quotaExceeded
        }
        return next;
      });
    },
    [key]
  );

  return [state, setPersistedState];
}
