import Script from "next/script";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen w-full items-center justify-center p-6">
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      {children}
    </main>
  );
}
