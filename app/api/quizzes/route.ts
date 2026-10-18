
import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { quizzes } from "@/lib/db/schema";

const createQuizSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
});

// Récupérer tous les quiz
export async function GET() {
  try {
    const allQuizzes = await db
      .select({
        id: quizzes.id,
        title: quizzes.title,
        description: quizzes.description,
        createdAt: quizzes.createdAt,
      })
      .from(quizzes)
      .orderBy(desc(quizzes.createdAt));

    return NextResponse.json({ quizzes: allQuizzes });
  } catch (error) {
    console.error("Erreur lors de la récupération des quiz :", error);

    return NextResponse.json(
      { error: "Impossible de récupérer les quiz." },
      { status: 500 },
    );
  }
}

// Créer un quiz
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const validation = createQuizSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Les informations du quiz sont invalides.",
          details: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const [quiz] = await db
      .insert(quizzes)
      .values({
        title: validation.data.title,
        description: validation.data.description || null,
      })
      .returning({
        id: quizzes.id,
        title: quizzes.title,
        description: quizzes.description,
        createdAt: quizzes.createdAt,
      });

    return NextResponse.json({ quiz }, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création du quiz :", error);

    return NextResponse.json(
      { error: "Impossible de créer le quiz pour le moment." },
      { status: 500 },
    );
  }
}