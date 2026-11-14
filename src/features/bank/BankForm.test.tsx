import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import BankConfigModal, { CreateBankAccountModal } from "./BankForm";
import type { Branch } from "@/types";
import type { BankPartner } from "./types";

describe("BankForm components", () => {
  describe("BankConfigModal", () => {
    it("returns null when partner is null", () => {
      const { container } = render(
        <BankConfigModal
          partner={null}
          branches={[]}
          onClose={vi.fn()}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders partner account details when partner is provided", () => {
      const mockPartner: BankPartner = {
        id: "bank-1",
        name: "Vietcombank",
        shortName: "VCB",
        accountNumber: "9876543210",
        accountName: "CONG TY HRM ENTERPRISE",
        branchId: "branch-1",
        branch: "Hà Nội",
        bankBranch: "Sở giao dịch Ba Đình - Hà Nội",
        balance: 500000000,
        isPrimary: true,
        certExpiry: "31/12/2026",
        connectionStatus: "connected",
      };
      const branches = [{ id: "branch-1", name: "Hà Nội" } as Branch];

      render(
        <BankConfigModal
          partner={mockPartner}
          branches={branches}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/Thông tin Tài khoản & Kết nối: VCB/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue("CONG TY HRM ENTERPRISE")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Sở giao dịch Ba Đình - Hà Nội")).toBeInTheDocument();
      // select hiển thị theo text của option đang chọn
      expect(screen.getByDisplayValue("Hà Nội")).toBeInTheDocument();
    });
  });

  describe("CreateBankAccountModal", () => {
    it("renders create modal when open is true", () => {
      render(
        <CreateBankAccountModal
          open={true}
          branches={[]}
          onClose={vi.fn()}
          onCreated={vi.fn()}
        />
      );

      expect(screen.getByText("Thêm tài khoản ngân hàng doanh nghiệp")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Ví dụ: 0011004123456/i)).toBeInTheDocument();
    });
  });
});
