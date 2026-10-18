
import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { gameSessions, questions } from "@/lib/db/schema";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.headers.get("x-host-token");

    if (!token) {
      return NextResponse.json(
        { error: "Jeton organisateur manquant." },
        { status: 401 }
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
        { status: 404 }
      );
    }

    const suppliedHash = createHash("sha256").update(token).digest();
    const storedHash = Buffer.from(game.hostTokenHash, "hex");

    if (
      storedHash.length !== suppliedHash.length ||
      !timingSafeEqual(storedHash, suppliedHash)
    ) {
      return NextResponse.json(
        { error: "Jeton organisateur invalide." },
        { status: 403 }
      );
    }

    if (game.status !== "playing") {
      return NextResponse.json(
        { error: "La partie n'est pas en cours." },
        { status: 409 }
      );
    }

    const allQuestions = await db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.quizId, game.quizId))
      .orderBy(asc(questions.position));

    const nextIndex = game.currentQuestionIndex + 1;

    if (nextIndex >= allQuestions.length) {
      await db
        .update(gameSessions)
        .set({ status: "finished" })
        .where(eq(gameSessions.id, id));

      return NextResponse.json({ success: true, finished: true });
    }

    await db
      .update(gameSessions)
      .set({ currentQuestionIndex: nextIndex })
      .where(eq(gameSessions.id, id));

    return NextResponse.json({
      success: true,
      finished: false,
      currentQuestionIndex: nextIndex,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Impossible de passer à la question suivante." },
      { status: 500 }
    );
  }
}
