
import { NextResponse } from "next/server";
import { and, eq, ilike } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { gamePlayers, gameSessions } from "@/lib/db/schema";

const joinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, "Le PIN doit contenir 6 chiffres."),
  nickname: z.string().trim().min(2).max(20),
});

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const validation = joinSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Entre un PIN valide et un pseudo de 2 à 20 caractères." },
        { status: 400 },
      );
    }

    const pin = validation.data.pin;
    const nickname = validation.data.nickname.trim();

    const [game] = await db
      .select({
        id: gameSessions.id,
        pin: gameSessions.pin,
        status: gameSessions.status,
      })
      .from(gameSessions)
      .where(eq(gameSessions.pin, pin))
      .limit(1);

    if (!game) {
      return NextResponse.json(
        { error: "Aucune partie ne correspond à ce PIN." },
        { status: 404 },
      );
    }

    if (game.status !== "waiting") {
      return NextResponse.json(
        { error: "Cette partie n'accepte plus de joueurs." },
        { status: 409 },
      );
    }

    const [existingPlayer] = await db
      .select({ id: gamePlayers.id })
      .from(gamePlayers)
      .where(
        and(
          eq(gamePlayers.gameId, game.id),
          ilike(gamePlayers.nickname, nickname),
        ),
      )
      .limit(1);

    if (existingPlayer) {
      return NextResponse.json(
        { error: "Ce pseudo est déjà utilisé dans cette partie." },
        { status: 409 },
      );
    }

    const [player] = await db
      .insert(gamePlayers)
      .values({
        gameId: game.id,
        nickname,
      })
      .returning({
        id: gamePlayers.id,
        nickname: gamePlayers.nickname,
        score: gamePlayers.score,
      });

    return NextResponse.json(
      {
        player,
        game: {
          id: game.id,
          pin: game.pin,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erreur lors de la connexion à la partie :", error);

    return NextResponse.json(
      { error: "Impossible de rejoindre la partie. Réessaie." },
      { status: 500 },
    );
  }
}