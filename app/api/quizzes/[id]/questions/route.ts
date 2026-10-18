import { NextResponse } from "next/server";
import { asc, eq, max } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { quizzes, questions } from "@/lib/db/schema";

const questionSchema = z.object({
  type: z.enum([
    "multiple_choice",
    "free_text",
    "slider",
    "pin",
    "ordering",
    "image_guess",
    "closest_wins",
  ]),
  title: z.string().trim().min(1).max(500),
  timeLimit: z.number().int().min(5).max(300).default(20),
  points: z.number().int().min(0).max(10000).default(1000),
  config: z.record(z.string(), z.unknown()).default({}),
});

const multipleChoiceConfigSchema = z.object({
  answers: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().trim().min(1).max(200),
      }),
    )
    .length(4),
  correctAnswerId: z.string().min(1),
});

const freeTextConfigSchema = z.object({
  expectedAnswer: z.string().trim().min(1).max(500),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json(
        { error: "Identifiant de quiz invalide." },
        { status: 400 },
      );
    }

    const body: unknown = await request.json();
    const validation = questionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Les informations de la question sont invalides.",
          details: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const questionData = validation.data;
    let config: Record<string, unknown> = questionData.config;

    if (questionData.type === "multiple_choice") {
      const configValidation = multipleChoiceConfigSchema.safeParse(
        questionData.config,
      );

      if (
        !configValidation.success ||
        !configValidation.data.answers.some(
          (answer) => answer.id === configValidation.data.correctAnswerId,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Les quatre propositions et la bonne réponse sont obligatoires.",
          },
          { status: 400 },
        );
      }

      config = configValidation.data;
    }

    if (questionData.type === "free_text") {
      const configValidation = freeTextConfigSchema.safeParse(
        questionData.config,
      );

      if (!configValidation.success) {
        return NextResponse.json(
          { error: "Renseigne la réponse attendue pour cette question." },
          { status: 400 },
        );
      }

      // La réponse attendue reste dans la configuration privée de la question.
      config = {
        expectedAnswer: configValidation.data.expectedAnswer,
      };
    }

    const [quiz] = await db
      .select({ id: quizzes.id })
      .from(quizzes)
      .where(eq(quizzes.id, id))
      .limit(1);

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz introuvable." },
        { status: 404 },
      );
    }

    const [result] = await db
      .select({ maxPosition: max(questions.position) })
      .from(questions)
      .where(eq(questions.quizId, id));

    const [question] = await db
      .insert(questions)
      .values({
        quizId: id,
        type: questionData.type,
        title: questionData.title,
        position: (result?.maxPosition ?? 0) + 1,
        timeLimit: questionData.timeLimit,
        points: questionData.points,
        config,
      })
      .returning();

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error("Erreur création question :", error);

    return NextResponse.json(
      { error: "Impossible de créer la question." },
      { status: 500 },
    );
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json(
        { error: "Identifiant de quiz invalide." },
        { status: 400 },
      );
    }

    const [quiz] = await db
      .select({ id: quizzes.id })
      .from(quizzes)
      .where(eq(quizzes.id, id))
      .limit(1);

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz introuvable." },
        { status: 404 },
      );
    }

    const result = await db
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
      .where(eq(questions.quizId, id))
      .orderBy(asc(questions.position));

    return NextResponse.json({ questions: result });
  } catch (error) {
    console.error("Erreur récupération des questions :", error);

    return NextResponse.json(
      { error: "Impossible de récupérer les questions." },
      { status: 500 },
    );
  }
}
