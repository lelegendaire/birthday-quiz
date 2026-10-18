
import { NextResponse } from "next/server";
import { and,eq, asc } from "drizzle-orm";

import { db } from "@/lib/db";
import { gameAnswers,gamePlayers, gameSessions,questions  } from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext,
  
) {
  try {
    const { id } = await params;

    const [game] = await db
      .select({
        id: gameSessions.id,
        pin: gameSessions.pin,
        status: gameSessions.status,
        quizId: gameSessions.quizId,
        currentQuestionIndex: gameSessions.currentQuestionIndex,
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

    const players = await db
      .select({
        id: gamePlayers.id,
        nickname: gamePlayers.nickname,
        score: gamePlayers.score,
      })
      .from(gamePlayers)
      .where(eq(gamePlayers.gameId, game.id))
      .orderBy(asc(gamePlayers.joinedAt));

let currentQuestion = null;

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
    const config = question.config ?? {};

    currentQuestion = {
      id: question.id,
      title: question.title,
      type: question.type,
      timeLimit: question.timeLimit,
      points: question.points,
      position: question.position,
      config:
        question.type === "multiple_choice" &&
        Array.isArray(config.answers)
          ? {
              answers: config.answers.map((answer) => ({
                id: answer.id,
                text: answer.text,
              })),
            }
          : {},
    };
    const playerId = new URL(_request.url).searchParams.get("player");

let hasAnswered = false;

if (playerId) {
  const [previousAnswer] = await db
    .select({ id: gameAnswers.id })
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
}

currentQuestion = {
  ...currentQuestion,
  hasAnswered,
};
  }
}
    return NextResponse.json({ game, players,currentQuestion });
  } catch (error) {
    console.error("Erreur récupération partie :", error);

    return NextResponse.json(
      { error: "Impossible de récupérer cette partie." },
      { status: 500 },
    );
  }
}