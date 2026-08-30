"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** Wraps the existing "click to browse" file-picker label pattern (label > hidden input) with
 * drag-and-drop — drop a file anywhere on it, or click through to the OS file picker, either way
 * calling the same `onFile`. Visually highlights while something's being dragged over it. */
export function FileDropZone({
  onFile,
  onFiles,
  multiple,
  disabled,
  accept,
  className,
  children,
}: {
  /** Single-file callback — still how every existing caller (Trips/Reimbursement document
   * upload, one file per entry) works. Ignored when `multiple` is set and `onFiles` is provided. */
  onFile?: (file: File) => void;
  /** Multi-file callback, opt-in via `multiple` — Resources' "New Resource" file picker uses
   * this to let one drop/selection create several resources at once. */
  onFiles?: (files: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  accept?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [dragging, setDragging] = useState(false);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    if (multiple && onFiles) {
      onFiles(Array.from(fileList));
    } else if (onFile) {
      onFile(fileList[0]);
    }
  }

  return (
    <label
      className={cn(
        className,
        "transition-colors",
        dragging && "ring-2 ring-primary ring-offset-1 ring-offset-background"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (disabled) return;
        handleFiles(e.dataTransfer.files);
      }}
    >
      {children}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}
