
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Pencil,
  Plus,
  RefreshCw,
  FileQuestion,
  CalendarDays,
  Gamepad2,
  Users,
  Copy,
  Play,
} from "lucide-react";

type Quiz = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
};

type Game = {
  id: string;
  quizId: string;
  quizTitle: string;
  pin: string;
  status: string;
  createdAt: string;
};

export default function CreatedGames() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [quizResponse, gameResponse] = await Promise.all([
        fetch("/api/quizzes", { cache: "no-store" }),
        fetch("/api/games/mine", { cache: "no-store" }),
      ]);

      const quizData = await quizResponse.json();
      const gameData = await gameResponse.json();

      if (!quizResponse.ok) {
        throw new Error(quizData.error || "Impossible de charger les quiz.");
      }

      if (!gameResponse.ok) {
        throw new Error(gameData.error || "Impossible de charger les parties.");
      }

      setQuizzes(quizData.quizzes ?? []);
      setGames(gameData.games ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function copyPin(pin: string) {
    try {
      await navigator.clipboard.writeText(pin);
    } catch {
      setError("Impossible de copier le PIN. Tu peux le sélectionner manuellement.");
    }
  }

  function statusLabel(status: string) {
    switch (status) {
      case "waiting":
        return "En attente";
      case "playing":
        return "En cours";
      case "finished":
        return "Terminée";
      default:
        return status;
    }
  }

  return (
    <section
      id="mes-quiz"
      className="border-t border-white/10 bg-black/20 px-5 py-16 sm:px-8 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-black uppercase tracking-[0.2em] text-teal-300">
              Ton espace
            </p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
              Mes <span className="text-violet-300">quiz & parties</span>
            </h2>
            <p className="mt-3 text-white/60">
              Retrouve tes quiz, modifie-les et récupère les codes de tes parties.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 font-semibold transition hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Actualiser
            </button>
            <Link
              href="/host"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-500 px-4 font-bold transition hover:bg-violet-400"
            >
              <Plus size={18} />
              Créer un quiz
            </Link>
          </div>
        </div>

        {loading ? (
          <p className="rounded-3xl border border-white/10 p-8 text-center text-white/60">
            Chargement...
          </p>
        ) : error ? (
          <div className="rounded-2xl border border-red-400/20 p-6">
            <p className="text-red-300">{error}</p>
            <button
              onClick={() => void loadData()}
              className="mt-3 rounded-xl border border-white/15 px-4 py-2"
            >
              Réessayer
            </button>
          </div>
        ) : (
          <>
            {/* MES QUIZ */}
            <div className="mb-14">
              <h3 className="mb-5 flex items-center gap-2 text-2xl font-black">
                <FileQuestion className="text-violet-300" size={23} />
                Mes quiz
                <span className="text-base font-semibold text-white/40">
                  ({quizzes.length})
                </span>
              </h3>

              {quizzes.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center">
                  <p className="text-white/60">Tu n’as pas encore créé de quiz.</p>
                  <Link href="/host" className="mt-4 inline-flex items-center gap-2 font-bold text-violet-300">
                    <Plus size={17} /> Créer mon premier quiz
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {quizzes.map((quiz) => (
                    <article
                      key={quiz.id}
                      className="flex flex-col rounded-3xl border border-white/10 bg-white/4 p-5 transition hover:border-violet-300/40"
                    >
                      <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                        <FileQuestion size={22} />
                      </div>

                      <h4 className="text-xl font-black">{quiz.title}</h4>
                      <p className="mt-2 line-clamp-2 flex-1 text-sm text-white/55">
                        {quiz.description || "Aucune description"}
                      </p>

                      <p className="mt-4 flex items-center gap-2 text-xs text-white/40">
                        <CalendarDays size={14} />
                        {new Date(quiz.createdAt).toLocaleDateString("fr-FR")}
                      </p>

                      <div className="mt-5 grid grid-cols-2 gap-2">
                        <Link
                          href={`/host/${quiz.id}`}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/5 px-3 text-sm font-bold hover:bg-white/10"
                        >
                          <Pencil size={15} /> Modifier
                        </Link>
                        <Link
                          href={`/host/${quiz.id}`}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-500 px-3 text-sm font-bold hover:bg-violet-400"
                        >
                          <Play size={15} /> Ouvrir
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {/* MES PARTIES */}
            <div>
              <h3 className="mb-5 flex items-center gap-2 text-2xl font-black">
                <Gamepad2 className="text-teal-300" size={23} />
                Mes parties
                <span className="text-base font-semibold text-white/40">
                  ({games.length})
                </span>
              </h3>

              {games.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center">
                  <p className="text-white/60">
                    Aucune partie créée pour le moment.
                  </p>
                  <p className="mt-2 text-sm text-white/40">
                    Ouvre un quiz et lance une partie pour la retrouver ici.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {games.map((game) => (
                    <article
                      key={game.id}
                      className="rounded-3xl border border-white/10 bg-white/4 p-5 transition hover:border-teal-300/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex size-11 items-center justify-center rounded-2xl bg-teal-300/10 text-teal-300">
                          <Users size={22} />
                        </div>
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-white/70">
                          {statusLabel(game.status)}
                        </span>
                      </div>

                      <h4 className="mt-4 text-xl font-black">{game.quizTitle}</h4>
                      <p className="mt-1 text-sm text-white/45">
                        Créée le {new Date(game.createdAt).toLocaleDateString("fr-FR")}
                      </p>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-white/40">
                          Code PIN
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="text-3xl font-black tracking-[0.2em] text-yellow-300">
                            {game.pin}
                          </span>
                          <button
                            type="button"
                            onClick={() => void copyPin(game.pin)}
                            title="Copier le PIN"
                            className="rounded-xl border border-white/10 p-3 transition hover:bg-white/10"
                          >
                            <Copy size={17} />
                          </button>
                        </div>
                      </div>

                      <Link
                        href={`/game/${game.id}`}
                        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-400/10 px-4 font-bold text-teal-200 transition hover:bg-teal-400/20"
                      >
                        <Gamepad2 size={17} />
                        Retrouver le lobby
                      </Link>

                      <Link
                        href={`/host/${game.quizId}`}
                        className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold transition hover:bg-white/5"
                      >
                        <Pencil size={15} />
                        Ouvrir le quiz
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}