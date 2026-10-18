
import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { gameSessions, questions } from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;
    const hostToken = request.headers.get("x-host-token");

    if (!hostToken || hostToken.length > 200) {
      return NextResponse.json(
        { error: "Autorisation organisateur manquante." },
        { status: 401 },
      );
    }

    const [game] = await db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.id, id))
      .limit(1);

    if (!game) {
      return NextResponse.json(
        { error: "Partie introuvable." },
        { status: 404 },
      );
    }

    const suppliedHash = createHash("sha256")
      .update(hostToken)
      .digest();

    const storedHash = Buffer.from(game.hostTokenHash, "hex");

    if (
      suppliedHash.length !== storedHash.length ||
      !timingSafeEqual(suppliedHash, storedHash)
    ) {
      return NextResponse.json(
        { error: "Tu n'es pas autorisé à lancer cette partie." },
        { status: 403 },
      );
    }

    if (game.status !== "waiting") {
      return NextResponse.json(
        { error: "Cette partie a déjà été lancée ou terminée." },
        { status: 409 },
      );
    }

    const quizQuestions = await db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.quizId, game.quizId))
      .limit(1);

    if (quizQuestions.length === 0) {
      return NextResponse.json(
        { error: "Ajoute au moins une question avant de lancer le quiz." },
        { status: 400 },
      );
    }

    const [updatedGame] = await db
      .update(gameSessions)
      .set({
        status: "playing",
        currentQuestionIndex: 0,
        questionStartedAt: new Date(),
      })
      .where(eq(gameSessions.id, id))
      .returning({
        id: gameSessions.id,
        status: gameSessions.status,
      });

    return NextResponse.json({ game: updatedGame });
  } catch (error) {
    console.error("Erreur lancement partie :", error);

    return NextResponse.json(
      { error: "Impossible de lancer la partie." },
      { status: 500 },
    );
  }
}