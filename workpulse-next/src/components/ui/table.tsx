import * as React from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/utils";

/** Table inside a glass panel. Scrolls horizontally inside the panel rather than the page. */
export function DataTable({ className, children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <GlassPanel size="inner" className="overflow-x-auto p-2">
      <table className={cn("w-full min-w-[640px] border-collapse text-sm text-text-body", className)} {...props}>
        {children}
      </table>
    </GlassPanel>
  );
}

export function DataTh({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("px-3.5 py-2.5 text-left text-xs font-semibold text-text-secondary", className)} {...props} />;
}

export function DataTd({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("border-t border-separator px-3.5 py-[11px] tabular-nums first:rounded-l-none", className)} {...props} />
  );
}

export function DataTr({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("transition-colors hover:bg-fill-1", className)} {...props} />;
}
