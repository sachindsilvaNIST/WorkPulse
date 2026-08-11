"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Palette, Info, LogOut } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

function SectionIcon({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div
      className="flex size-8 shrink-0 items-center justify-center rounded-lg"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
    >
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { displayName, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Settings</h1>

      <div className="flex flex-col gap-4">
        <Card style={{ backgroundColor: "color-mix(in srgb, #8B5CF6 6%, var(--card))" }}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <SectionIcon color="#8B5CF6">
                <Palette className="size-4" />
              </SectionIcon>
              <h2 className="font-semibold">Appearance</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Dark Theme</p>
                <p className="text-xs text-muted-foreground">Switch between light and dark appearance</p>
              </div>
              {mounted && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  <Moon className="size-3.5" />
                  {theme === "dark" ? "Dark" : "Light"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: "color-mix(in srgb, #34C759 6%, var(--card))" }}>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <SectionIcon color="#34C759">
                <Info className="size-4" />
              </SectionIcon>
              <h2 className="font-semibold">Account</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{displayName}</span>
            </p>
            <Button variant="outline" className="w-fit" onClick={logout}>
              <LogOut className="size-4" /> Log out
            </Button>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: "color-mix(in srgb, #6E6E73 6%, var(--card))" }}>
          <CardContent className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <SectionIcon color="#6E6E73">
                <Info className="size-4" />
              </SectionIcon>
              <h2 className="font-semibold">About</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">WorkPulse Web — Attendance, Reports, Trips, and more, all in one place.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
