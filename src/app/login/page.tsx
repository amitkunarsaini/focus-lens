"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Aperture, Loader2, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Could not sign in. Check your password (new accounts are created on first sign-in).");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="app-aurora flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
            <Aperture className="h-7 w-7 text-primary" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">
            Focus<span className="text-gradient">Lens</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Understand where your attention really goes.
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Email</span>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 focus-within:border-primary/50">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-10 flex-1 bg-transparent text-sm outline-none"
                />
              </div>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Password</span>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 focus-within:border-primary/50">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 flex-1 bg-transparent text-sm outline-none"
                />
              </div>
            </label>

            {error && <p className="text-xs text-rose-400">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Continue
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            New here? Just enter an email and password — your account is created automatically.
          </p>
        </Card>
      </div>
    </div>
  );
}
