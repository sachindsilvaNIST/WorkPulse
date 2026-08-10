"use client";

import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex min-h-[60vh] items-center justify-center"
    >
      <Card className="max-w-md text-center">
        <CardContent className="flex flex-col items-center gap-4 py-10">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="size-8" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
          </div>
          <p className="text-xs text-muted-foreground/70">
            This module is being ported from the desktop app to the new web platform — coming in a follow-up update.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
