import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { gameAnswers, gamePlayers, gameSessions, questions } from "@/lib/db/schema";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const [game] = await db.select({
      id: gameSessions.id, pin: gameSessions.pin, status: gameSessions.status,
      quizId: gameSessions.quizId, currentQuestionIndex: gameSessions.currentQuestionIndex,
    }).from(gameSessions).where(eq(gameSessions.id, id)).limit(1);
    if (!game) return NextResponse.json({ error: "Partie introuvable." }, { status: 404 });

    const players = await db.select({
      id: gamePlayers.id, nickname: gamePlayers.nickname, score: gamePlayers.score,
    }).from(gamePlayers).where(eq(gamePlayers.gameId, game.id)).orderBy(asc(gamePlayers.joinedAt));

    let currentQuestion: Record<string, unknown> | null = null;
    if (game.status === "playing") {
      const [question] = await db.select({
        id: questions.id, title: questions.title, type: questions.type,
        timeLimit: questions.timeLimit, points: questions.points,
        position: questions.position, config: questions.config,
      }).from(questions).where(eq(questions.quizId, game.quizId))
        .orderBy(asc(questions.position)).limit(1).offset(game.currentQuestionIndex);

      if (question) {
        const c = (question.config ?? {}) as Record<string, any>;
        let safeConfig: Record<string, unknown> = {};
        switch (question.type) {
          case "multiple_choice":
            safeConfig = { answers: Array.isArray(c.answers) ? c.answers.map((a: any) => ({ id: a.id, text: a.text })) : [] };
            break;
          case "slider":
            safeConfig = { min: c.min, max: c.max };
            break;
          case "pin":
            safeConfig = {};
            break;
          case "ordering":
            safeConfig = { items: Array.isArray(c.items) ? c.items.map((item: any) => ({ id: item.id, text: item.text })) : [] };
            break;
          case "image_guess":
            safeConfig = { imageUrl: c.imageUrl };
            break;
          case "audio_guess":
            safeConfig = { audioUrl: c.audioUrl };
            break;
          case "closest_wins":
            safeConfig = { min: c.min, max: c.max };
            break;
          default:
            safeConfig = {};
        }

        const playerId = new URL(request.url).searchParams.get("player");
        
        let hasAnswered = false;
        let myAnswer: {
          pointsAwarded: number;
          isCorrect: boolean | null;
        } | null = null;

        if (playerId) {
          const [previousAnswer] = await db
            .select({
              id: gameAnswers.id,
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
          title: question.title,
          type: question.type,
          timeLimit: question.timeLimit,
          points: question.points,
          position: question.position,
          config: safeConfig,
          hasAnswered,
          myAnswer,
        };


        
      }
    }
    return NextResponse.json({ game, players, currentQuestion });
  } catch (error) {
    console.error("Erreur récupération partie :", error);
    return NextResponse.json({ error: "Impossible de récupérer cette partie." }, { status: 500 });
  }
}
