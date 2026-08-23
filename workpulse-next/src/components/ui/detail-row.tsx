import { CopyButton } from "@/components/ui/copy-button";

export function DetailRow({
  icon: Icon,
  label,
  value,
  copyable,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  copyable?: boolean;
  /** If set, the value renders as a link (opens in a new tab) instead of plain text. */
  href?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-1.5">
          {href ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className="truncate text-sm text-primary underline">
              {value}
            </a>
          ) : (
            <p className="truncate text-sm">{value}</p>
          )}
          {copyable && <CopyButton value={value} />}
        </div>
      </div>
    </div>
  );
}
