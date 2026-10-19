
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, LoaderCircle, Sparkles } from "lucide-react";
import Link from "next/link";

export default function CreateQuizPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createdQuizId, setCreatedQuizId] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!title.trim()) {
      setError("Donne un nom à ton quiz.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/quizzes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de créer le quiz.");
      }

      setSuccess(`Ton quiz « ${data.quiz.title} » a été créé !`);
      setCreatedQuizId(data.quiz.id);
      setTitle("");
      setDescription("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#100D1F] px-5 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
        >
          <ArrowLeft size={18} />
          Retour à l'accueil
        </Link>

        <div className="mb-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-300">
            <Sparkles size={24} />
          </div>

          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-yellow-300">
            Créateur de quiz
          </p>

          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            Créons ton <span className="text-violet-400">quiz.</span>
          </h1>

          <p className="mt-4 leading-7 text-white/60">
            Donne vie à ton jeu. Tu pourras ajouter tes questions,
            tes images et tes surprises ensuite.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-3xl border border-white/10 bg-white/4 p-6 sm:p-8"
        >
          <div>
            <label
              htmlFor="title"
              className="mb-2 block text-sm font-semibold"
            >
              Nom du quiz
            </label>

            <input
              id="title"
              type="text"
              maxLength={120}
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex. : L'anniversaire de Lucas 🎂"
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none transition placeholder:text-white/30 focus:border-violet-400"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-semibold"
            >
              Description <span className="text-white/40">(facultatif)</span>
            </label>

            <textarea
              id="description"
              maxLength={1000}
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Présente ton quiz en quelques mots..."
              className="w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none transition placeholder:text-white/30 focus:border-violet-400"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          {success && (
            <div
              role="status"
              className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4"
            >
              <p className="font-semibold text-emerald-300">{success}</p>
             <p className="mt-2 break-all text-sm text-white/60">
  Identifiant : {createdQuizId}
</p>
              
<Link
  href={`/host/${createdQuizId}`}
  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 py-4 font-bold text-white transition hover:bg-violet-400 active:scale-[0.98]"
>
  Accéder à mon quiz
  <ArrowRight size={18} />
</Link>

            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 py-4 font-bold transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <LoaderCircle className="animate-spin" size={20} />
                Création en cours...
              </>
            ) : (
              <>
                Créer mon quiz
                <Sparkles size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}