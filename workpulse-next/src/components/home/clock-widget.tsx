"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

/** Apple-style glass clock widget — live time + date, client-only so it never mismatches
 * server-rendered markup (the clock face literally cannot be the same at render time and
 * hydration time). */
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
    <div
      className="relative flex min-h-44 flex-col justify-between overflow-hidden rounded-2xl border border-white/20 p-6 text-white backdrop-blur-2xl backdrop-saturate-200 sm:h-full"
      style={{
        background: "linear-gradient(150deg, #3634A3 0%, #5856D6 55%, #1B1464 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -20px 40px -20px rgba(0,0,0,0.3), 0 12px 32px -12px rgba(0,0,0,0.45)",
      }}
    >
      <div className="liquid-sheen pointer-events-none absolute inset-0" />
      <div className="flex items-start justify-between">
        <div className="widget-float">
          <Clock className="size-7 drop-shadow-md" strokeWidth={1.75} />
        </div>
      </div>
      <div>
        <p className="text-4xl font-bold leading-tight tabular-nums drop-shadow-sm">{time}</p>
        <p className="text-sm text-white/90 drop-shadow-sm">{date}</p>
      </div>
    </div>
  );
}
