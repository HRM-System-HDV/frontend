"use client";

import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T) => React.ReactNode;
  className?: string;
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
  tdClass?: string;
}

export default function Table<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  emptyMessage = "Không có dữ liệu",
  className,
  tdClass,
}: TableProps<T>) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">{emptyMessage}</div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full text-nowrap", className)}>
        <thead className="bg-gray-100">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "border-t border-gray-200 hover:bg-gray-50 transition-colors",
                onRowClick && "cursor-pointer"
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn("px-5 py-3.5 text-sm text-gray-700 align-middle", tdClass, col.className)}
                >
                  {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
