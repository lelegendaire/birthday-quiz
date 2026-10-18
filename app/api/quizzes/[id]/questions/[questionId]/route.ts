import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { questions } from "@/lib/db/schema";

const paramsSchema = z.object({ id: z.string().uuid(), questionId: z.string().uuid() });
const updateSchema = z.object({
  title: z.string().trim().min(1).max(500),
  type: z.enum(["multiple_choice","free_text","slider","pin","ordering","image_guess","audio_guess","closest_wins"]),
  timeLimit: z.number().int().min(5).max(300),
  points: z.number().int().min(0).max(10000),
  config: z.record(z.string(), z.unknown()),
});
const configSchemas: Record<string, z.ZodTypeAny> = {
  multiple_choice: z.object({
    answers: z.array(z.object({ id: z.string().min(1), text: z.string().trim().min(1).max(200) })).length(4),
    correctAnswerId: z.string().min(1),
  }).refine(v => v.answers.some(a => a.id === v.correctAnswerId) && new Set(v.answers.map(a => a.id)).size === 4),
  free_text: z.object({ expectedAnswer: z.string().trim().min(1).max(500) }),
  slider: z.object({ min: z.number().finite(), max: z.number().finite(), target: z.number().finite() })
    .refine(v => v.max > v.min && v.target >= v.min && v.target <= v.max),
 pin: z.object({
  targetLat: z.number().min(-90).max(90),
  targetLng: z.number().min(-180).max(180),
}),
  ordering: z.object({
    items: z.array(z.object({ id: z.string().min(1), text: z.string().trim().min(1).max(200) })).min(2).max(10),
    correctOrder: z.array(z.string().min(1)).min(2).max(10),
  }).refine(v => v.items.length === v.correctOrder.length &&
    new Set(v.items.map(i => i.id)).size === v.items.length &&
    new Set(v.correctOrder).size === v.correctOrder.length &&
    v.items.every(i => v.correctOrder.includes(i.id))),
  image_guess: z.object({ imageUrl: z.string().url().max(2000), expectedAnswer: z.string().trim().min(1).max(500) }),
  audio_guess: z.object({ audioUrl: z.string().url().max(2000), expectedAnswer: z.string().trim().min(1).max(500) }),
  closest_wins: z.object({ target: z.number().finite(), min: z.number().finite().optional(), max: z.number().finite().optional() })
    .refine(v => v.min === undefined || v.max === undefined || v.max > v.min),
};
type RouteContext = { params: Promise<{ id: string; questionId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const routeParams = paramsSchema.safeParse(await params);
    if (!routeParams.success) return NextResponse.json({ error: "Identifiants invalides." }, { status: 400 });
    const { id, questionId } = routeParams.data;
    const validation = updateSchema.safeParse(await request.json());
    if (!validation.success) return NextResponse.json({ error: "Les informations de la question sont invalides.", details: validation.error.flatten() }, { status: 400 });
    const data = validation.data;
    const configSchema = configSchemas[data.type];
    const configValidation = configSchema.safeParse(data.config);
    if (!configValidation.success) {
      return NextResponse.json({ error: "La configuration de cette question est incomplète ou invalide." }, { status: 400 });
    }

    const [updatedQuestion] = await db.update(questions).set({
      title: data.title, type: data.type, timeLimit: data.timeLimit,
      points: data.points, config: configValidation.data as Record<string, unknown>,
    }).where(and(eq(questions.id, questionId), eq(questions.quizId, id))).returning();
    if (!updatedQuestion) return NextResponse.json({ error: "Question introuvable dans ce quiz." }, { status: 404 });
    return NextResponse.json({ question: updatedQuestion });
  } catch (error) {
    console.error("Erreur modification question :", error);
    return NextResponse.json({ error: "Impossible de modifier la question." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const routeParams = paramsSchema.safeParse(await params);
    if (!routeParams.success) return NextResponse.json({ error: "Identifiants invalides." }, { status: 400 });
    const { id, questionId } = routeParams.data;
    const [deletedQuestion] = await db.delete(questions)
      .where(and(eq(questions.id, questionId), eq(questions.quizId, id)))
      .returning({ id: questions.id });
    if (!deletedQuestion) return NextResponse.json({ error: "Question introuvable dans ce quiz." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur suppression question :", error);
    return NextResponse.json({ error: "Impossible de supprimer la question." }, { status: 500 });
  }
}
