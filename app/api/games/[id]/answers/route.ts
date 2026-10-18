
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
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

function validHostToken(token: string, hash: string) {
  const suppliedHash = createHash("sha256").update(token).digest();
  const expectedHash = Buffer.from(hash, "hex");

  return (
    suppliedHash.length === expectedHash.length &&
    timingSafeEqual(suppliedHash, expectedHash)
  );
}

async function authorizeHost(request: Request, gameId: string) {
  const token = request.headers.get("x-host-token");

  if (!token) return false;

  const [game] = await db
    .select({ hostTokenHash: gameSessions.hostTokenHash })
    .from(gameSessions)
    .where(eq(gameSessions.id, gameId))
    .limit(1);

  return Boolean(
    game && validHostToken(token, game.hostTokenHash),
  );
}

export async function GET(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const { id: gameId } = await params;

    if (!(await authorizeHost(request, gameId))) {
      return NextResponse.json(
        { error: "Accès réservé à l'organisateur." },
        { status: 403 },
      );
    }

    const pending = await db
      .select({
        id: gameAnswers.id,
        playerId: gameAnswers.playerId,
        nickname: gamePlayers.nickname,
        questionId: gameAnswers.questionId,
        questionTitle: questions.title,
        answerText: gameAnswers.answerText,
        points: questions.points,
        answeredAt: gameAnswers.answeredAt,
      })
      .from(gameAnswers)
      .innerJoin(
        gamePlayers,
        eq(gameAnswers.playerId, gamePlayers.id),
      )
      .innerJoin(
        questions,
        eq(gameAnswers.questionId, questions.id),
      )
      .where(
        and(
          eq(gameAnswers.gameId, gameId),
          isNull(gameAnswers.isCorrect),
        ),
      )
      .orderBy(asc(gameAnswers.answeredAt));

    return NextResponse.json({ answers: pending });
  } catch (error) {
    console.error("Erreur de récupération des réponses :", error);

    return NextResponse.json(
      { error: "Impossible de récupérer les réponses." },
      { status: 500 },
    );
  }
}

const reviewSchema = z.object({
  answerId: z.string().uuid(),
  correct: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const { id: gameId } = await params;

    if (!(await authorizeHost(request, gameId))) {
      return NextResponse.json(
        { error: "Accès réservé à l'organisateur." },
        { status: 403 },
      );
    }

    const body: unknown = await request.json();
    const validation = reviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Informations de correction invalides." },
        { status: 400 },
      );
    }

    const { answerId, correct } = validation.data;

    const [pending] = await db
      .select({
        id: gameAnswers.id,
        playerId: gameAnswers.playerId,
        questionId: gameAnswers.questionId,
        points: questions.points,
      })
      .from(gameAnswers)
      .innerJoin(
        questions,
        eq(gameAnswers.questionId, questions.id),
      )
      .where(
        and(
          eq(gameAnswers.id, answerId),
          eq(gameAnswers.gameId, gameId),
          isNull(gameAnswers.isCorrect),
        ),
      )
      .limit(1);

    if (!pending) {
      return NextResponse.json(
        { error: "Réponse introuvable ou déjà corrigée." },
        { status: 404 },
      );
    }

    const pointsAwarded = correct ? pending.points : 0;

    // Une seule correction peut gagner cette mise à jour.
    const [reviewed] = await db
      .update(gameAnswers)
      .set({
        isCorrect: correct,
        pointsAwarded,
      })
      .where(
        and(
          eq(gameAnswers.id, answerId),
          eq(gameAnswers.gameId, gameId),
          isNull(gameAnswers.isCorrect),
        ),
      )
      .returning({ id: gameAnswers.id });

    if (!reviewed) {
      return NextResponse.json(
        { error: "Cette réponse vient d'être corrigée." },
        { status: 409 },
      );
    }

    if (pointsAwarded > 0) {
      await db
        .update(gamePlayers)
        .set({
          score: sql`${gamePlayers.score} + ${pointsAwarded}`,
        })
        .where(eq(gamePlayers.id, pending.playerId));
    }

    return NextResponse.json({
      success: true,
      pointsAwarded,
    });
  } catch (error) {
    console.error("Erreur lors de la correction :", error);

    return NextResponse.json(
      { error: "Impossible de corriger cette réponse." },
      { status: 500 },
    );
  }
}
