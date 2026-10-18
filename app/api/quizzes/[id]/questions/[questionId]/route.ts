
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { questions } from "@/lib/db/schema";

const paramsSchema = z.object({
  id: z.string().uuid(),
  questionId: z.string().uuid(),
});

const updateSchema = z.object({
  title: z.string().trim().min(1).max(500),
  type: z.enum([
  "multiple_choice",
  "free_text",
  "slider",
  "pin",
  "ordering",
  "image_guess",
  "audio_guess",
  "closest_wins",
]),
  timeLimit: z.number().int().min(5).max(300),
  points: z.number().int().min(0).max(10000),
  config: z.record(z.string(), z.unknown()),
});

const multipleChoiceSchema = z.object({
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

type RouteContext = {
  params: Promise<{ id: string; questionId: string }>;
};

export async function PATCH(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const routeParams = paramsSchema.safeParse(await params);

    if (!routeParams.success) {
      return NextResponse.json(
        { error: "Identifiants invalides." },
        { status: 400 },
      );
    }

    const { id, questionId } = routeParams.data;

    const body: unknown = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Les informations de la question sont invalides." },
        { status: 400 },
      );
    }

    const data = validation.data;

    if (data.type === "multiple_choice") {
      const config = multipleChoiceSchema.safeParse(data.config);

      if (
        !config.success ||
        !config.data.answers.some(
          (answer) => answer.id === config.data.correctAnswerId,
        ) ||
        new Set(config.data.answers.map((answer) => answer.id)).size !== 4
      ) {
        return NextResponse.json(
          { error: "Vérifie les quatre réponses et la bonne réponse." },
          { status: 400 },
        );
      }
    }

    const [updatedQuestion] = await db
      .update(questions)
      .set({
        title: data.title,
        type: data.type,
        timeLimit: data.timeLimit,
        points: data.points,
        config: data.config,
      })
      .where(
        and(
          eq(questions.id, questionId),
          eq(questions.quizId, id),
        ),
      )
      .returning();

    if (!updatedQuestion) {
      return NextResponse.json(
        { error: "Question introuvable dans ce quiz." },
        { status: 404 },
      );
    }

    return NextResponse.json({ question: updatedQuestion });
  } catch (error) {
    console.error("Erreur modification question :", error);

    return NextResponse.json(
      { error: "Impossible de modifier la question." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const routeParams = paramsSchema.safeParse(await params);

    if (!routeParams.success) {
      return NextResponse.json(
        { error: "Identifiants invalides." },
        { status: 400 },
      );
    }

    const { id, questionId } = routeParams.data;

    const [deletedQuestion] = await db
      .delete(questions)
      .where(
        and(
          eq(questions.id, questionId),
          eq(questions.quizId, id),
        ),
      )
      .returning({ id: questions.id });

    if (!deletedQuestion) {
      return NextResponse.json(
        { error: "Question introuvable dans ce quiz." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur suppression question :", error);

    return NextResponse.json(
      { error: "Impossible de supprimer la question." },
      { status: 500 },
    );
  }
}