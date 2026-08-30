import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — WorkPulse",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-foreground">
      <Link href="/" className="text-sm text-primary hover:underline">
        ← Back to WorkPulse
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated 2026-08-30</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-foreground/90">
        <p>
          WorkPulse is a personal productivity and attendance-tracking tool. This page explains what information it
          collects and how it&apos;s used.
        </p>

        <section>
          <h2 className="mb-2 text-base font-semibold">What we collect</h2>
          <p>
            When you create an account, we store your display name, email address, and the attendance, report,
            business trip, reimbursement, bookmark, and contact data you enter into the app. If you sign in with
            Google, we receive your name, email address, and profile picture from Google to create or match your
            account — we don&apos;t receive your Google password or any other Google account data through that
            sign-in.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">Google Drive and Gmail (optional features)</h2>
          <p>
            If you separately choose to connect Google Drive or Gmail from within WorkPulse, the app requests
            limited, specific permissions: creating a backup copy of your own Reimbursement/Resources documents in a
            dedicated Drive folder, or managing Gmail labels you create. WorkPulse&apos;s use of information received
            from Google APIs adheres to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. This data is never sold, shared with advertisers, or used for
            anything beyond the feature you explicitly connected it for. You can disconnect Drive or Gmail at any
            time from Settings.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">Where your data lives</h2>
          <p>
            Everything you enter is stored in WorkPulse&apos;s own database. We don&apos;t sell your data or share it
            with third parties, aside from the specific Google features described above that you opt into yourself.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">Your control over your data</h2>
          <p>
            You can export or delete your data at any time from within Settings, including permanently deleting your
            account and everything associated with it.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">Contact</h2>
          <p>
            Questions about this policy can be sent to{" "}
            <a href="mailto:sachinronson16@gmail.com" className="text-primary hover:underline">
              sachinronson16@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
