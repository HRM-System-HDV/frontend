"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Form";
import { apiGet } from "@/lib/api";
import type { Branch, Department } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  isManager?: boolean;
  managerBranch?: string;
  defaultBranch?: string;
}

export default function CreateEmployeeModal({
  open,
  onClose,
  isManager = false,
  managerBranch = "hn-1",
  defaultBranch,
}: Props) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    if (!open) return;
    apiGet<Branch[]>("/api/branches").then((d) => setBranches(d || [])).catch(() => {});
    apiGet<Department[]>("/api/departments").then((d) => setDepartments(d || [])).catch(() => {});
  }, [open ]);

  const fixedBranch = isManager ? managerBranch : defaultBranch ?? branches[0]?.slug ?? "hn-1";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo tài khoản nhân viên"
      size="lg"
      footer={
        <>
          <Button variant="white" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={onClose}>Tạo</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
        <Field label="Họ tên" required>
          <Input placeholder="Họ và tên nhân viên" />
        </Field>
        <Field label="SĐT" required>
          <Input placeholder="0901 234 567" />
        </Field>
        <Field label="Email" required>
          <Input type="email" placeholder="nv@company.com" />
        </Field>
        <Field label="Mật khẩu" required>
          <Input type="password" placeholder="Mật khẩu ban đầu" />
        </Field>
        <Field label="Gán chi nhánh" required>
          {isManager ? (
            <div className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-bold text-gray-800 flex items-center justify-between">
              <span>
                {branches.find((b) => b.slug.toLowerCase() === fixedBranch.toLowerCase())?.name ??
                  `Chi nhánh ${fixedBranch.toUpperCase()}`}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-primary-50 text-primary border border-primary-200">
                Cố định
              </span>
            </div>
          ) : (
            <Select defaultValue={fixedBranch.toLowerCase()} disabled={false}>
              {branches.map((b) => (
                <option key={b.id} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </Select>
          )}
          {isManager && (
            <p className="text-[11px] text-gray-400 mt-1">
              Tài khoản Manager chỉ tạo nhân viên cho chi nhánh phụ trách
            </p>
          )}
        </Field>
        <Field label="Phòng ban" required>
          <Select defaultValue={departments[1]?.name ?? "Phòng Kinh Doanh"}>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name} ({d.code})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Vai trò" required>
          <Select defaultValue="nv">
            <option value="nv">Nhân viên</option>
            <option value="truong-nhom">Trưởng nhóm</option>
            <option value="quan-ly">Quản lý</option>
            <option value="nhan-su">Nhân sự</option>
            <option value="ke-toan">Kế toán</option>
          </Select>
        </Field>
        <Field label="Hình thức tính lương" required>
          <Select defaultValue="hourly">
            <option value="hourly">Lương theo giờ</option>
            <option value="monthly">Lương cơ bản tháng</option>
          </Select>
        </Field>
        <Field label="Mức lương (VNĐ/giờ hoặc VNĐ/tháng)" required>
          <Input type="number" defaultValue="35000" placeholder="Ví dụ: 35000 hoặc 8500000" />
        </Field>
        <Field label="Ngân hàng" required>
          <Select defaultValue="Vietcombank">
            <option value="Vietcombank">Vietcombank</option>
            <option value="VietinBank">VietinBank</option>
            <option value="BIDV">BIDV</option>
            <option value="Techcombank">Techcombank</option>
            <option value="MBBank">MBBank</option>
            <option value="Agribank">Agribank</option>
          </Select>
        </Field>
        <Field label="Số tài khoản (STK)" required className="md:col-span-2">
          <Input placeholder="Số tài khoản ngân hàng nhận lương" />
        </Field>
      </div>
    </Modal>
  );
}
