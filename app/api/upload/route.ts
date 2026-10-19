
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";


const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/mp4",
  "audio/aac",
  "audio/webm",
]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const kind = formData.get("kind");

    if (!(file instanceof File) || (kind !== "image" && kind !== "audio")) {
      return NextResponse.json(
        { error: "Fichier ou type invalide." },
        { status: 400 },
      );
    }

    const allowedTypes = kind === "image" ? IMAGE_TYPES : AUDIO_TYPES;
    const maxSize = kind === "image" ? 8 * 1024 * 1024 : 12 * 1024 * 1024;

    if (!allowedTypes.has(file.type)) {
      return NextResponse.json(
        { error: "Ce format de fichier n'est pas accepté." },
        { status: 400 },
      );
    }

    if (file.size === 0 || file.size > maxSize) {
      return NextResponse.json(
        { error: "Fichier vide ou trop volumineux." },
        { status: 400 },
      );
    }

    const blob = await put(
      `quizpop/${kind}/${crypto.randomUUID()}`,
      file,
      {
        access: "public",
        addRandomSuffix: true,
        contentType: file.type,
      },
    );

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Upload QuizPop :", error);

    return NextResponse.json(
      { error: "Impossible d'envoyer le fichier. Vérifie la configuration du stockage." },
      { status: 500 },
    );
  }
}
