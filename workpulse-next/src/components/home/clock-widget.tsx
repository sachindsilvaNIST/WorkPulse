"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

/** Glass clock tile, styled like the rest of the app's stat tiles — live time + date, client-only
 * so it never mismatches server-rendered markup (the clock face literally cannot be the same at
 * render time and hydration time). */
export function ClockWidget() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  const time = now?.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) ?? "";
  const date = now?.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) ?? "";

  return (
    <div className="glass flex min-h-[152px] flex-col justify-between gap-3 rounded-tile p-[18px]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-semibold text-text-secondary">Time</p>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-icon bg-primary/15 text-primary">
          <Clock className="size-[18px]" strokeWidth={1.8} />
        </span>
      </div>
      <div>
        <p className="text-[30px] font-bold leading-none tabular-nums tracking-[-0.03em] text-text-primary">{time}</p>
        <p className="mt-1 text-sm text-text-secondary">{date}</p>
      </div>
    </div>
  );
}
