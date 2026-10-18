import { NextResponse } from "next/server";
import { asc, eq, max } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { quizzes, questions } from "@/lib/db/schema";

const questionSchema = z.object({
  type: z.enum([
    "multiple_choice", "free_text", "slider", "pin",
    "ordering", "image_guess", "audio_guess", "closest_wins",
  ]),
  title: z.string().trim().min(1).max(500),
  timeLimit: z.number().int().min(5).max(300).default(20),
  points: z.number().int().min(0).max(10000).default(1000),
  config: z.record(z.string(), z.unknown()).default({}),
});

const multipleChoiceConfigSchema = z.object({
  answers: z.array(z.object({
    id: z.string().min(1),
    text: z.string().trim().min(1).max(200),
  })).length(4),
  correctAnswerId: z.string().min(1),
});

const configSchemas = {
  free_text: z.object({ expectedAnswer: z.string().trim().min(1).max(500) }),
  slider: z.object({
    min: z.number().finite(), max: z.number().finite(), target: z.number().finite(),
  }).refine(v => v.max > v.min && v.target >= v.min && v.target <= v.max),
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
  image_guess: z.object({
    imageUrl: z.string().url().max(2000),
    expectedAnswer: z.string().trim().min(1).max(500),
  }),
  audio_guess: z.object({
    audioUrl: z.string().url().max(2000),
    expectedAnswer: z.string().trim().min(1).max(500),
  }),
  closest_wins: z.object({
    target: z.number().finite(),
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
  }).refine(v => v.min === undefined || v.max === undefined || v.max > v.min),
};

function validateConfig(type: string, raw: Record<string, unknown>) {
  if (type === "multiple_choice") {
    const parsed = multipleChoiceConfigSchema.safeParse(raw);
    if (!parsed.success ||
      !parsed.data.answers.some(a => a.id === parsed.data.correctAnswerId) ||
      new Set(parsed.data.answers.map(a => a.id)).size !== 4) return null;
    return parsed.data;
  }
  if (type in configSchemas) {
    const schema = configSchemas[type as keyof typeof configSchemas];
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return null;
    return parsed.data as Record<string, unknown>;
  }
  return null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Identifiant de quiz invalide." }, { status: 400 });
    }
    const validation = questionSchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: "Les informations de la question sont invalides.", details: validation.error.flatten() }, { status: 400 });
    }
    const data = validation.data;
    const config = validateConfig(data.type, data.config);
    if (!config) {
      return NextResponse.json({ error: "La configuration de cette question est incomplète ou invalide." }, { status: 400 });
    }

    const [quiz] = await db.select({ id: quizzes.id }).from(quizzes).where(eq(quizzes.id, id)).limit(1);
    if (!quiz) return NextResponse.json({ error: "Quiz introuvable." }, { status: 404 });

    const [result] = await db.select({ maxPosition: max(questions.position) }).from(questions).where(eq(questions.quizId, id));
    const [question] = await db.insert(questions).values({
      quizId: id, type: data.type, title: data.title,
      position: (result?.maxPosition ?? 0) + 1,
      timeLimit: data.timeLimit, points: data.points, config,
    }).returning();
    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error("Erreur création question :", error);
    return NextResponse.json({ error: "Impossible de créer la question." }, { status: 500 });
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Identifiant de quiz invalide." }, { status: 400 });
    }
    const [quiz] = await db.select({ id: quizzes.id }).from(quizzes).where(eq(quizzes.id, id)).limit(1);
    if (!quiz) return NextResponse.json({ error: "Quiz introuvable." }, { status: 404 });

    const result = await db.select({
      id: questions.id, title: questions.title, type: questions.type,
      timeLimit: questions.timeLimit, points: questions.points,
      position: questions.position, config: questions.config,
    }).from(questions).where(eq(questions.quizId, id)).orderBy(asc(questions.position));
    return NextResponse.json({ questions: result });
  } catch (error) {
    console.error("Erreur récupération des questions :", error);
    return NextResponse.json({ error: "Impossible de récupérer les questions." }, { status: 500 });
  }
}
