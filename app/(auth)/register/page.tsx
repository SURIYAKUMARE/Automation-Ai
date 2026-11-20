"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Lock, Mail, User, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = React.useState("Jeffrey Rathinam");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    toast.loading("Creating account and initializing database tenant...");

    setTimeout(() => {
      setIsLoading(false);
      toast.dismiss();
      toast.success("Account created successfully! Welcome to SocialSync AI.");
      router.push("/dashboard");
    }, 900);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md border-border/80 shadow-2xl relative z-10">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25 mb-2">
            <Zap className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Create your Account</CardTitle>
          <CardDescription className="text-xs">
            Begin multi-platform autonomous social media publishing
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" /> Full Name
              </label>
              <Input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jeffrey Rathinam"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary" /> Email
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-primary" /> Password
              </label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="text-xs"
              />
            </div>

            <Button
              type="submit"
              variant="stitch"
              disabled={isLoading}
              className="w-full mt-2 gap-2 text-xs"
            >
              <span>{isLoading ? "Creating Account..." : "Create Account & Start"}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </form>

        <CardFooter className="border-t border-border/60 pt-4 flex items-center justify-center text-xs text-muted-foreground">
          <span>Already have an account? </span>
          <Link href="/login" className="ml-1 text-primary font-semibold hover:underline">
            Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
