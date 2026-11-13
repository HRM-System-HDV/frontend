import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import NewsForm from "./NewsForm";
describe("News form", () => {
  it("uses publishDate and null for company scope without legacy date fields", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<NewsForm item={null} branches={[]} onSave={onSave} onClose={vi.fn()} />);
    for (const [label, value] of [["Tiêu đề", "Thông báo"], ["Tóm tắt", "Tóm tắt bản tin"], ["Nội dung", "Nội dung bản tin"], ["Ngày đăng", "2026-11-13"]]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.click(screen.getByText("Lưu bản tin"));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ title: "Thông báo", summary: "Tóm tắt bản tin", content: "Nội dung bản tin", publishDate: "2026-11-13", tag: "Thông báo", pinned: false, branchId: null }));
  });
});
