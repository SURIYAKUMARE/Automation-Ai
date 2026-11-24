"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, User, ArrowRight, Eye, EyeOff, Sparkles, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");

  const passwordRequirements = [
    { label: "At least 6 characters", met: password.length >= 6 },
    { label: "Contains a number or symbol", met: /[0-9!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Creating your SocialSync AI account...");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, name: fullName.trim() }),
      });

      const data = await res.json();
      toast.dismiss(toastId);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Registration failed. Please check your credentials.");
      }

      if (data.confirmationRequired) {
        toast.success("Account created! Please check your email to confirm your account.");
        router.push("/login");
        return;
      }
      toast.success("Account created successfully! Welcome to SocialSync AI.");
      router.push("/dashboard");
    } catch (err: any) {
      toast.dismiss(toastId);
      const msg = err.message || "Failed to create account. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    window.location.assign(new URL("/api/auth/google", window.location.origin));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden selection:bg-indigo-500/20">
      {/* Background ambient light */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-gradient-to-b from-indigo-500/15 via-violet-500/10 to-transparent rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/4 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-3xl" />

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
              Create your <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">SocialSync AI</span> Account
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Start publishing across Instagram, Facebook, LinkedIn &amp; YouTube in minutes
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
            onClick={handleGoogleSignup}
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
              or register with email
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" /> Full Name
              </label>
              <Input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Morgan"
                className="text-xs h-10 rounded-xl bg-background/50 focus:bg-background transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Work Email
              </label>
              <Input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@company.com"
                className="text-xs h-10 rounded-xl bg-background/50 focus:bg-background transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
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

              {/* Password strength checklist */}
              {password.length > 0 && (
                <div className="pt-1.5 space-y-1">
                  {passwordRequirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px]">
                      <div className={`h-3 w-3 rounded-full flex items-center justify-center ${req.met ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                        <Check className="h-2 w-2" />
                      </div>
                      <span className={req.met ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="submit"
              variant="stitch"
              disabled={isLoading}
              className="w-full h-11 font-semibold text-xs rounded-xl shadow-md shadow-indigo-500/20 gap-2 mt-2"
            >
              <span>{isLoading ? "Creating workspace..." : "Create Account & Get Started"}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>

        <CardFooter className="border-t border-border/60 py-4 px-6 flex items-center justify-center text-xs text-muted-foreground bg-muted/20">
          <span>Already have an account?</span>
          <Link href="/login" className="ml-1 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
