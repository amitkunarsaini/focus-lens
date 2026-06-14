import Anthropic from "@anthropic-ai/sdk";

/**
 * Optional AI layer.
 *
 * FocusLens computes ALL of its analytics deterministically. The AI layer is a
 * pure enhancement that rewrites already-computed structured insights into a
 * warmer narrative. If no key is configured, callers fall back to the
 * deterministic text and the product is fully functional.
 */

const MODEL = process.env.FOCUSLENS_AI_MODEL || "claude-opus-4-8";

export function isAIEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!isAIEnabled()) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return client;
}

/**
 * Rewrite a deterministic narrative + its structured backing data into a
 * concise, human first-person insight. Returns the fallback verbatim if AI is
 * unavailable or errors.
 */
export async function enhanceNarrative(opts: {
  fallback: string;
  data: Record<string, unknown>;
  kind: "daily" | "weekly";
}): Promise<{ text: string; source: "AI" | "DETERMINISTIC" }> {
  const c = getClient();
  if (!c) return { text: opts.fallback, source: "DETERMINISTIC" };

  try {
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 400,
      system:
        "You are FocusLens, an attention-intelligence coach. Given precomputed " +
        "behavioural metrics and a draft summary, rewrite it as a sharp, " +
        "encouraging 2–4 sentence insight in second person. Use ONLY the numbers " +
        "provided — never invent figures. No preamble, no markdown headings.",
      messages: [
        {
          role: "user",
          content:
            `Kind: ${opts.kind}\n` +
            `Metrics: ${JSON.stringify(opts.data)}\n` +
            `Draft: ${opts.fallback}`,
        },
      ],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return text
      ? { text, source: "AI" }
      : { text: opts.fallback, source: "DETERMINISTIC" };
  } catch {
    return { text: opts.fallback, source: "DETERMINISTIC" };
  }
}
