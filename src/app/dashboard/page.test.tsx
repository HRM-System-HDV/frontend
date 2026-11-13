import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import DashboardOverviewPage from "./page";

const { apiGet, currentUser } = vi.hoisted(() => ({ apiGet: vi.fn(), currentUser: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiGet }));
vi.mock("@/context/AuthContext", () => ({ useCurrentUser: currentUser }));
vi.mock("@/components/ui/PageHeader", () => ({ default: () => null }));

const branchId = "019a7a00-0000-7000-8000-000000000001";
const otherBranchId = "019a7a00-0000-7000-8000-000000000002";
const branches = [{ id: branchId, branchCode: "CN-00001", name: "Chi nhánh A", status: "hoạt động" }];
const employees = [
  { id: "e1", name: "Nhân viên A", branchId, status: "đang làm" },
  { id: "e2", name: "Nhân viên B", branchId: otherBranchId, status: "đang làm" },
];

describe("Dashboard branch IDs", () => {
  beforeEach(() => {
    currentUser.mockReturnValue({ role: "admin", branchId: "" });
    apiGet.mockImplementation(async (path: string) => ({
      "/api/branches": branches, "/api/employees": employees,
      "/api/departments": [], "/api/shifts": [],
    })[path]);
  });

  it("renders backend records using branchId and counts employees in the matching branch", async () => {
    render(<DashboardOverviewPage />);
    const name = await screen.findByText("Nhân viên A");
    expect(within(name.closest("tr")!).getByText("Chi nhánh A")).toBeInTheDocument();
    expect(screen.getByText("CN-00001")).toBeInTheDocument();
    expect(screen.getByText("1 nhân sự")).toBeInTheDocument();
    expect(screen.getByText("Nhân viên B")).toBeInTheDocument();
  });

  it("filters manager records by the branch UUID in the session", async () => {
    currentUser.mockReturnValue({ role: "manager", branchId });
    render(<DashboardOverviewPage />);
    await screen.findByText("Nhân viên A");
    await waitFor(() => expect(screen.queryByText("Nhân viên B")).not.toBeInTheDocument());
  });
});
