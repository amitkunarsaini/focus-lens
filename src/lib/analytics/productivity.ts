import type { ProductivityResult, ContextSwitchResult } from "./types";
import { fmtDuration } from "@/lib/utils";

/**
 * Productivity scoring engine.
 *
 * Produces an explainable 0–100 score from five weighted components. Every
 * component is derived from real measured behaviour — nothing is hardcoded and
 * no AI is required. The weights sum to 100.
 */

export const PRODUCTIVITY_WEIGHTS = {
  category: 40, // share of active time on productive categories
  focus: 25, // deep / sustained focus time
  switching: 20, // sustained attention (inverse of context switching)
  idle: 5, // staying engaged rather than idle
  goal: 10, // alignment with declared goals
} as const;

export interface ProductivityInput {
  productiveSeconds: number;
  neutralSeconds: number;
  distractingSeconds: number;
  idleSeconds: number;
  deepWorkSeconds: number;
  focusSeconds: number;
  contextSwitch: ContextSwitchResult;
  /** Average goal progress in 0..1 across active goals (undefined if none). */
  goalProgress?: number;
}

export function computeProductivity(
  input: ProductivityInput,
): ProductivityResult {
  const active =
    input.productiveSeconds + input.neutralSeconds + input.distractingSeconds;
  const W = PRODUCTIVITY_WEIGHTS;

  // Category: productive share, with distracting time actively dragging down.
  const productiveRatio = active > 0 ? input.productiveSeconds / active : 0;
  const distractingRatio = active > 0 ? input.distractingSeconds / active : 0;
  const categoryComponent = Math.round(
    Math.max(0, productiveRatio - distractingRatio * 0.5) * W.category,
  );

  // Focus: reward deep work. ~3h of deep work saturates the component.
  const focusRatio = Math.min(1, input.deepWorkSeconds / (3 * 3600));
  const focusComponent = Math.round(focusRatio * W.focus);

  // Switching: directly from the context-switch score.
  const switchingComponent = Math.round((input.contextSwitch.score / 100) * W.switching);

  // Idle: small credit for not being idle a large share of the time.
  const totalWithIdle = active + input.idleSeconds;
  const engagedRatio =
    totalWithIdle > 0 ? active / totalWithIdle : 1;
  const idleComponent = Math.round(engagedRatio * W.idle);

  // Goal: alignment with declared goals (neutral 60% credit if no goals set).
  const goalComponent = Math.round(
    (input.goalProgress ?? 0.6) * W.goal,
  );

  const score = Math.max(
    0,
    Math.min(
      100,
      categoryComponent +
        focusComponent +
        switchingComponent +
        idleComponent +
        goalComponent,
    ),
  );

  const explanation = buildExplanation(input, {
    categoryComponent,
    focusComponent,
    switchingComponent,
    idleComponent,
    goalComponent,
    score,
  });

  return {
    score,
    categoryComponent,
    focusComponent,
    switchingComponent,
    idleComponent,
    goalComponent,
    explanation,
  };
}

function buildExplanation(
  input: ProductivityInput,
  r: Omit<ProductivityResult, "explanation">,
): string {
  const active =
    input.productiveSeconds + input.neutralSeconds + input.distractingSeconds;
  const pPct = active > 0 ? Math.round((input.productiveSeconds / active) * 100) : 0;
  const parts: string[] = [];
  parts.push(
    `${pPct}% of your ${fmtDuration(active)} of active time was on productive categories (+${r.categoryComponent}).`,
  );
  if (input.deepWorkSeconds > 0)
    parts.push(
      `${fmtDuration(input.deepWorkSeconds)} of deep work (+${r.focusComponent}).`,
    );
  parts.push(
    `Context-switching at ${input.contextSwitch.switchesPerActiveHour}/hr (+${r.switchingComponent}).`,
  );
  if (input.distractingSeconds > 0)
    parts.push(`${fmtDuration(input.distractingSeconds)} on distractions dragged the category score down.`);
  return parts.join(" ");
}
