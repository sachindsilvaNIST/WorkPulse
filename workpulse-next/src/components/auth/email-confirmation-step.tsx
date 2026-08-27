"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Mail } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";
import { useSlowRequest } from "@/hooks/use-slow-request";

/** Shared by both Login and Register — either page can land here (register always does; login
 * does whenever a password-correct attempt hits an account that never finished verifying). */
export function EmailConfirmationStep({ email }: { email: string }) {
  const { confirmEmail, resendConfirmationCode, cancelEmailConfirmation } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const { slow, run } = useSlowRequest();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await run(() => confirmEmail(code));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    try {
      await resendConfirmationCode();
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to resend code.");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-sm"
    >
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0078D4] to-[#004f9e] shadow-lg shadow-blue-500/20">
          <Mail className="size-7 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Confirm your email</h1>
          <p className="text-sm text-muted-foreground">
            Enter the code we sent to <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-code">Confirmation Code</Label>
              <Input
                id="confirm-code"
                inputMode="numeric"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus
                autoComplete="one-time-code"
              />
            </div>

            {error && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="text-sm text-destructive">
                {error}
              </motion.p>
            )}

            <Button type="submit" disabled={loading || code.length < 6} className="mt-2 w-full">
              {loading ? <Spinner size={18} /> : "Confirm & Sign in"}
            </Button>
            {loading && slow && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="-mt-2 text-center text-xs text-muted-foreground">
                Waking up the server — this can take up to a minute on the first request…
              </motion.p>
            )}

            <button
              type="button"
              onClick={handleResend}
              className="cursor-pointer text-center text-xs font-medium text-primary hover:underline"
            >
              {resent ? "Code resent — check your email" : "Didn't get it? Resend code"}
            </button>

            <Button type="button" variant="outline" onClick={cancelEmailConfirmation} className="w-full">
              <ArrowLeft className="size-4" /> Back
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
