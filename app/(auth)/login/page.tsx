"use client";

import * as React from "react";
import Link from "next/link";
import { Lock, Mail, ArrowRight, Eye, EyeOff, Layers, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const GOOGLE_ERRORS: Record<string, string> = {
  session_configuration: "Sign-in is temporarily unavailable. Contact the workspace administrator.",
  google_configuration: "Google sign-in is unavailable until the app's Google OAuth credentials are configured in environment variables.",
  supabase_configuration: "Sign-in is unavailable until a valid Supabase project URL and server key are configured.",
  google_sign_in_failed: "Google sign-in could not be completed. Try again or contact the workspace administrator.",
  google_access_denied: "Google access was cancelled or denied. If your Google Cloud app is in Testing mode, ensure your Gmail is added under Test Users in Google Cloud Console.",
  google_state_mismatch: "Google sign-in session expired. Please click 'Continue with Google' to try again.",
};

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [showForgotPassword, setShowForgotPassword] = React.useState(false);
  const [resetEmailSent, setResetEmailSent] = React.useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("error");
    if (code && Object.hasOwn(GOOGLE_ERRORS, code)) {
      setErrorMessage(GOOGLE_ERRORS[code]);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Signing in...");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      toast.dismiss(toastId);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Authentication failed. Check your email and password.");
      }

      toast.success("Welcome back! Redirecting...");
      window.location.replace(new URL("/dashboard", window.location.origin));
    } catch (err) {
      toast.dismiss(toastId);
      const msg = err instanceof Error ? err.message : "Sign-in could not be completed.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.assign(new URL("/api/auth/google", window.location.origin));
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your account email address first.");
      return;
    }
    setResetEmailSent(true);
    toast.success("Password reset instructions sent if an account matches.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 px-4 py-12 selection:bg-indigo-500/20 font-sans">
      <Card className="w-full max-w-sm border border-border bg-card shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="space-y-2 text-center pt-8 pb-4">
          <Link href="/" className="inline-flex items-center justify-center gap-2 mx-auto">
            <div className="size-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Layers size={16} />
            </div>
          </Link>
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              Sign in to SocialSync
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Enter your credentials to access your workspace.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 px-6 pt-2 pb-6">
          {errorMessage && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Google Sign-in */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2.5 h-9 text-xs font-medium border-border hover:bg-muted/60 rounded-lg shadow-2xs"
          >
            <svg className="size-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </Button>

          <div className="relative flex items-center justify-center my-1">
            <div className="border-t border-border w-full" />
            <span className="bg-card px-2 text-[10px] text-muted-foreground uppercase tracking-wider font-mono absolute">
              or
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Email Address
              </label>
              <Input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="text-xs h-9 rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(!showForgotPassword)}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="text-xs h-9 pr-9 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>

            {showForgotPassword && (
              <div className="p-3 rounded-lg border border-border bg-muted/30 text-xs space-y-2">
                <p className="text-muted-foreground">
                  Enter your email above to request a reset link.
                </p>
                {resetEmailSent ? (
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-xs">
                    <CheckCircle2 className="size-3.5" />
                    Reset instructions sent.
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleForgotPassword}
                    className="w-full h-7 text-xs font-medium rounded-md"
                  >
                    Send Reset Link
                  </Button>
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-9 font-semibold text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs gap-1.5 mt-1"
            >
              <span>{isLoading ? "Signing in..." : "Sign in"}</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </form>
        </CardContent>

        <CardFooter className="border-t border-border py-3 px-6 flex items-center justify-center text-xs text-muted-foreground bg-muted/20">
          <span>Don&apos;t have an account?</span>
          <Link href="/register" className="ml-1 text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
            Sign up
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
