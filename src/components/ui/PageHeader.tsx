"use client";

import { useEffect } from "react";
import { useTopbar } from "@/context/TopbarContext";

interface PageHeaderProps {
  title?: string;
  breadcrumb?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, actions }: PageHeaderProps) {
  const { setHeaderTitle, setHeaderActions } = useTopbar();

  useEffect(() => {
    if (title) setHeaderTitle(title);
  }, [title, setHeaderTitle]);

  useEffect(() => {
    setHeaderActions(actions ?? null);
  }, [actions, setHeaderActions]);

  useEffect(() => {
    return () => {
      setHeaderTitle(null);
      setHeaderActions(null);
    };
  }, [setHeaderTitle, setHeaderActions]);

  return null; // Tiêu đề & actions được đồng bộ lên Topbar để header nhất quán giữa các tab
}
