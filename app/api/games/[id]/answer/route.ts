import { NextResponse } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  gameAnswers,
  gamePlayers,
  gameSessions,
  questions,
} from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const answerSchema = z.object({
  playerId: z.string().uuid(),
  answerId: z.string().min(1).max(100).optional(),
  answerText: z.string().trim().min(1).max(2000).optional(),
});

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: gameId } = await params;
    const body: unknown = await request.json();
    const validation = answerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Réponse invalide. Vérifie les informations envoyées." },
        { status: 400 },
      );
    }

    const { playerId, answerId, answerText } = validation.data;

    const [game] = await db
      .select({
        id: gameSessions.id,
        quizId: gameSessions.quizId,
        status: gameSessions.status,
        currentQuestionIndex: gameSessions.currentQuestionIndex,
      })
      .from(gameSessions)
      .where(eq(gameSessions.id, gameId))
      .limit(1);

    if (!game) {
      return NextResponse.json({ error: "Partie introuvable." }, { status: 404 });
    }

    if (game.status !== "playing") {
      return NextResponse.json(
        { error: "Cette partie n'accepte pas de réponses pour le moment." },
        { status: 409 },
      );
    }

    const [player] = await db
      .select({ id: gamePlayers.id })
      .from(gamePlayers)
      .where(and(eq(gamePlayers.id, playerId), eq(gamePlayers.gameId, gameId)))
      .limit(1);

    if (!player) {
      return NextResponse.json(
        { error: "Ce joueur ne fait pas partie de cette partie." },
        { status: 403 },
      );
    }

    const [question] = await db
      .select({
        id: questions.id,
        type: questions.type,
        points: questions.points,
        config: questions.config,
      })
      .from(questions)
      .where(eq(questions.quizId, game.quizId))
      .orderBy(asc(questions.position))
      .limit(1)
      .offset(game.currentQuestionIndex);

    if (!question) {
      return NextResponse.json(
        { error: "Aucune question active n'a été trouvée." },
        { status: 404 },
      );
    }

    let savedAnswerId: string | null = null;
    let savedAnswerText: string | null = null;
    let isCorrect: boolean | null = null;
    let pointsAwarded = 0;

    if (question.type === "multiple_choice") {
      if (!answerId) {
        return NextResponse.json(
          { error: "Sélectionne une réponse avant de valider." },
          { status: 400 },
        );
      }

      const config = (question.config ?? {}) as {
        answers?: { id: string; text: string }[];
        correctAnswerId?: string;
      };

      const answerExists = Array.isArray(config.answers)
        && config.answers.some((answer) => answer.id === answerId);

      if (!answerExists || !config.correctAnswerId) {
        return NextResponse.json(
          { error: "La configuration de cette question est invalide." },
          { status: 400 },
        );
      }

      savedAnswerId = answerId;
      isCorrect = answerId === config.correctAnswerId;
      pointsAwarded = isCorrect ? question.points : 0;
    } else if (question.type === "free_text") {
      if (!answerText?.trim()) {
        return NextResponse.json(
          { error: "Écris une réponse avant de l'envoyer." },
          { status: 400 },
        );
      }

      savedAnswerText = answerText.trim();
      // null signifie que l'organisateur doit encore corriger la réponse.
      isCorrect = null;
      pointsAwarded = 0;
    } else {
      return NextResponse.json(
        { error: "Ce type de question n'est pas encore pris en charge." },
        { status: 400 },
      );
    }

    const inserted = await db
      .insert(gameAnswers)
      .values({
        gameId,
        playerId,
        questionId: question.id,
        answerId: savedAnswerId,
        answerText: savedAnswerText,
        isCorrect,
        pointsAwarded,
      })
      .onConflictDoNothing()
      .returning({ id: gameAnswers.id });

    if (inserted.length === 0) {
      return NextResponse.json(
        { error: "Tu as déjà répondu à cette question." },
        { status: 409 },
      );
    }

    if (pointsAwarded > 0) {
      await db
        .update(gamePlayers)
        .set({ score: sql`${gamePlayers.score} + ${pointsAwarded}` })
        .where(eq(gamePlayers.id, playerId));
    }

    return NextResponse.json({
      success: true,
      pendingReview: question.type === "free_text",
      message:
        question.type === "free_text"
          ? "Réponse envoyée ! En attente de la correction de l'organisateur."
          : isCorrect
            ? `Bonne réponse ! +${pointsAwarded} points.`
            : "Réponse enregistrée. Ce sera pour la prochaine fois !",
      pointsAwarded,
    });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de la réponse :", error);
    return NextResponse.json(
      { error: "Impossible d'enregistrer ta réponse." },
      { status: 500 },
    );
  }
}
