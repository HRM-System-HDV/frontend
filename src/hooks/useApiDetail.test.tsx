import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useApiDetail } from "./useApiDetail";

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiGet }));

describe("detail selection", () => {
  it("ignores a slow response for an earlier selection", async () => {
    let resolveFirst!: (value: unknown) => void;
    apiGet.mockImplementation((path: string) => path === "/first" ? new Promise(resolve => { resolveFirst = resolve; }) : Promise.resolve({ id: "second" }));
    const onLoaded = vi.fn();
    const { result } = renderHook(() => useApiDetail());
    let first!: Promise<void>;
    act(() => { first = result.current.loadDetail("/first", onLoaded); });
    await act(async () => { await result.current.loadDetail("/second", onLoaded); });
    await act(async () => { resolveFirst({ id: "first" }); await first; });
    expect(onLoaded).toHaveBeenCalledExactlyOnceWith({ id: "second" });
    expect(result.current.loading).toBe(false);
  });

  it("does not open a detail view after its page has unmounted", async () => {
    let resolve!: (value: unknown) => void;
    apiGet.mockImplementation(() => new Promise(done => { resolve = done; }));
    const onLoaded = vi.fn();
    const { result, unmount } = renderHook(() => useApiDetail());
    let pending!: Promise<void>;
    act(() => { pending = result.current.loadDetail("/record", onLoaded); });
    unmount();
    await act(async () => { resolve({ id: "record" }); await pending; });
    expect(onLoaded).not.toHaveBeenCalled();
  });
});
