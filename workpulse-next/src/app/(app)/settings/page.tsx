"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Palette, Info, LogOut, Clock3, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { settingsApi } from "@/lib/api/client";
import type { AppSettings } from "@/lib/api/types";

const FONT_SIZES = ["Small", "Medium", "Large"];

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

function toHms(time: string) {
  // accepts "HH:mm" from <input type=time>, API wants "HH:mm:ss"
  return time.length === 5 ? `${time}:00` : time;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { displayName, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    settingsApi.get().then(setSettings);
  }, []);

  async function handleSaveSettings() {
    if (!settings) return;
    await settingsApi.save(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

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
                <Button variant="outline" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  <Moon className="size-3.5" />
                  {theme === "dark" ? "Dark" : "Light"}
                </Button>
              )}
            </div>
            {settings && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Font Size</p>
                  <p className="text-xs text-muted-foreground">Adjust text size across the app</p>
                </div>
                <div className="flex gap-1">
                  {FONT_SIZES.map((size) => (
                    <Button
                      key={size}
                      size="sm"
                      variant={settings.fontSizePreset === size ? "default" : "outline"}
                      onClick={() => setSettings({ ...settings, fontSizePreset: size })}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: "color-mix(in srgb, #0078D4 6%, var(--card))" }}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <SectionIcon color="#0078D4">
                <Clock3 className="size-4" />
              </SectionIcon>
              <h2 className="font-semibold">Work Hours</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Standard hours used to calculate overtime on the Attendance tab.
            </p>
            {settings ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Standard Login</label>
                    <Input
                      type="time"
                      value={settings.standardLoginTime.slice(0, 5)}
                      onChange={(e) => setSettings({ ...settings, standardLoginTime: toHms(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Standard Logout</label>
                    <Input
                      type="time"
                      value={settings.standardLogoutTime.slice(0, 5)}
                      onChange={(e) => setSettings({ ...settings, standardLogoutTime: toHms(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Overtime Break Deduction (minutes)</label>
                  <Input
                    type="number"
                    min={0}
                    value={settings.overtimeBreakDeductionMinutes}
                    onChange={(e) => setSettings({ ...settings, overtimeBreakDeductionMinutes: Number(e.target.value) })}
                    className="w-32"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Default Report Title</label>
                  <Input value={settings.defaultTitle} onChange={(e) => setSettings({ ...settings, defaultTitle: e.target.value })} />
                </div>
                <Button size="sm" className="w-fit" onClick={handleSaveSettings}>
                  {saved ? <Check className="size-3.5" /> : null}
                  {saved ? "Saved" : "Save Work Hours"}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}
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
