"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import {
  AlertTriangle,
  Bell,
  Check,
  ChevronDown,
  Clock3,
  CloudCog,
  Download,
  Info,
  Keyboard,
  Laptop,
  LogOut,
  Mail,
  Moon,
  Palette,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  UserCog,
  X,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/lib/auth-context";
import { authApi, settingsApi, sessionsApi, googleDriveApi, gmailApi, ApiError } from "@/lib/api/client";
import type { AppSettings, CurrentUser, GoogleDriveStatus, GmailStatus, UserSession } from "@/lib/api/types";
import { applyFontSize, FONT_SIZE_STORAGE_KEY } from "@/lib/font-size";
import { DATE_FORMAT_OPTIONS } from "@/lib/date-format";
import { exportUserData } from "@/lib/data-export";
import { NAV_ITEMS } from "@/lib/nav-items";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { APP_VERSION, APP_ENV, GIT_SHA } from "@/lib/version";
import { CHANGELOG } from "@/lib/changelog";

const RECENT_SECTIONS_KEY = "workpulse.settings.recentSections";

const FONT_SIZES = ["Small", "Medium", "Large"];
const IDLE_TIMEOUT_OPTIONS = [
  { label: "Off", minutes: 0 },
  { label: "5 min", minutes: 5 },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
];

interface SettingsNavEntry {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  group: string;
}

