import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  /** Cell renderer */
  cell: (row: T, index: number) => ReactNode;
  align?: "left" | "right" | "center";
  /** Apply tabular-nums + right align by default */
  numeric?: boolean;
  className?: string;
  headerClassName?: string;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  className?: string;
  /** Make header sticky on scroll. Wrap in a parent with maxHeight. */
  stickyHeader?: boolean;
  dense?: boolean;
}

/**
 * Standardized table: consistent header, tabular numbers, row hover,
 * row height, optional sticky header for scrolling.
 */
export function DataTable<T>({
  data,
  columns,
  rowKey,
  onRowClick,
  empty,
  className,
  stickyHeader,
  dense,
}: DataTableProps<T>) {
  const rowH = dense ? "h-11" : "h-14";

  const alignCls = (c: DataTableColumn<T>) => {
    const a = c.align ?? (c.numeric ? "right" : "left");
    return a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";
  };

  return (
    <div className={cn("w-full overflow-x-auto rounded-xl border border-slate-200/80 bg-white", className)}>
      <table className="w-full border-collapse">
        <thead
          className={cn(
            "bg-slate-50/80 border-b border-slate-200",
            stickyHeader && "sticky top-0 z-10"
          )}
        >
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={c.width ? { width: c.width } : undefined}
                className={cn(
                  "h-11 px-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500",
                  alignCls(c),
                  c.headerClassName
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-0">
                {empty ?? (
                  <div className="py-12 text-center text-sm text-slate-500">
                    Nada para exibir.
                  </div>
                )}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  rowH,
                  "border-b border-slate-100 last:border-b-0 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-slate-50/70"
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-4 text-sm text-slate-700",
                      alignCls(c),
                      c.numeric && "tabular-nums",
                      c.className
                    )}
                  >
                    {c.cell(row, i)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
