"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav-items";
import { useAuth } from "@/lib/auth-context";

function resolveColor(color: string) {
  return color.startsWith("brand-") ? `var(--${color})` : color;
}

export default function HomePage() {
  const { displayName } = useAuth();
  const tiles = NAV_ITEMS.filter((item) => item.href !== "/home");

  return (
    <div className="mx-auto max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome back{displayName ? `, ${displayName.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-muted-foreground">Select a module to get started</p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile, i) => {
          const Icon = tile.icon;
          const color = resolveColor(tile.color);
          return (
            <motion.div
              key={tile.href}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
            >
              <Link
                href={tile.href}
                className="group relative flex h-44 flex-col justify-between overflow-hidden rounded-2xl p-6 text-white shadow-lg transition-shadow duration-300 hover:shadow-2xl"
                style={{
                  background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 65%, black))`,
                }}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-1/2 opacity-25"
                  style={{ background: "linear-gradient(180deg, white, transparent)" }}
                />
                <div className="flex items-start justify-between">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                    <Icon className="size-5.5" strokeWidth={2} />
                  </div>
                  <ArrowUpRight className="size-5 opacity-0 transition-opacity duration-200 group-hover:opacity-80" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{tile.label}</h3>
                  <p className="mt-1 text-sm text-white/80">{tile.description}</p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
