"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareDialog } from "@/components/ui/share-dialog";
import type { ShareableResourceType } from "@/lib/api/types";

/** Icon-button trigger for ShareDialog — owns its own open/close state so every detail view just
 * drops this in rather than each managing a boolean. */
export function ShareButton({
  resourceType,
  resourceId,
  title,
  size = "icon",
  variant = "outline",
}: {
  resourceType: ShareableResourceType;
  resourceId: string;
  title: string;
  size?: "icon" | "sm";
  variant?: "outline" | "ghost" | "glass";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" size={size} variant={variant} onClick={() => setOpen(true)} title="Share">
        <Share2 className="size-4" /> {size === "sm" && "Share"}
      </Button>
      <ShareDialog open={open} onClose={() => setOpen(false)} resourceType={resourceType} resourceId={resourceId} title={title} />
    </>
  );
}
