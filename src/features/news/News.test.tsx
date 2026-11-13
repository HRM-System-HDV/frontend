import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import NewsForm from "./NewsForm";
import NewsList from "./NewsList";
import NewsPage from "@/app/dashboard/news/page";
import type { NewsItem } from "./types";

const { apiGet, apiPut, apiPost, apiDelete, currentUser } = vi.hoisted(() => ({
  apiGet: vi.fn(), apiPut: vi.fn(), apiPost: vi.fn(), apiDelete: vi.fn(), currentUser: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ apiGet, apiPut, apiPost, apiDelete, GatewayError: class extends Error {} }));
vi.mock("@/context/AuthContext", () => ({ useCurrentUser: currentUser }));
vi.mock("@/components/ui/PageHeader", () => ({ default: () => null }));

const globalNews: NewsItem = { id: "global", title: "Thông báo toàn công ty", summary: "Tóm tắt", content: "Nội dung", publishDate: "2026-11-13", tag: "Thông báo", branchId: null, pinned: false, authorName: "Admin Công Ty", createdAt: "2026-11-13T02:00:00.000Z" };
const ownNews = { ...globalNews, id: "own", title: "Thông báo chi nhánh", branchId: "branch-1" };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  currentUser.mockReturnValue({ role: "manager", branchId: "branch-1" });
  apiGet.mockImplementation(async (path: string) => path === "/api/news" ? [globalNews, ownNews] : []);
});

describe("news permissions and pinning", () => {
  it.each(["manager", "staff", "admin"])("only admin can modify a company announcement (%s)", async role => {
    currentUser.mockReturnValue({ role, branchId: "branch-1" });
    render(<NewsPage />);
    fireEvent.click(await screen.findByRole("heading", { name: globalNews.title }));
    await screen.findByText("Tóm tắt thông báo:");
    for (const name of ["Sửa thông báo", "Xóa thông báo", "Ghim đầu trang"]) {
      if (role === "admin") expect(screen.getByRole("button", { name })).toBeInTheDocument();
      else expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
    expect(apiPut).not.toHaveBeenCalled();
    expect(apiDelete).not.toHaveBeenCalled();
  });

  it("lets a manager pin an announcement from their branch", async () => {
    apiPut.mockResolvedValue({ ...ownNews, pinned: true });
    render(<NewsPage />);
    fireEvent.click(await screen.findByRole("heading", { name: ownNews.title }));
    expect(screen.getByRole("button", { name: "Sửa thông báo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xóa thông báo" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ghim đầu trang" }));
    await waitFor(() => expect(apiPut).toHaveBeenCalledWith("/api/news/own", { pinned: true }));
    expect(await screen.findByRole("button", { name: "Bỏ ghim" })).toBeInTheDocument();
  });

  it("auto-checks pin when choosing urgent and respects a subsequent uncheck", async () => {
    const onSubmit = vi.fn();
    render(<NewsForm open onClose={vi.fn()} initial={ownNews} saving={false} onSubmit={onSubmit} />);
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Khẩn cấp" } });
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ tag: "Khẩn cấp", pinned: false, branchId: "branch-1" }));
  });

  it("preserves an already unpinned urgent announcement when editing", async () => {
    const onSubmit = vi.fn();
    render(<NewsForm open onClose={vi.fn()} initial={{ ...ownNews, tag: "Khẩn cấp", pinned: false }} saving={false} onSubmit={onSubmit} />);
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ tag: "Khẩn cấp", pinned: false }));
  });

  it("shows the author the BE stamped on creation", async () => {
    render(<NewsPage />);
    fireEvent.click(await screen.findByRole("heading", { name: globalNews.title }));
    await screen.findByText("Tóm tắt thông báo:");
    expect(screen.getAllByText("Người đăng:").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Admin Công Ty").length).toBeGreaterThan(0);
  });

  it("orders by publishDate then createdAt when dates tie, pinned first", async () => {
    const old = { ...globalNews, id: "old", publishDate: "2026-10-01", authorName: undefined };
    const sameDayNewer = { ...globalNews, id: "same-newer", createdAt: "2026-11-13T05:00:00.000Z", title: "Tin cùng ngày đăng sau", authorName: undefined };
    const pinned = { ...globalNews, id: "pinned", title: "Tin ghim ngày cũ", pinned: true, publishDate: "2026-09-01", authorName: undefined };
    apiGet.mockImplementation(async (path: string) => path === "/api/news" ? [globalNews, old, sameDayNewer, pinned] : []);
    render(<NewsList items={[globalNews, old, sameDayNewer, pinned]} onSelect={vi.fn()} />);
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    const titles = (await screen.findAllByRole("heading")).map(h => h.textContent);
    expect(titles).toEqual(["Tin ghim ngày cũ", "Tin cùng ngày đăng sau", "Thông báo toàn công ty", old.title]);
  });
});
