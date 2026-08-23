"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    // stopPropagation matters here: this button is often nested inside a clickable card
    // (click-to-open-detail) or other interactive parent, and copying shouldn't also trigger it.
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (insecure context, permission denied) — fail silently rather
      // than surface an error for what's a convenience action.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy"}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-primary",
        copied && "text-brand-green",
        className
      )}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </button>
  );
}
