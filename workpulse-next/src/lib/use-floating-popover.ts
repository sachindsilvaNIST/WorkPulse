"use client";

import { useEffect, useRef, useState } from "react";

/** Shared positioning + outside-click/scroll/resize-closing logic for this app's custom
 * dropdown-style popovers (Select/DatePicker/TimePicker). Portals its content to document.body —
 * relying on CSS position:absolute inside an ancestor with overflow-x-auto silently clips the
 * popover, because setting overflow-x to anything but visible forces the browser to also compute
 * overflow-y as auto (a real CSS quirk, not a bug in the ancestor), which crops anything
 * extending past that container's bounds. Rendering into document.body with position:fixed,
 * positioned from the trigger's own getBoundingClientRect(), sidesteps that entirely. */
export function useFloatingPopover(open: boolean, setOpen: (open: boolean) => void) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    function measure() {
      setRect(open ? (triggerRef.current?.getBoundingClientRect() ?? null) : null);
    }
    measure();
    if (!open) return;

    // The popover is portaled outside the trigger's own DOM subtree, so a plain
    // triggerRef.current.contains(target) check would treat every click inside the (portaled)
    // popover as "outside" and close it instantly — check both refs.
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    }
    // Reposition-on-scroll is more complexity than a short-lived popover needs — close it
    // instead, same as most native pickers do. Capture:true so this also catches scrolling
    // inside an ancestor scroll container (e.g. this page's overflow-x-auto tables), which
    // never bubbles a plain scroll listener up to window otherwise — but that same capture
    // reach means a scroll *inside* the popover itself (e.g. AppleTimePicker's own hour/minute
    // columns) fires here too, so those must be excluded or scrolling the picker closes it.
    function handleScroll(e: Event) {
      if (popoverRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function handleResize() {
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return { triggerRef, popoverRef, rect };
}
