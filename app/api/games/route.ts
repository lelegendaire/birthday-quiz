
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { gameSessions, quizzes } from "@/lib/db/schema";

const createGameSchema = z.object({
  quizId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const validation = createGameSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Identifiant du quiz invalide." },
        { status: 400 },
      );
    }

    const { quizId } = validation.data;

    const [quiz] = await db
      .select({ id: quizzes.id })
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .limit(1);

    if (!quiz) {
      return NextResponse.json(
        { error: "Ce quiz n'existe pas." },
        { status: 404 },
      );
    }
const hostToken = randomBytes(32).toString("hex");

const hostTokenHash = createHash("sha256")
  .update(hostToken)
  .digest("hex");
    // Génère un PIN à 6 chiffres et vérifie qu'il est disponible.
    for (let attempt = 0; attempt < 10; attempt++) {
      const pin = String(
        Math.floor(100000 + Math.random() * 900000),
      );

      const [existingGame] = await db
        .select({ id: gameSessions.id })
        .from(gameSessions)
        .where(eq(gameSessions.pin, pin))
        .limit(1);

      if (existingGame) continue;

      const [game] = await db
        .insert(gameSessions)
        .values({
  quizId,
  pin,
  status: "waiting",
  hostTokenHash,
})
        .returning({
          id: gameSessions.id,
          pin: gameSessions.pin,
          status: gameSessions.status,
        });

      return NextResponse.json({ game,hostToken }, { status: 201 });
    }

    return NextResponse.json(
      { error: "Impossible de générer un PIN. Réessaie." },
      { status: 503 },
    );
  } catch (error) {
    console.error("Erreur création partie :", error);

    return NextResponse.json(
      { error: "Impossible de créer la partie." },
      { status: 500 },
    );
  }
}