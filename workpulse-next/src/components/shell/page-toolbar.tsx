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
        "sticky top-0 z-30 -mx-4 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-transparent px-4 py-4 transition-colors duration-200 md:-mx-8 md:px-8",
        solid && "toolbar-solid"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {icon}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
