"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Activity,
  BarChart3,
  Target,
  Lightbulb,
  Timer,
  LogOut,
  Aperture,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ModeBadge } from "./mode-badge";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/timeline", label: "Timeline", icon: Activity },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/focus", label: "Focus Sessions", icon: Timer },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/goals", label: "Goals", icon: Target },
];

export function Sidebar({
  user,
}: {
  user: { name: string | null; email: string | null; mode: "LIVE" | "DEMO" };
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-2 border-r border-border/60 px-4 py-6 md:flex">
      <Link href="/dashboard" className="mb-4 flex items-center gap-2.5 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
          <Aperture className="h-5 w-5 text-primary" />
        </span>
        <span className="text-lg font-semibold tracking-tight">
          Focus<span className="text-gradient">Lens</span>
        </span>
      </Link>

      <ModeBadge mode={user.mode} />

      <nav className="mt-4 flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-primary/15 text-foreground ring-1 ring-primary/25"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-border/60 bg-secondary/30 p-3">
        <div className="truncate text-sm font-medium">{user.name ?? "You"}</div>
        <div className="truncate text-xs text-muted-foreground">{user.email}</div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </aside>
  );
}
