"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck } from "lucide-react";
import { notificationsApi } from "@/lib/api/client";
import type { AppNotification } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 60_000;
const DROPDOWN_WIDTH = 320;

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/** Bell icon with unread badge + dropdown, fed by NotificationsController (daily report
 * reminders, upcoming trips, ...) — polls rather than pushing since there's no websocket/SSE
 * channel in this app. Rendered once in the sidebar and once in the mobile top bar.
 *
 * The dropdown is portaled to document.body (position: fixed, computed from the button's own
 * bounding rect) rather than absolutely positioned inside the button's own DOM subtree — the
 * sidebar's glass-panel wrapper uses backdrop-filter, which establishes a stacking context, so a
 * z-index on a descendant can't escape it and paint above sibling content (the page's <main>) no
 * matter how high the z-index is. Portaling sidesteps that entirely, matching the same pattern
 * already used for the Bookmarks card context menu. */
export function NotificationBell({ align = "right" }: { align?: "left" | "right" }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function load() {
      notificationsApi.getAll().then(setNotifications).catch(() => {});
    }
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (buttonRef.current?.contains(e.target as Node)) return;
      if (dropdownRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function toggleOpen() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const left =
        align === "right"
          ? Math.max(16, rect.right - DROPDOWN_WIDTH)
          : Math.min(rect.left, window.innerWidth - DROPDOWN_WIDTH - 16);
      setPosition({ top: rect.bottom + 8, left });
    }
    setOpen((v) => !v);
  }

  const unreadCount = notifications.filter((n) => !n.readUtc).length;

  async function handleSelect(n: AppNotification) {
    if (!n.readUtc) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, readUtc: new Date().toISOString() } : x)));
      notificationsApi.markRead(n.id).catch(() => {});
    }
    setOpen(false);
    if (n.href) router.push(n.href);
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, readUtc: n.readUtc ?? new Date().toISOString() })));
    notificationsApi.markAllRead().catch(() => {});
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className="relative cursor-pointer rounded-lg p-1.5 text-foreground/50 transition-colors hover:bg-foreground/8 hover:text-foreground"
        title="Notifications"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && position && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="glass-panel fixed z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden p-1.5"
                style={{ top: position.top, left: position.left }}
              >
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="flex cursor-pointer items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <CheckCheck className="size-3" /> Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 && (
                    <p className="px-2 py-6 text-center text-xs text-muted-foreground">You&apos;re all caught up.</p>
                  )}
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleSelect(n)}
                      className={cn(
                        "flex w-full cursor-pointer flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-foreground/6",
                        !n.readUtc && "bg-primary/5"
                      )}
                    >
                      <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        {!n.readUtc && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                        {n.title}
                      </span>
                      <span className="text-xs text-muted-foreground">{n.message}</span>
                      <span className="text-[10px] text-muted-foreground/70">{relativeTime(n.createdUtc)}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
