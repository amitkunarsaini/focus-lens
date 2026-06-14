import { redirect } from "next/navigation";
import Link from "next/link";
import { Aperture, ArrowRight, Brain, Unplug, Target, LineChart } from "lucide-react";
import { getCurrentUserId } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const userId = await getCurrentUserId();
  if (userId) redirect("/dashboard");

  const features = [
    { icon: Brain, title: "Focus session detection", body: "Automatically finds your deep-work blocks and scores their quality." },
    { icon: Unplug, title: "Attention leak detection", body: "Surfaces what breaks your flow and the real cost of recovering it." },
    { icon: LineChart, title: "Productivity intelligence", body: "An explainable 0–100 score from real behaviour, not guesswork." },
    { icon: Target, title: "Goal alignment", body: "Compares how you actually spend attention against what you intend." },
  ];

  return (
    <div className="app-aurora min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
            <Aperture className="h-5 w-5 text-primary" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Focus<span className="text-gradient">Lens</span>
          </span>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href="/login">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="py-20 text-center sm:py-28">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Attention Intelligence Platform
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
            This isn&apos;t another <span className="text-muted-foreground">screen-time tracker.</span>
            <br />
            It&apos;s an <span className="text-gradient">attention intelligence</span> system.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            FocusLens understands how you spend attention, finds your focus patterns,
            predicts distractions, and helps you improve — all from real behavioural data.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/login">
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-5 pb-24 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="glass glass-hover rounded-2xl p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
                <f.icon className="h-5 w-5 text-primary" />
              </span>
              <h3 className="mt-4 font-medium">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
