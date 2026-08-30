import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth-context";
import { AccentProvider } from "@/lib/accent-context";
import { FONT_SIZE_SCALE, FONT_SIZE_STORAGE_KEY } from "@/lib/font-size";
import "./globals.css";

// Runs before hydration (same technique next-themes uses for the dark/light flash) so a saved
// font-size preference applies on first paint instead of popping in a moment after load.
const FONT_SIZE_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem(${JSON.stringify(
  FONT_SIZE_STORAGE_KEY
)});var s=${JSON.stringify(FONT_SIZE_SCALE)}[p];if(s)document.documentElement.style.fontSize=s;}catch(e){}})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WorkPulse",
  description: "Attendance, reports, business trips, reimbursement, and bookmarks — all in one place.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WorkPulse",
  },
};

export const viewport = {
  themeColor: "#0078D4",
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: FONT_SIZE_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AccentProvider>
            <AuthProvider>{children}</AuthProvider>
          </AccentProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
