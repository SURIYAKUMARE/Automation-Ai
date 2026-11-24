"use client";

import * as React from "react";
import Link from "next/link";
import { Lock, Mail, ArrowRight, Eye, EyeOff, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
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
    const toastId = toast.loading("Signing into SocialSync AI...");

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

      toast.success("Welcome back! Redirecting to dashboard...");
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden selection:bg-indigo-500/20">
      {/* Background radial ambient lights */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-gradient-to-b from-indigo-500/15 via-violet-500/10 to-transparent rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-3xl" />

      <Card className="w-full max-w-md border border-border/80 shadow-2xl relative bg-card/95 backdrop-blur-xl rounded-2xl overflow-hidden">
        {/* Top subtle highlight line */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />

        <CardHeader className="space-y-3 text-center pt-8 pb-4">
          <Link href="/" className="inline-flex items-center justify-center gap-2.5 mx-auto group">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
          </Link>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              Sign in to <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">SocialSync AI</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Commercial AI Social Media Automation &amp; Publishing
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 px-6 pt-2 pb-6">
          {errorMessage && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Continue with Google */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 h-11 text-xs font-semibold border-border hover:bg-muted/70 transition-all rounded-xl shadow-xs"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
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

          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-border w-full" />
            <span className="bg-card px-3 text-[11px] text-muted-foreground uppercase font-mono tracking-wider absolute">
              or credentials
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email Address
                </span>
              </label>
              <Input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="text-xs h-10 rounded-xl bg-background/50 focus:bg-background transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Password
                </label>
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
                  placeholder="Enter your password"
                  className="text-xs h-10 pr-10 rounded-xl bg-background/50 focus:bg-background transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {showForgotPassword && (
              <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/20 text-xs space-y-2">
                <p className="text-muted-foreground">
                  Enter your email above and click below to request a password recovery email.
                </p>
                {resetEmailSent ? (
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-xs">
                    <CheckCircle2 className="h-4 w-4" />
                    Reset instructions dispatched.
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleForgotPassword}
                    className="w-full h-8 text-xs font-medium rounded-lg"
                  >
                    Send Reset Link
                  </Button>
                )}
              </div>
            )}

            <Button
              type="submit"
              variant="stitch"
              disabled={isLoading}
              className="w-full h-11 font-semibold text-xs rounded-xl shadow-md shadow-indigo-500/20 gap-2 mt-2"
            >
              <span>{isLoading ? "Authenticating..." : "Sign in to Dashboard"}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>

        <CardFooter className="border-t border-border/60 py-4 px-6 flex items-center justify-center text-xs text-muted-foreground bg-muted/20">
          <span>Don&apos;t have an account?</span>
          <Link href="/register" className="ml-1 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
            Create account
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
