"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

/** Liquid Glass modal chrome for "add/edit" forms (Bookmarks, Resources, Contacts, ...) — replaces
 * the old inline Card-at-top-of-page pattern with a floating, translucent window over a blurred,
 * dimmed backdrop, matching the glass-panel material used by the sidebar/Spotlight/detail views
 * elsewhere in the app. Reused rather than duplicated per-page since the chrome (backdrop, close
 * button, scroll container) is identical everywhere — only the fields inside differ. */
export function FormModal({
  open,
  onClose,
  title,
  children,
  maxWidthClassName = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Override the modal's width (default "max-w-lg") — e.g. Resources' File upload form needs
   * more room for a multi-file list than a simple two-field form does. */
  maxWidthClassName?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={`glass-panel w-full ${maxWidthClassName} overflow-hidden`}
          >
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
              <h2 className="text-base font-semibold">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
