import { NextResponse } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { gameAnswers, gamePlayers, gameSessions, questions } from "@/lib/db/schema";
import { computeScore, isAnswerTooLate } from "@/lib/scoring";
type RouteContext = { params: Promise<{ id: string }> };
const answerSchema = z.object({
  playerId: z.string().uuid(),
  answerId: z.string().min(1).max(100).optional(),
  answerText: z.string().trim().min(1).max(2000).optional(),
});

const normalize = (s: string) => s.trim().toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const numeric = z.coerce.number().finite();

export async function POST(request: Request, { params }: RouteContext) {
  const requestReceivedAt = Date.now();
  try {
    const { id: gameId } = await params;
    if (!z.string().uuid().safeParse(gameId).success) return NextResponse.json({ error: "Identifiant de partie invalide." }, { status: 400 });
    const validation = answerSchema.safeParse(await request.json());
    if (!validation.success) return NextResponse.json({ error: "Réponse invalide. Vérifie les informations envoyées." }, { status: 400 });
    const { playerId, answerId, answerText } = validation.data;

    const [game] = await db.select({
      id: gameSessions.id, quizId: gameSessions.quizId, status: gameSessions.status,
      currentQuestionIndex: gameSessions.currentQuestionIndex,questionStartedAt: gameSessions.questionStartedAt,
    }).from(gameSessions).where(eq(gameSessions.id, gameId)).limit(1);
    if (!game) return NextResponse.json({ error: "Partie introuvable." }, { status: 404 });
    if (game.status !== "playing") return NextResponse.json({ error: "Cette partie n'accepte pas de réponses pour le moment." }, { status: 409 });

    const [player] = await db.select({ id: gamePlayers.id }).from(gamePlayers)
      .where(and(eq(gamePlayers.id, playerId), eq(gamePlayers.gameId, gameId))).limit(1);
    if (!player) return NextResponse.json({ error: "Ce joueur ne fait pas partie de cette partie." }, { status: 403 });

    const [question] = await db.select({
      id: questions.id, type: questions.type, points: questions.points, config: questions.config,timeLimit: questions.timeLimit,
    }).from(questions).where(eq(questions.quizId, game.quizId))
      .orderBy(asc(questions.position)).limit(1).offset(game.currentQuestionIndex);
    if (!question) return NextResponse.json({ error: "Aucune question active n'a été trouvée." }, { status: 404 });
if (!game.questionStartedAt) {
  return NextResponse.json(
    { error: "Le chronomètre de cette question n'est pas initialisé." },
    { status: 409 }
  );
}

const responseTimeMs = Math.max(
  0,
  requestReceivedAt - game.questionStartedAt.getTime()
);

if (isAnswerTooLate(question.timeLimit, responseTimeMs)) {
  return NextResponse.json(
    { error: "Le temps est écoulé pour cette question." },
    { status: 409 }
  );
}
    const config = (question.config ?? {}) as Record<string, any>;
    let savedAnswerId: string | null = null;
    let savedAnswerText: string | null = null;
    let isCorrect: boolean | null = null;
    let pointsAwarded = 0;
    let pendingReview = false;

    if (question.type === "multiple_choice") {
      if (!answerId) return NextResponse.json({ error: "Sélectionne une réponse avant de valider." }, { status: 400 });
      const exists = Array.isArray(config.answers) && config.answers.some((a: any) => a.id === answerId);
      if (!exists || typeof config.correctAnswerId !== "string") return NextResponse.json({ error: "La configuration de cette question est invalide." }, { status: 400 });
      savedAnswerId = answerId;
      isCorrect = answerId === config.correctAnswerId;
      pointsAwarded = isCorrect ? question.points : 0;
    } else if (question.type === "free_text" || question.type === "image_guess" || question.type === "audio_guess") {
      if (!answerText?.trim()) return NextResponse.json({ error: "Écris une réponse avant de l'envoyer." }, { status: 400 });
      savedAnswerText = answerText.trim();
      // L'organisateur corrige ces réponses pour accepter les variantes de formulation.
      isCorrect = null;
      pendingReview = true;
    } else if (question.type === "slider") {
      const parsed = numeric.safeParse(answerText);
      const min = Number(config.min), max = Number(config.max), target = Number(config.target);
      if (!parsed.success || !Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(target) || max <= min || parsed.data < min || parsed.data > max) {
        return NextResponse.json({ error: "Choisis une valeur valide dans la plage du curseur." }, { status: 400 });
      }
      savedAnswerText = String(parsed.data);
      const ratio = Math.max(0, 1 - Math.abs(parsed.data - target) / (max - min));
      pointsAwarded = Math.round(question.points * ratio);
      isCorrect = parsed.data === target;
    } else if (question.type === "closest_wins") {
      const parsed = numeric.safeParse(answerText);
      const min = config.min === undefined ? -Infinity : Number(config.min);
      const max = config.max === undefined ? Infinity : Number(config.max);
      if (!parsed.success || parsed.data < min || parsed.data > max) return NextResponse.json({ error: "Saisis un nombre valide dans la plage autorisée." }, { status: 400 });
      savedAnswerText = String(parsed.data);
      // Les points sont provisoires : le classement du plus proche est déterminé par l'organisateur à la fin.
      isCorrect = null;
      pendingReview = true;
    } else if (question.type === "pin") {
      if (!answerText) return NextResponse.json({ error: "Clique sur la carte pour placer ton repère." }, { status: 400 });
      let point: { lat: number; lng: number };
      try { point = JSON.parse(answerText); } catch { return NextResponse.json({ error: "Position invalide." }, { status: 400 }); }
      if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng) || point.lat < -90 || point.lat > 90 || point.lng < -180 || point.lng > 180) return NextResponse.json({ error: "Position invalide." }, { status: 400 });
      const targetLat = Number(config.targetLat), targetLng = Number(config.targetLng);
      if (!Number.isFinite(targetLat) || !Number.isFinite(targetLng)) return NextResponse.json({ error: "La cible de la carte est mal configurée." }, { status: 400 });
      savedAnswerText = JSON.stringify(point);
      const rad = (degrees: number) => degrees * Math.PI / 180;
      const dLat = rad(targetLat - point.lat), dLng = rad(targetLng - point.lng);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(point.lat)) * Math.cos(rad(targetLat)) * Math.sin(dLng / 2) ** 2;
      const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      // Full points within 1 km, then decrease progressively until 2,000 km.
      pointsAwarded = Math.round(question.points * Math.max(0, 1 - Math.max(0, distanceKm - 1) / 2000));
      isCorrect = distanceKm <= 1;
    } else if (question.type === "ordering") {
      if (!answerText) return NextResponse.json({ error: "Remets les éléments dans l'ordre avant de valider." }, { status: 400 });
      let order: unknown;
      try { order = JSON.parse(answerText); } catch { order = null; }
      if (!Array.isArray(order) || !order.every((v) => typeof v === "string") || !Array.isArray(config.correctOrder)) return NextResponse.json({ error: "Ordre envoyé invalide." }, { status: 400 });
      const correctOrder = config.correctOrder as string[];
      if (order.length !== correctOrder.length || new Set(order).size !== order.length || order.some(id => !correctOrder.includes(id))) return NextResponse.json({ error: "La liste d'éléments est invalide." }, { status: 400 });
      savedAnswerText = JSON.stringify(order);
      const correctPositions = order.filter((id, index) => id === correctOrder[index]).length;
      pointsAwarded = Math.round(question.points * correctPositions / correctOrder.length);
      isCorrect = correctPositions === correctOrder.length;
    } else {
      return NextResponse.json({ error: "Ce type de question n'est pas pris en charge." }, { status: 400 });
    }
