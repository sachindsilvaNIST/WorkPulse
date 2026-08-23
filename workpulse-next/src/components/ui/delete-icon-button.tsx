"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

export function DeleteIconButton({
  onDelete,
  title = "Delete this item?",
  description = "This action cannot be undone.",
  className,
}: {
  onDelete: () => void | Promise<void>;
  title?: string;
  description?: string;
  className?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setConfirming(true);
        }}
        className={cn("shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-destructive", className)}
      >
        <Trash2 className="size-4" />
      </button>
      {confirming && (
        <ConfirmDialog
          title={title}
          description={description}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={() => {
            setConfirming(false);
            void onDelete();
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
