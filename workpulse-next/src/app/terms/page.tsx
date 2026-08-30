import Link from "next/link";

export const metadata = {
  title: "Terms of Service — WorkPulse",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-foreground">
      <Link href="/" className="text-sm text-primary hover:underline">
        ← Back to WorkPulse
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated 2026-08-30</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-foreground/90">
        <p>
          WorkPulse is a personal productivity and attendance-tracking tool, provided as-is for its own users. By
          creating an account, you agree to the following.
        </p>

        <section>
          <h2 className="mb-2 text-base font-semibold">Your account</h2>
          <p>
            You&apos;re responsible for the accuracy of the information you enter and for keeping your account
            credentials secure. You may delete your account at any time from Settings, which permanently removes
            your data.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">Acceptable use</h2>
          <p>
            Use WorkPulse only for its intended purpose — tracking your own attendance, reports, trips,
            reimbursements, bookmarks, and contacts. Don&apos;t attempt to access another user&apos;s data or disrupt
            the service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">No warranty</h2>
          <p>
            WorkPulse is provided without warranty of any kind. While reasonable care is taken with your data, it
            comes with no guarantee of uptime or availability.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">Changes</h2>
          <p>These terms may be updated from time to time as the app evolves.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">Contact</h2>
          <p>
            Questions can be sent to{" "}
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
