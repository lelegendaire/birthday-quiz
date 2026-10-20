
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  gameAnswers,
  gamePlayers,
  gameSessions,
  questions,
} from "@/lib/db/schema";

type RouteContext = { params: Promise<{ id: string }> };

function isValidHostToken(supplied: string | null, storedHash: string) {
  if (!supplied || supplied.length > 200) return false;

  const suppliedHash = createHash("sha256").update(supplied).digest();
  const expectedHash = Buffer.from(storedHash, "hex");

  return (
    suppliedHash.length === expectedHash.length &&
    timingSafeEqual(suppliedHash, expectedHash)
  );
}

function getCorrectAnswer(type: string, config: Record<string, any>) {
  switch (type) {
    case "multiple_choice":
      return (
        config.answers?.find(
          (answer: any) => answer.id === config.correctAnswerId,
        )?.text ?? null
      );

    case "free_text":
    case "image_guess":
    case "audio_guess":
      return config.expectedAnswer ?? null;

    case "slider":
    case "closest_wins":
      return config.target !== undefined ? String(config.target) : null;

    case "pin":
      return Number.isFinite(Number(config.targetLat)) &&
        Number.isFinite(Number(config.targetLng))
        ? `Latitude ${Number(config.targetLat).toFixed(4)}, longitude ${Number(config.targetLng).toFixed(4)}`
        : null;

    case "ordering": {
      const items = Array.isArray(config.items) ? config.items : [];
      const order = Array.isArray(config.correctOrder)
        ? config.correctOrder
        : [];

      return (
        order
          .map((id: string) => items.find((item: any) => item.id === id)?.text)
          .filter(Boolean)
          .join(" → ") || null
      );
    }

    default:
      return null;
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    const [game] = await db
      .select({
        id: gameSessions.id,
        pin: gameSessions.pin,
        status: gameSessions.status,
        quizId: gameSessions.quizId,
        currentQuestionIndex: gameSessions.currentQuestionIndex,
        questionStartedAt: gameSessions.questionStartedAt,
        hostTokenHash: gameSessions.hostTokenHash,
      })
      .from(gameSessions)
      .where(eq(gameSessions.id, id))
      .limit(1);

    if (!game) {
      return NextResponse.json(
        { error: "Partie introuvable." },
        { status: 404 },
      );
    }

    const isHost = isValidHostToken(
      request.headers.get("x-host-token"),
      game.hostTokenHash,
    );

    const players = await db
      .select({
        id: gamePlayers.id,
        nickname: gamePlayers.nickname,
        score: gamePlayers.score,
      })
      .from(gamePlayers)
      .where(eq(gamePlayers.gameId, game.id))
      .orderBy(asc(gamePlayers.joinedAt));

    let currentQuestion: Record<string, unknown> | null = null;

    if (game.status === "playing") {
      const [question] = await db
        .select({
          id: questions.id,
          title: questions.title,
          type: questions.type,
          timeLimit: questions.timeLimit,
          points: questions.points,
          position: questions.position,
          config: questions.config,
        })
        .from(questions)
        .where(eq(questions.quizId, game.quizId))
        .orderBy(asc(questions.position))
        .limit(1)
        .offset(game.currentQuestionIndex);

      if (question) {
        const config = (question.config ?? {}) as Record<string, any>;
        const playerId = new URL(request.url).searchParams.get("player");

        const elapsed =
          game.questionStartedAt &&
          Date.now() >=
            new Date(game.questionStartedAt).getTime() +
              question.timeLimit * 1000;

        // L'écran organisateur reçoit la configuration complète.
        // Les téléphones ne reçoivent que les données utiles aux contrôles.
        let safeConfig: Record<string, unknown>;

        if (isHost) {
          safeConfig = config;
        } else {
          switch (question.type) {
            case "multiple_choice":
              safeConfig = {
                answers: Array.isArray(config.answers)
                  ? config.answers.map((answer: any) => ({
                      id: answer.id,
                      text: answer.text,
                    }))
                  : [],
              };
              break;

            case "slider":
            case "closest_wins":
              safeConfig = { min: config.min, max: config.max };
              break;

            case "ordering":
              safeConfig = {
                items: Array.isArray(config.items)
                  ? config.items.map((item: any) => ({
                      id: item.id,
                      text: item.text,
                    }))
                  : [],
              };
              break;

            case "pin":
            case "free_text":
            case "image_guess":
            case "audio_guess":
            default:
              safeConfig = {};
              break;
          }
        }

        let hasAnswered = false;
        let myAnswer: {
          pointsAwarded: number;
          isCorrect: boolean | null;
        } | null = null;

        if (playerId && !isHost) {
          const [previousAnswer] = await db
            .select({
              pointsAwarded: gameAnswers.pointsAwarded,
              isCorrect: gameAnswers.isCorrect,
            })
            .from(gameAnswers)
            .where(
              and(
                eq(gameAnswers.gameId, game.id),
                eq(gameAnswers.playerId, playerId),
                eq(gameAnswers.questionId, question.id),
              ),
            )
            .limit(1);

          hasAnswered = Boolean(previousAnswer);

          if (previousAnswer) {
            myAnswer = {
              pointsAwarded: previousAnswer.pointsAwarded,
              isCorrect: previousAnswer.isCorrect,
            };
          }
        }

        currentQuestion = {
          id: question.id,
          // L'intitulé complet n'est envoyé qu'à l'organisateur.
          ...(isHost ? { title: question.title } : {}),
          type: question.type,
          timeLimit: question.timeLimit,
          points: question.points,
          position: question.position,
          config: safeConfig,
          hasAnswered,
          myAnswer,
          // Révélation seulement après la fin du chrono.
          correctAnswer: elapsed
            ? getCorrectAnswer(question.type, config)
            : null,
        };
      }
    }

    return NextResponse.json({
      game: {
        id: game.id,
        pin: game.pin,
        status: game.status,
        quizId: game.quizId,
        questionStartedAt: game.questionStartedAt,
      },
      players,
      currentQuestion,
      isHost,
    });
  } catch (error) {
    console.error("Erreur récupération partie :", error);

    return NextResponse.json(
      { error: "Impossible de récupérer cette partie." },
      { status: 500 },
    );
  }
}
