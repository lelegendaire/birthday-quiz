import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { gameSessions, questions } from "@/lib/db/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
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
      return NextResponse.json({ error: "Partie introuvable." }, { status: 404 });
    }

    const suppliedHash = createHash("sha256").update(hostToken).digest();
    const storedHash = Buffer.from(game.hostTokenHash, "hex");

    if (
      suppliedHash.length !== storedHash.length ||
      !timingSafeEqual(suppliedHash, storedHash)
    ) {
      return NextResponse.json(
        { error: "Tu n'es pas autorisé à piloter cette partie." },
        { status: 403 },
      );
    }

    if (game.status !== "playing") {
      return NextResponse.json(
        { error: "Cette partie n'est pas en cours." },
        { status: 409 },
      );
    }

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(questions)
      .where(eq(questions.quizId, game.quizId));

    const isLast = game.currentQuestionIndex + 1 >= total;

    // La condition sur l'index évite qu'un double clic saute deux questions.
    const [updated] = await db
      .update(gameSessions)
      .set(
        isLast
          ? { status: "finished" }
          : {
              currentQuestionIndex: game.currentQuestionIndex + 1,
              questionStartedAt: new Date(),
            },
      )
      .where(
        and(
          eq(gameSessions.id, id),
          eq(gameSessions.status, "playing"),
          eq(gameSessions.currentQuestionIndex, game.currentQuestionIndex),
        ),
      )
      .returning({
        status: gameSessions.status,
        currentQuestionIndex: gameSessions.currentQuestionIndex,
      });

    if (!updated) {
      return NextResponse.json(
        { error: "La question a déjà changé." },
        { status: 409 },
      );
    }

    return NextResponse.json({ game: updated, finished: isLast });
  } catch (error) {
    console.error("Erreur passage à la question suivante :", error);

    return NextResponse.json(
      { error: "Impossible de passer à la suite." },
      { status: 500 },
    );
  }
}