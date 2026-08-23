"use client";

import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Yes",
  cancelLabel = "No",
  onConfirm,
  onCancel,
}: {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Portaled to document.body (rather than rendered in place) for two reasons: callers often
  // mount this from inside a clickable card, and (1) React bubbles synthetic events along the
  // component tree regardless of portaling, so without stopPropagation a click on Confirm/Cancel
  // would also fire the card's own onClick; (2) visually, a `fixed` element nested under an
  // ancestor with backdrop-filter (e.g. the glass Card component) gets contained by that ancestor
  // instead of the viewport, so it wouldn't actually cover the screen.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <Card className="w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </Card>
    </div>,
    document.body
  );
}