// Les réponses automatiques reçoivent le bonus de rapidité.
// Les réponses en attente de correction seront scorées lors de la validation.
if (!pendingReview && pointsAwarded > 0) {
  pointsAwarded = computeScore(
    pointsAwarded,
    question.timeLimit,
    responseTimeMs
  ).total;
}
   const inserted = await db.insert(gameAnswers).values({
  gameId,
  playerId,
  questionId: question.id,
  answerId: savedAnswerId,
  answerText: savedAnswerText,
  isCorrect,
  pointsAwarded,
  responseTimeMs,
}).onConflictDoNothing().returning({
  id: gameAnswers.id,
});
    if (!inserted.length) return NextResponse.json({ error: "Tu as déjà répondu à cette question." }, { status: 409 });

    if (pointsAwarded > 0) await db.update(gamePlayers)
      .set({ score: sql`${gamePlayers.score} + ${pointsAwarded}` }).where(eq(gamePlayers.id, playerId));

    return NextResponse.json({
      success: true, pendingReview,
      message: pendingReview ? "Réponse envoyée ! En attente de la correction de l'organisateur."
        : pointsAwarded > 0 ? `Réponse enregistrée ! +${pointsAwarded} points.`
        : "Réponse enregistrée.",
      pointsAwarded,
    });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de la réponse :", error);
    return NextResponse.json({ error: "Impossible d'enregistrer ta réponse." }, { status: 500 });
  }
}
