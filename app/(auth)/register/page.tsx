"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    toast.loading("Creating account...");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: fullName }),
      });

      const data = await res.json();
      toast.dismiss();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Registration failed");
      }

      toast.success("Account created successfully! Welcome to SocialSync AI.");
      router.push("/dashboard");
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative">
      <Card className="w-full max-w-md border border-border shadow-sm">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black font-bold text-sm tracking-tight mb-1">
            S
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Create your Account
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Multi-Platform Social Media Automation System
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignup}
            className="w-full flex items-center justify-center gap-2.5 h-10 text-xs font-semibold border-border hover:bg-muted/50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
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

          <div className="relative flex items-center justify-center">
            <div className="border-t border-border w-full" />
            <span className="bg-card px-2 text-[11px] text-muted-foreground uppercase font-mono tracking-wider absolute">
              or register
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
                placeholder="Your Full Name"
                className="text-xs h-10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email Address
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="text-xs font-mono h-10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Password
              </label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="text-xs h-10"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-black text-white dark:bg-white dark:text-black font-semibold text-xs hover:opacity-90 transition-opacity gap-2"
            >
              <span>{isLoading ? "Creating Account..." : "Create Account & Start"}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>

        <CardFooter className="border-t border-border pt-4 flex items-center justify-center text-xs text-muted-foreground">
          <span>Already have an account? </span>
          <Link href="/login" className="ml-1 text-foreground font-semibold hover:underline">
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
