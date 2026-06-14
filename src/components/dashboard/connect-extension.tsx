"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Puzzle, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Me {
  ingestToken: string;
  appUrl: string;
  mode: "LIVE" | "DEMO";
  aiEnabled: boolean;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <button
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-left font-mono text-xs transition-colors hover:border-primary/40"
      >
        <span className="truncate">{value}</span>
        {copied ? (
          <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-400" />
        ) : (
          <Copy className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}

export function ConnectExtension({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const { data } = useQuery<Me>({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me");
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  return (
    <Card className="p-5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 text-left">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/15 ring-1 ring-cyan-400/25">
          <Puzzle className="h-4.5 w-4.5 text-cyan-400" />
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">Connect your browser extension</h3>
            {data?.aiEnabled && <Badge variant="default">AI enabled</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            Stream real attention data into FocusLens (Live Mode).
          </p>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && data && (
        <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
          <ol className="space-y-1.5 text-sm text-muted-foreground">
            <li>1. Build the extension: <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">npm run ext:build</code></li>
            <li>2. In Chrome → Extensions → enable Developer mode → Load unpacked → select <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">extension/dist</code></li>
            <li>3. Open the extension Settings and paste the values below.</li>
          </ol>
          <div className="grid gap-3 sm:grid-cols-2">
            <CopyField label="Dashboard URL" value={data.appUrl} />
            <CopyField label="Ingest token" value={data.ingestToken} />
          </div>
        </div>
      )}
    </Card>
  );
}
