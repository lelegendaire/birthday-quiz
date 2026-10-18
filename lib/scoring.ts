/**
 * Calcul des points avec bonus de rapidité.
 *
 * - Une bonne réponse rapporte au minimum 50 % des points de la question.
 * - Les 50 % restants sont un bonus qui décroît linéairement avec le temps.
 * - Répondre dans la première seconde donne le maximum.
 * - Le serveur est la seule source de vérité : le client n'envoie jamais de temps.
 */

// Marge de latence réseau tolérée après la fin du chrono (en ms).
export const ANSWER_GRACE_MS = 1500;

// Part des points toujours acquise pour une bonne réponse.
const BASE_RATIO = 0.5;

// Pendant ce délai, le bonus est maximal (temps de lecture + latence).
const FULL_BONUS_WINDOW_MS = 1000;

export type ScoreBreakdown = {
  base: number;
  bonus: number;
  total: number;
};

export function computeScore(
  points: number,
  timeLimitSeconds: number,
  responseTimeMs: number,
): ScoreBreakdown {
  const limitMs = Math.max(1, timeLimitSeconds) * 1000;
  const base = Math.round(points * BASE_RATIO);
  const maxBonus = points - base;

  const usable = Math.max(1, limitMs - FULL_BONUS_WINDOW_MS);
  const elapsed = Math.max(0, responseTimeMs - FULL_BONUS_WINDOW_MS);
  const speedRatio = 1 - Math.min(1, elapsed / usable);

  const bonus = Math.round(maxBonus * speedRatio);

  return { base, bonus, total: base + bonus };
}

export function isAnswerTooLate(
  timeLimitSeconds: number,
  responseTimeMs: number,
): boolean {
  return responseTimeMs > timeLimitSeconds * 1000 + ANSWER_GRACE_MS;
}
