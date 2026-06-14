"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SeedDemoButton() {
  const router = useRouter();
  const seed = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/demo", { method: "POST" });
      if (!res.ok) throw new Error("failed");
    },
    onSuccess: () => router.refresh(),
  });

  return (
    <Button onClick={() => seed.mutate()} disabled={seed.isPending} size="lg">
      {seed.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      Explore with demo data
    </Button>
  );
}