const SETTINGS_NAV: SettingsNavEntry[] = [
  { id: "appearance", label: "Appearance", description: "Theme, font size, date format", icon: Palette, color: "#8B5CF6", group: "General" },
  { id: "work-hours", label: "Work Hours", description: "Standard hours for overtime calculation", icon: Clock3, color: "#0078D4", group: "General" },
  { id: "preferences", label: "Preferences", description: "Week start, landing page, idle sign-out", icon: SlidersHorizontal, color: "#FF9500", group: "General" },
  { id: "shortcuts", label: "Keyboard Shortcuts", description: "Quick reference for this app", icon: Keyboard, color: "#5AC8FA", group: "General" },
  { id: "security", label: "Security", description: "Two-factor authentication, active sessions", icon: ShieldCheck, color: "#FF3B30", group: "Security & Access" },
  { id: "google-drive", label: "Google Drive", description: "Reimbursement document backup", icon: CloudCog, color: "#4285F4", group: "Connections" },
  { id: "gmail", label: "Gmail", description: "Label manager sync account", icon: Mail, color: "#EA4335", group: "Connections" },
  { id: "data", label: "Your Data", description: "Export a backup of everything", icon: Download, color: "#00C7BE", group: "Account" },
  { id: "account", label: "Account", description: "Profile, password, log out", icon: UserCog, color: "#34C759", group: "Account" },
  { id: "danger-zone", label: "Danger Zone", description: "Permanently delete your account", icon: AlertTriangle, color: "#FF3B30", group: "Account" },
  { id: "about", label: "About", description: "App info", icon: Info, color: "#6E6E73", group: "Account" },
  { id: "whats-new", label: "What's New", description: "Recent changes and improvements", icon: Sparkles, color: "#FF9500", group: "Account" },
];

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

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { displayName, logout, updateDisplayName } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState("appearance");
  const [navQuery, setNavQuery] = useState("");

  // Recently viewed sections, most-recent-first, persisted so the quick-access widgets below
  // survive a reload. Read lazily (not in an effect) so it's ready on the very first paint —
  // gated behind `mounted` when rendered to avoid an SSR/client hydration mismatch.
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(RECENT_SECTIONS_KEY) ?? "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    setRecentIds((prev) => {
      const next = [activeSection, ...prev.filter((id) => id !== activeSection)].slice(0, 6);
      localStorage.setItem(RECENT_SECTIONS_KEY, JSON.stringify(next));
      return next;
    });
  }, [activeSection]);
  const [driveStatus, setDriveStatus] = useState<GoogleDriveStatus | null>(null);
  const [driveMessage, setDriveMessage] = useState<string | null>(null);
  const [driveConnecting, setDriveConnecting] = useState(false);

  useEffect(() => {
    googleDriveApi.status().then(setDriveStatus).catch(() => {});
  }, []);

  // Google redirects back here (via the API's /googledrive/callback) with ?drive=connected|error
  // after the OAuth consent flow — surface that as a one-time message, then clean the URL so a
  // page refresh doesn't keep re-showing it.
  useEffect(() => {
    const drive = searchParams.get("drive");
    if (!drive) return;
    setActiveSection("google-drive");
    if (drive === "connected") {
      setDriveMessage("Google Drive connected successfully.");
      googleDriveApi.status().then(setDriveStatus).catch(() => {});
    } else if (drive === "error") {
      setDriveMessage("Couldn't connect Google Drive. Please try again.");
    }
    router.replace("/settings");
  }, [searchParams, router]);

  async function handleDriveConnect() {
    setDriveConnecting(true);
    try {
      const { url } = await googleDriveApi.getConnectUrl();
      window.location.href = url;
    } catch (err) {
      setDriveMessage(err instanceof ApiError ? err.message : "Failed to start Google Drive connection.");
      setDriveConnecting(false);
    }
  }

  async function handleDriveDisconnect() {
    await googleDriveApi.disconnect();
    setDriveStatus((s) => (s ? { ...s, connected: false, connectedUtc: null } : s));
  }

  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);
  const [gmailMessage, setGmailMessage] = useState<string | null>(null);
  const [gmailConnecting, setGmailConnecting] = useState(false);

  useEffect(() => {
    gmailApi.status().then(setGmailStatus).catch(() => {});
  }, []);

  // Same round-trip as Drive above, via the API's /gmail/callback — ?gmail=connected|error.
  useEffect(() => {
    const gmail = searchParams.get("gmail");
    if (!gmail) return;
    setActiveSection("gmail");
    if (gmail === "connected") {
      setGmailMessage("Gmail connected successfully.");
      gmailApi.status().then(setGmailStatus).catch(() => {});
    } else if (gmail === "error") {
      setGmailMessage("Couldn't connect Gmail. Please try again.");
    }
    router.replace("/settings");
  }, [searchParams, router]);

  async function handleGmailConnect() {
    setGmailConnecting(true);
    try {
      const { url } = await gmailApi.getConnectUrl();
      window.location.href = url;
    } catch (err) {
      setGmailMessage(err instanceof ApiError ? err.message : "Failed to start Gmail connection.");
      setGmailConnecting(false);
    }
  }

  async function handleGmailDisconnect() {
    await gmailApi.disconnect();
    setGmailStatus((s) => (s ? { ...s, connected: false, emailAddress: null, connectedUtc: null } : s));
  }

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    settingsApi.get().then((fetched) => {
      setSettings(fetched);
      applyFontSize(fetched.fontSizePreset);
    });
  }, []);

  async function handleSaveSettings() {
    if (!settings) return;
    await settingsApi.save(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Font size applies immediately (not gated behind the Work Hours card's Save button below) and
  // persists on its own — there's no reason a visual preference should need a separate save step,
  // and requiring one is exactly why it read as "not actually doing anything" before.
  function handleFontSizeChange(size: string) {
    if (!settings) return;
    const updated = { ...settings, fontSizePreset: size };
    setSettings(updated);
    applyFontSize(size);
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, size);
    void settingsApi.save(updated);
  }

  // Preferences (week start, landing page, date format, idle timeout, notifications) save
  // immediately on change too, same reasoning as font size — no separate save button for them.
  function updatePreference<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    if (!settings) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    void settingsApi.save(updated);
  }

  // ===== Two-factor authentication =====
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [twoFactorStep, setTwoFactorStep] = useState<"idle" | "enabling">("idle");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);
  const [confirmDisable2fa, setConfirmDisable2fa] = useState(false);

  useEffect(() => {
    authApi.me().then(setCurrentUser).catch(() => {});
  }, []);

  // ===== Profile (display name, password, delete account) =====
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [displayNameSaved, setDisplayNameSaved] = useState(false);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [savingDisplayName, setSavingDisplayName] = useState(false);

  useEffect(() => {
    if (currentUser) setDisplayNameInput(currentUser.displayName);
  }, [currentUser]);

  async function handleSaveDisplayName() {
    const name = displayNameInput.trim();
    if (!name) return;
    setDisplayNameError(null);
    setSavingDisplayName(true);
    try {
      const updated = await authApi.updateProfile(name);
      setCurrentUser(updated);
      updateDisplayName(updated.displayName);
      setDisplayNameSaved(true);
      setTimeout(() => setDisplayNameSaved(false), 2000);
    } catch (err) {
      setDisplayNameError(err instanceof ApiError ? err.message : "Failed to update display name.");
    } finally {
      setSavingDisplayName(false);
    }
  }

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  async function handleChangePassword() {
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match.");
      return;
    }
    setChangingPassword(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 2500);
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : "Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
  }

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);

  async function handleDeleteAccount() {
    setDeleteError(null);
    setDeleting(true);
    try {
      await authApi.deleteAccount(deletePassword);
      router.replace("/login");
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Failed to delete account.");
      setDeleting(false);
    }
  }

  async function startEnableTwoFactor() {
    setTwoFactorError(null);
    setTwoFactorBusy(true);
    try {
      await authApi.send2faSetupCode();
      setTwoFactorStep("enabling");
      setTwoFactorCode("");
    } catch (err) {
      setTwoFactorError(err instanceof ApiError ? err.message : "Failed to send code.");
    } finally {
      setTwoFactorBusy(false);
    }
  }

  async function confirmEnableTwoFactor() {
    setTwoFactorError(null);
    setTwoFactorBusy(true);
    try {
      await authApi.enable2fa(twoFactorCode);
      setCurrentUser((u) => (u ? { ...u, twoFactorEnabled: true } : u));
      setTwoFactorStep("idle");
    } catch (err) {
      setTwoFactorError(err instanceof ApiError ? err.message : "Invalid or expired code.");
    } finally {
      setTwoFactorBusy(false);
    }
  }

  async function disableTwoFactor() {
    setConfirmDisable2fa(false);
    await authApi.disable2fa();
    setCurrentUser((u) => (u ? { ...u, twoFactorEnabled: false } : u));
  }

  // ===== Active sessions =====
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);

  useEffect(() => {
    sessionsApi
      .list()
      .then(setSessions)
      .catch(() => {})
      .finally(() => setSessionsLoading(false));
  }, []);

  async function revokeSession(id: number) {
    await sessionsApi.revoke(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  async function revokeAllSessions() {
    setConfirmRevokeAll(false);
    await sessionsApi.revokeAll();
    // Revokes the current session's refresh token too, so log out locally right away rather than
    // leaving this tab looking signed-in until its access token happens to expire.
    logout();
  }

  // ===== Data export =====
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await exportUserData();
    } finally {
      setExporting(false);
    }
  }

  const landingPageOptions = [{ href: "/home", label: "Home" }, ...NAV_ITEMS.filter((i) => !i.disabled && i.href !== "/home")];

  const trimmedNavQuery = navQuery.trim().toLowerCase();
  const filteredNav = trimmedNavQuery
    ? SETTINGS_NAV.filter(
        (n) => n.label.toLowerCase().includes(trimmedNavQuery) || n.description.toLowerCase().includes(trimmedNavQuery)
      )
    : SETTINGS_NAV;
  const navGroups = Array.from(new Set(filteredNav.map((n) => n.group)));
  const activeEntry = SETTINGS_NAV.find((n) => n.id === activeSection);

  function selectSection(id: string) {
    setActiveSection(id);
    setNavQuery("");
  }

  const recentEntries = recentIds
    .filter((id) => id !== activeSection)
    .map((id) => SETTINGS_NAV.find((n) => n.id === id))
    .filter((n): n is SettingsNavEntry => !!n)
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Settings</h1>

      {mounted && recentEntries.length > 0 && (
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recently Viewed</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recentEntries.map((entry) => {
              const Icon = entry.icon;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => selectSection(entry.id)}
                  className="flex w-40 shrink-0 cursor-pointer flex-col gap-2 rounded-2xl border border-border p-3 text-left transition-colors hover:bg-foreground/5"
                  style={{ backgroundColor: `color-mix(in srgb, ${entry.color} 6%, var(--card))` }}
                >
                  <span
                    className="flex size-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `color-mix(in srgb, ${entry.color} 15%, transparent)`, color: entry.color }}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="truncate text-sm font-medium">{entry.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <aside className="glass-panel w-full shrink-0 p-3 md:w-64">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={navQuery}
              onChange={(e) => setNavQuery(e.target.value)}
              placeholder="Find a setting…"
              className={cn(
                "h-9 w-full rounded-full border border-input bg-background/50 pl-8 text-sm outline-none placeholder:text-muted-foreground",
                navQuery ? "pr-8" : "pr-3"
              )}
            />
            {navQuery && (
              <button
                type="button"
                onClick={() => setNavQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-0.5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                title="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <nav className="flex flex-col gap-3">
            {navGroups.length === 0 && <p className="px-2 py-4 text-center text-xs text-muted-foreground">No matches.</p>}
            {navGroups.map((group) => (
              <div key={group}>
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
                <div className="flex flex-col gap-0.5">
                  {filteredNav
                    .filter((n) => n.group === group)
                    .map((entry) => {
                      const Icon = entry.icon;
                      const active = entry.id === activeSection;
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => selectSection(entry.id)}
                          className={cn(
                            "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors",
                            active ? "bg-foreground/10" : "hover:bg-foreground/5"
                          )}
                        >
                          <span
                            className="flex size-7 shrink-0 items-center justify-center rounded-md"
                            style={{ backgroundColor: `color-mix(in srgb, ${entry.color} 18%, transparent)`, color: entry.color }}
                          >
                            <Icon className="size-3.5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{entry.label}</span>
                            {trimmedNavQuery && <span className="block truncate text-[11px] text-muted-foreground">{entry.description}</span>}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
        {activeEntry && (
          <p className="mb-3 text-xs text-muted-foreground md:hidden">{activeEntry.description}</p>
        )}
        {activeSection === "appearance" && (
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
                      onClick={() => handleFontSizeChange(size)}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {settings && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Date Format</p>
                  <p className="text-xs text-muted-foreground">Applies to dates shown in Attendance</p>
                </div>
                <div className="flex gap-1">
                  {DATE_FORMAT_OPTIONS.map((fmt) => (
                    <Button
                      key={fmt}
                      size="sm"
                      variant={settings.dateFormat === fmt ? "default" : "outline"}
                      onClick={() => updatePreference("dateFormat", fmt)}
                    >
                      {fmt}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {activeSection === "work-hours" && (
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
                      onChange={(e) => setSettings({ ...settings, standardLoginTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Standard Logout</label>
                    <Input
                      type="time"
                      value={settings.standardLogoutTime.slice(0, 5)}
                      onChange={(e) => setSettings({ ...settings, standardLogoutTime: e.target.value })}
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size={16} /> Loading…</div>
            )}
          </CardContent>
        </Card>
        )}

        {activeSection === "preferences" && (
        <Card style={{ backgroundColor: "color-mix(in srgb, #FF9500 6%, var(--card))" }}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <SectionIcon color="#FF9500">
                <SlidersHorizontal className="size-4" />
              </SectionIcon>
              <h2 className="font-semibold">Preferences</h2>
            </div>
            {settings && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Week Starts On</p>
                    <p className="text-xs text-muted-foreground">Used when starting a new Weekly Report</p>
                  </div>
                  <div className="flex gap-1">
                    {["Sunday", "Monday"].map((day) => (
                      <Button
                        key={day}
                        size="sm"
                        variant={settings.weekStartDay === day ? "default" : "outline"}
                        onClick={() => updatePreference("weekStartDay", day)}
                      >
                        {day}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Default Landing Page</p>
                    <p className="text-xs text-muted-foreground">What loads right after you sign in</p>
                  </div>
                  <div className="relative">
                    <select
                      className="h-9 appearance-none rounded-full border border-input bg-background/50 py-1.5 pl-4 pr-9 text-sm backdrop-blur-md outline-none"
                      value={settings.defaultLandingPage}
                      onChange={(e) => updatePreference("defaultLandingPage", e.target.value)}
                    >
                      {landingPageOptions.map((opt) => (
                        <option key={opt.href} value={opt.href}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Auto Sign-out After Inactivity</p>
                    <p className="text-xs text-muted-foreground">Signs you out locally if you step away</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {IDLE_TIMEOUT_OPTIONS.map((opt) => (
                      <Button
                        key={opt.minutes}
                        size="sm"
                        variant={settings.idleTimeoutMinutes === opt.minutes ? "default" : "outline"}
                        onClick={() => updatePreference("idleTimeoutMinutes", opt.minutes)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="size-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm">Notifications</p>
                      <p className="text-xs text-muted-foreground">Reminders for empty daily reports and upcoming trips</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.notificationsEnabled}
                    onCheckedChange={(checked) => updatePreference("notificationsEnabled", checked)}
                  />
                </div>

                {settings.notificationsEnabled && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">Notification Channel</p>
                      <p className="text-xs text-muted-foreground">In-app always shows in the bell icon; Email also sends a copy</p>
                    </div>
                    <div className="flex gap-1">
                      {["Email", "In-app"].map((channel) => (
                        <Button
                          key={channel}
                          size="sm"
                          variant={settings.notificationChannel === channel ? "default" : "outline"}
                          onClick={() => updatePreference("notificationChannel", channel)}
                        >
                          {channel}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
        )}

        {activeSection === "security" && (
        <Card style={{ backgroundColor: "color-mix(in srgb, #FF3B30 6%, var(--card))" }}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <SectionIcon color="#FF3B30">
                <ShieldCheck className="size-4" />
              </SectionIcon>
              <h2 className="font-semibold">Security</h2>
            </div>

            {/* Two-factor authentication */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">
                    {currentUser?.twoFactorEnabled
                      ? "Enabled — a code is emailed to you at login"
                      : "Require an emailed code in addition to your password"}
                  </p>
                </div>
                {currentUser && twoFactorStep === "idle" && (
                  <Button
                    size="sm"
                    variant={currentUser.twoFactorEnabled ? "outline" : "default"}
                    onClick={() => (currentUser.twoFactorEnabled ? setConfirmDisable2fa(true) : startEnableTwoFactor())}
                    disabled={twoFactorBusy}
                  >
                    {currentUser.twoFactorEnabled ? "Disable" : "Enable"}
                  </Button>
                )}
              </div>

              {twoFactorStep === "enabling" && (
                <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">Enter the code we emailed you to confirm.</p>
                  <div className="flex gap-2">
                    <Input
                      inputMode="numeric"
                      placeholder="123456"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="w-32"
                    />
                    <Button size="sm" onClick={confirmEnableTwoFactor} disabled={twoFactorBusy || twoFactorCode.length < 6}>
                      Confirm
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setTwoFactorStep("idle")}>
                      Cancel
                    </Button>
                  </div>
                  {twoFactorError && <p className="text-xs text-destructive">{twoFactorError}</p>}
                </div>
              )}
              {twoFactorStep === "idle" && twoFactorError && <p className="text-xs text-destructive">{twoFactorError}</p>}
            </div>

            {/* Active sessions */}
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm">Active Sessions</p>
                {sessions.length > 1 && (
                  <button
                    onClick={() => setConfirmRevokeAll(true)}
                    className="cursor-pointer text-xs font-medium text-destructive hover:underline"
                  >
                    Log out everywhere
                  </button>
                )}
              </div>
              {sessionsLoading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Spinner size={14} /> Loading…</div>}
              {!sessionsLoading && sessions.length === 0 && (
                <p className="text-xs text-muted-foreground">No other active sessions.</p>
              )}
              <div className="flex flex-col gap-1.5">
                {sessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg bg-foreground/5 px-3 py-2">
                    <div className="flex items-center gap-2">
                      {s.deviceLabel.includes("iPhone") || s.deviceLabel.includes("Android") ? (
                        <Smartphone className="size-3.5 text-muted-foreground" />
                      ) : (
                        <Laptop className="size-3.5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-xs font-medium">{s.deviceLabel}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {s.ipAddress ?? "Unknown IP"} · Last active {timeAgo(s.lastUsedUtc)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => revokeSession(s.id)}
                      className="cursor-pointer rounded-full p-1 text-muted-foreground hover:text-destructive"
                      title="Revoke this session"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {activeSection === "google-drive" && (
        <Card style={{ backgroundColor: "color-mix(in srgb, #4285F4 6%, var(--card))" }}>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <SectionIcon color="#4285F4">
                <CloudCog className="size-4" />
              </SectionIcon>
              <h2 className="font-semibold">Google Drive</h2>
            </div>
            {driveStatus === null ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size={16} /> Loading…</div>
            ) : !driveStatus.configured ? (
              <p className="text-sm text-muted-foreground">
                Google Drive isn&apos;t configured on the server yet — an admin needs to add OAuth credentials before this can be connected.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {driveStatus.connected
                    ? "Reimbursement uploads are mirrored to a “WorkPulse Reimbursements” folder in your Drive, in addition to being saved here."
                    : "Connect your Google Drive so uploaded reimbursement documents are also backed up there automatically."}
                </p>
                {driveStatus.connected ? (
                  <Button variant="outline" className="w-fit" onClick={handleDriveDisconnect}>
                    Disconnect
                  </Button>
                ) : (
                  <Button className="w-fit" onClick={handleDriveConnect} disabled={driveConnecting}>
                    {driveConnecting ? "Redirecting…" : "Connect Google Drive"}
                  </Button>
                )}
              </>
            )}
            {driveMessage && <p className="text-xs text-muted-foreground">{driveMessage}</p>}
          </CardContent>
        </Card>
        )}

        {activeSection === "gmail" && (
        <Card style={{ backgroundColor: "color-mix(in srgb, #EA4335 6%, var(--card))" }}>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <SectionIcon color="#EA4335">
                <Mail className="size-4" />
              </SectionIcon>
              <h2 className="font-semibold">Gmail</h2>
            </div>
            {gmailStatus === null ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size={16} /> Loading…</div>
            ) : !gmailStatus.configured ? (
              <p className="text-sm text-muted-foreground">
                Gmail isn&apos;t configured on the server yet — an admin needs to add OAuth credentials before this can be connected.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {gmailStatus.connected
                    ? `Connected as ${gmailStatus.emailAddress} — the Gmail Labels section stays synced with this account.`
                    : "Connect a Gmail account to search, browse and manage its labels from WorkPulse."}
                </p>
                {gmailStatus.connected ? (
                  <Button variant="outline" className="w-fit" onClick={handleGmailDisconnect}>
                    Disconnect
                  </Button>
                ) : (
                  <Button className="w-fit" onClick={handleGmailConnect} disabled={gmailConnecting}>
                    {gmailConnecting ? "Redirecting…" : "Connect Gmail"}
                  </Button>
                )}
              </>
            )}
            {gmailMessage && <p className="text-xs text-muted-foreground">{gmailMessage}</p>}
          </CardContent>
        </Card>
        )}

        {activeSection === "data" && (
        <Card style={{ backgroundColor: "color-mix(in srgb, #00C7BE 6%, var(--card))" }}>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <SectionIcon color="#00C7BE">
                <Download className="size-4" />
              </SectionIcon>
              <h2 className="font-semibold">Your Data</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Download a copy of your attendance, reports, trips, contacts, and bookmarks as a JSON backup.
            </p>
            <Button variant="outline" className="w-fit" onClick={handleExport} disabled={exporting}>
              <Download className="size-4" /> {exporting ? "Exporting…" : "Export My Data"}
            </Button>
          </CardContent>
        </Card>
        )}

        {activeSection === "account" && (
        <Card style={{ backgroundColor: "color-mix(in srgb, #34C759 6%, var(--card))" }}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <SectionIcon color="#34C759">
                <UserCog className="size-4" />
              </SectionIcon>
              <h2 className="font-semibold">Account</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{displayName}</span>
            </p>

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <label className="text-sm">Display Name</label>
              <div className="flex gap-2">
                <Input value={displayNameInput} onChange={(e) => setDisplayNameInput(e.target.value)} className="max-w-64" />
                <Button size="sm" onClick={handleSaveDisplayName} disabled={savingDisplayName || !displayNameInput.trim()}>
                  {displayNameSaved ? <Check className="size-3.5" /> : null}
                  {displayNameSaved ? "Saved" : "Save"}
                </Button>
              </div>
              {displayNameError && <p className="text-xs text-destructive">{displayNameError}</p>}
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <p className="text-sm">Change Password</p>
              <div className="grid max-w-64 grid-cols-1 gap-2">
                <Input
                  type="password"
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <Input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <Button
                size="sm"
                className="w-fit"
                onClick={handleChangePassword}
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              >
                {passwordSaved ? <Check className="size-3.5" /> : null}
                {passwordSaved ? "Password updated" : changingPassword ? "Updating…" : "Update Password"}
              </Button>
              {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
            </div>

            <Button variant="outline" className="w-fit" onClick={logout}>
              <LogOut className="size-4" /> Log out
            </Button>
          </CardContent>
        </Card>
        )}

        {activeSection === "danger-zone" && (
        <Card style={{ backgroundColor: "color-mix(in srgb, #FF3B30 6%, var(--card))" }}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <SectionIcon color="#FF3B30">
                <AlertTriangle className="size-4" />
              </SectionIcon>
              <h2 className="font-semibold">Danger Zone</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Permanently delete your WorkPulse account and everything in it — attendance records, reports, trips,
              reimbursement documents, contacts, bookmarks, and connected integrations. This can&apos;t be undone.
            </p>

            {!confirmDeleteAccount ? (
              <Button variant="outline" className="w-fit border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => setConfirmDeleteAccount(true)}>
                <AlertTriangle className="size-4" /> Delete My Account
              </Button>
            ) : (
              <div className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-xs text-muted-foreground">Enter your password to confirm permanent deletion.</p>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="max-w-56"
                    autoComplete="current-password"
                  />
                  <Button variant="destructive" size="sm" onClick={handleDeleteAccount} disabled={deleting || !deletePassword}>
                    {deleting ? "Deleting…" : "Permanently Delete"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setConfirmDeleteAccount(false);
                      setDeletePassword("");
                      setDeleteError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {activeSection === "shortcuts" && (
        <Card style={{ backgroundColor: "color-mix(in srgb, #5AC8FA 6%, var(--card))" }}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <SectionIcon color="#5AC8FA">
                <Keyboard className="size-4" />
              </SectionIcon>
              <h2 className="font-semibold">Keyboard Shortcuts</h2>
            </div>
            <div className="flex flex-col gap-1">
              {[
                { keys: ["⌘/Ctrl", "K"], description: "Open quick search — jump to any section, resource, or bookmark" },
                { keys: ["⌘/Ctrl", "Z"], description: "Undo — Daily Reports editor" },
                { keys: ["⌘/Ctrl", "Shift", "Z"], description: "Redo — Daily Reports editor" },
                { keys: ["⌘/Ctrl", "Click"], description: "View details instead of opening the link — Bookmarks" },
                { keys: ["Esc"], description: "Close the open dropdown, dialog, or inline edit box" },
              ].map((shortcut, i) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded-lg px-1 py-2">
                  <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                  <div className="flex shrink-0 gap-1">
                    {shortcut.keys.map((k, j) => (
                      <kbd key={j} className="rounded-md border border-border bg-foreground/5 px-1.5 py-0.5 font-mono text-xs">
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        )}

        {activeSection === "about" && (
        <Card style={{ backgroundColor: "color-mix(in srgb, #6E6E73 6%, var(--card))" }}>
          <CardContent className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <SectionIcon color="#6E6E73">
                <Info className="size-4" />
              </SectionIcon>
              <h2 className="font-semibold">About</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">WorkPulse Web — Attendance, Reports, Trips, and more, all in one place.</p>
            <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
              <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-medium">v{APP_VERSION}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  APP_ENV === "Production" ? "bg-[#34C759]/15 text-[#34C759]" : "bg-[#FF9500]/15 text-[#FF9500]"
                )}
              >
                {APP_ENV}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">{GIT_SHA}</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection("whats-new")}
              className="mt-3 flex w-fit cursor-pointer items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Sparkles className="size-3.5" /> See what&apos;s new
            </button>
          </CardContent>
        </Card>
        )}

        {activeSection === "whats-new" && (
        <Card style={{ backgroundColor: "color-mix(in srgb, #FF9500 6%, var(--card))" }}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <SectionIcon color="#FF9500">
                <Sparkles className="size-4" />
              </SectionIcon>
              <h2 className="font-semibold">What&apos;s New</h2>
            </div>
            {CHANGELOG.map((entry) => (
              <div key={entry.version} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">v{entry.version}</span>
                  <span className="text-xs text-muted-foreground">{entry.date}</span>
                </div>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {entry.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
        )}
        </div>
      </div>

      {confirmDisable2fa && (
        <ConfirmDialog
          title="Disable Two-Factor Authentication?"
          description="You'll only need your password to sign in from now on."
          confirmLabel="Disable"
          cancelLabel="Cancel"
          onConfirm={disableTwoFactor}
          onCancel={() => setConfirmDisable2fa(false)}
        />
      )}

      {confirmRevokeAll && (
        <ConfirmDialog
          title="Log out everywhere?"
          description="This signs you out of every device and browser, including this one."
          confirmLabel="Log out everywhere"
          cancelLabel="Cancel"
          onConfirm={revokeAllSessions}
          onCancel={() => setConfirmRevokeAll(false)}
        />
      )}
    </div>
  );
}
