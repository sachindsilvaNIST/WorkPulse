"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Walks up from a node to find its nearest scrollable ancestor (the shared `<main>` in
 * `(app)/layout.tsx` for every real page), rather than hardcoding a selector — this keeps
 * PageToolbar reusable if a page ever nests its own scroll container. */
function findScrollParent(el: HTMLElement | null): HTMLElement | Window {
  let node = el?.parentElement ?? null;
  while (node) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
    node = node.parentElement;
  }
  return window;
}

/** Shared page header/toolbar — macOS 27 "Golden Gate" style: fully transparent at the top of the
 * page, and only becomes a discrete solid bar (see .toolbar-solid) once the page has scrolled
 * beneath it, instead of always floating a shaded bar over content. */
export function PageToolbar({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: ReactNode;
  /** An already-rendered icon element (e.g. <IconBadge .../>) shown left of the title — the
   * existing icon system is out of scope for this redesign, so this just relocates whatever a
   * page was already rendering there, unchanged. */
  icon?: ReactNode;
  children?: ReactNode;
}) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const scrollParent = findScrollParent(toolbarRef.current);
    function handleScroll() {
      const scrollTop = scrollParent === window ? window.scrollY : (scrollParent as HTMLElement).scrollTop;
      setSolid(scrollTop > 0);
    }
    handleScroll();
    scrollParent.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollParent.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      ref={toolbarRef}
      className={cn(
        "sticky top-2 z-30 mb-6 gap-3 rounded-tile border border-transparent transition-[background-color,box-shadow,border-color,padding] duration-[240ms] ease-glass",
        // Scrolled (G2): a fixed-height, single-row bar — never multi-line, never taller than its
        // own content — instead of the resting state's wrapping multi-row layout, which could grow
        // tall enough (e.g. a toolbar with many actions) to visually collide with content above it.
        solid
          ? "flex h-14 flex-nowrap items-center overflow-x-auto px-4 py-0 toolbar-solid"
          : "flex flex-wrap items-center px-4 py-3"
      )}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-3">
        {icon}
        <div className="min-w-0">
          <h1 className={cn("font-semibold tracking-tight transition-[font-size] duration-[240ms] ease-glass", solid ? "text-[17px]" : "text-2xl")}>
            {title}
          </h1>
          {description && !solid && <p className="mt-0.5 text-sm text-text-secondary">{description}</p>}
        </div>
      </div>
      {children && <div className="ml-auto flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}
