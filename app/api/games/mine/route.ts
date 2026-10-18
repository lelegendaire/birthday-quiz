
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { gameSessions, quizzes } from "@/lib/db/schema";

export async function GET() {
  try {
    const games = await db
      .select({
        id: gameSessions.id,
        quizId: gameSessions.quizId,
        quizTitle: quizzes.title,
        pin: gameSessions.pin,
        status: gameSessions.status,
        createdAt: gameSessions.createdAt,
      })
      .from(gameSessions)
      .innerJoin(quizzes, eq(gameSessions.quizId, quizzes.id))
      .orderBy(desc(gameSessions.createdAt))
      .limit(50);

    return NextResponse.json({ games });
  } catch (error) {
    console.error("Erreur lors de la récupération des parties :", error);

    return NextResponse.json(
      { error: "Impossible de récupérer les parties." },
      { status: 500 },
    );
  }
}