"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api/client";
import { useShakeAnimation } from "@/hooks/use-shake-animation";
import { useSlowRequest } from "@/hooks/use-slow-request";
import { EMAIL_PATTERN, isControlKeystroke, isEmailKeystrokeAllowed } from "@/lib/validation";

export default function LoginPage() {
  const { login, googleSignIn, verifyTwoFactor, cancelTwoFactor, pendingTwoFactorEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { slow, run } = useSlowRequest();
  const { controls: emailShakeControls, shake: shakeEmail } = useShakeAnimation();

  const emailValid = email.trim() === "" || EMAIL_PATTERN.test(email.trim());

  function handleEmailKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (isControlKeystroke(e)) return;
    if (!isEmailKeystrokeAllowed(e.key, email)) {
      e.preventDefault();
      shakeEmail();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_PATTERN.test(email.trim())) {
      shakeEmail();
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await run(() => login({ email, password }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleCredential(credential: string) {
    setError(null);
    setLoading(true);
    try {
      await run(() => googleSignIn(credential));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await run(() => verifyTwoFactor(code));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  }

  if (pendingTwoFactorEmail) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[400px]"
      >
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-icon bg-primary text-primary-foreground shadow-[var(--glass-shadow-sm)]">
            <ShieldCheck className="size-7 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
            <p className="text-sm text-text-secondary">
              Enter the code we sent to <span className="font-medium text-text-primary">{pendingTwoFactorEmail}</span>
            </p>
          </div>
        </div>

        <Card className="p-8">
          <CardContent>
            <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
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
                {loading ? <Spinner size={18} /> : "Verify & Sign in"}
              </Button>
              {loading && slow && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="-mt-2 text-center text-xs text-text-secondary"
                >
                  Waking up the server — this can take up to a minute on the first request…
                </motion.p>
              )}
              <Button type="button" variant="outline" onClick={cancelTwoFactor} className="w-full">
                <ArrowLeft className="size-4" /> Back
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[400px]"
    >
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-icon bg-primary text-primary-foreground shadow-[var(--glass-shadow-sm)]">
          <Activity className="size-7 text-primary-foreground" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-text-secondary">Sign in to WorkPulse</p>
        </div>
      </div>

      <Card className="p-8">
        <CardHeader className="sr-only">
          <h2>Login</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <motion.div className="flex flex-col gap-1.5" animate={emailShakeControls} initial={{ x: 0 }}>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleEmailKeyDown}
                required
                autoComplete="email"
                className={!emailValid ? "border-destructive focus-visible:ring-destructive/40" : undefined}
              />
              {!emailValid && <p className="text-xs text-destructive">Enter a valid email, e.g. name@domain.com</p>}
            </motion.div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="text-sm text-destructive"
              >
                {error}
              </motion.p>
            )}

            <Button type="submit" disabled={loading} className="mt-2 w-full">
              {loading ? (
                <Spinner size={18} />
              ) : (
                <>
                  Sign in <ArrowRight className="size-4" />
                </>
              )}
            </Button>
            {loading && slow && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="-mt-2 text-center text-xs text-text-secondary"
              >
                Waking up the server — this can take up to a minute on the first request…
              </motion.p>
            )}
          </form>
        </CardContent>
      </Card>

      <div className="my-6 flex items-center gap-3 text-xs text-text-secondary">
        <div className="h-px flex-1 bg-border" />
        or
        <div className="h-px flex-1 bg-border" />
      </div>
      <GoogleSignInButton onCredential={handleGoogleCredential} />

      <p className="mt-6 text-center text-sm text-text-secondary">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-text-secondary">
        By continuing, you agree to WorkPulse&apos;s{" "}
        <Link href="/terms" className="hover:text-text-primary hover:underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="hover:text-text-primary hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </motion.div>
  );
}
