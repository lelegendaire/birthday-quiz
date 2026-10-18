
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Copy, Users, Clock3, RefreshCw } from "lucide-react";

type Player = {
  id: string;
  nickname: string;
  score: number;
};

type Game = {
  id: string;
  pin: string;
  status: string;
  quizId: string;
};

type PublicQuestion = {
  id: string;
  title: string;
  type: string;
  timeLimit: number;
  points: number;
  position: number;
  config: {
    answers?: { id: string; text: string }[];
  };
  hasAnswered?: boolean;
};

type PendingAnswer = {
  id: string;
  playerId: string;
  nickname: string;
  questionId: string;
  questionTitle: string;
  answerText: string | null;
  points: number;
  answeredAt: string;
};

function GameLobbyContent() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;
const searchParams = useSearchParams();
const playerId = searchParams.get("player") ?? "";
const [freeText, setFreeText] = useState("");
const [pendingAnswers, setPendingAnswers] = useState<PendingAnswer[]>([]);
const [reviewError, setReviewError] = useState("");
const [selectedAnswerId, setSelectedAnswerId] = useState("");
const [hasAnswered, setHasAnswered] = useState(false);
const [answerFeedback, setAnswerFeedback] = useState("");
const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
const [isHost, setIsHost] = useState(false);
const [currentQuestion, setCurrentQuestion] =
  useState<PublicQuestion | null>(null);
const [startingGame, setStartingGame] = useState(false);
const [startError, setStartError] = useState("");
useEffect(() => {
  setIsHost(
    Boolean(
      sessionStorage.getItem(`quizpop_host_token_${gameId}`),
    ),
  );
}, [gameId]);
  const loadGame = useCallback(async () => {
    try {
     const response = await fetch(
  `/api/games/${gameId}${playerId ? `?player=${encodeURIComponent(playerId)}` : ""}`,
  { cache: "no-store" },
);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de charger la partie.");
      }

      setGame(data.game);
      setPlayers(data.players);
setCurrentQuestion(data.currentQuestion ?? null);
setHasAnswered(Boolean(data.currentQuestion?.hasAnswered));
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue.",
      );
    } finally {
      setLoading(false);
    }
  }, [gameId,playerId]);

async function startGame() {
  const hostToken = sessionStorage.getItem(
    `quizpop_host_token_${gameId}`,
  );

  if (!hostToken) {
    setStartError(
      "Jeton organisateur introuvable. Retourne dans l'éditeur du quiz.",
    );
    return;
  }

  setStartingGame(true);
  setStartError("");

  try {
    const response = await fetch(`/api/games/${gameId}/start`, {
      method: "POST",
      headers: {
        "x-host-token": hostToken,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Impossible de lancer le quiz.");
    }

    await loadGame();
  } catch (err) {
    setStartError(
      err instanceof Error
        ? err.message
        : "Une erreur est survenue.",
    );
  } finally {
    setStartingGame(false);
  }
}
  
const loadPendingAnswers = useCallback(async () => {
  const hostToken = sessionStorage.getItem(
    `quizpop_host_token_${gameId}`,
  );

  if (!hostToken) return;

  try {
    const response = await fetch(`/api/games/${gameId}/answers`, {
      cache: "no-store",
      headers: { "x-host-token": hostToken },
    });

    const data = await response.json();

    if (response.ok) {
      setPendingAnswers(data.answers ?? []);
      setReviewError("");
    } else {
      setReviewError(data.error || "Impossible de charger les réponses.");
    }
  } catch {
    setReviewError("Impossible de contacter le serveur.");
  }
}, [gameId]);

useEffect(() => {
  void loadGame();
  void loadPendingAnswers();

  const interval = window.setInterval(() => {
    void loadGame();
    void loadPendingAnswers();
  }, 3000);

  return () => window.clearInterval(interval);
}, [loadGame, loadPendingAnswers]);


  async function copyPin() {
    if (!game) return;

    try {
      await navigator.clipboard.writeText(game.pin);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Impossible de copier le PIN automatiquement.");
    }
  }

async function submitAnswer() {
 if (!playerId || !currentQuestion || hasAnswered || submittingAnswer) {
  return;
}

if (currentQuestion.type === "multiple_choice" && !selectedAnswerId) {
  return;
}

if (currentQuestion.type === "free_text" && !freeText.trim()) {
  return;
}

  setSubmittingAnswer(true);
  setAnswerFeedback("");

  try {
    const response = await fetch(`/api/games/${gameId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
  playerId,
  ...(currentQuestion.type === "free_text"
    ? { answerText: freeText.trim() }
    : { answerId: selectedAnswerId }),
}),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 409) {
        setHasAnswered(true);
        setFreeText("");
      }
      throw new Error(data.error || "Impossible d'envoyer ta réponse.");
    }

    setHasAnswered(true);
    setAnswerFeedback(data.message);
    await loadGame();
  } catch (err) {
    setAnswerFeedback(
      err instanceof Error ? err.message : "Une erreur est survenue.",
    );
  } finally {
    setSubmittingAnswer(false);
  }
}
useEffect(() => {
  setSelectedAnswerId("");
  setFreeText("");
  setAnswerFeedback("");
  setHasAnswered(Boolean(currentQuestion?.hasAnswered));
}, [currentQuestion?.id]);



async function reviewAnswer(answerId: string, correct: boolean) {
  const hostToken = sessionStorage.getItem(
    `quizpop_host_token_${gameId}`,
  );

  if (!hostToken) {
    setReviewError("Jeton organisateur introuvable.");
    return;
  }

  try {
    const response = await fetch(`/api/games/${gameId}/answers`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-host-token": hostToken,
      },
      body: JSON.stringify({ answerId, correct }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Impossible de corriger cette réponse.");
    }

    setPendingAnswers((previous) =>
      previous.filter((answer) => answer.id !== answerId),
    );

    setReviewError("");
    await loadGame();
  } catch (err) {
    setReviewError(
      err instanceof Error ? err.message : "Erreur de correction.",
    );
  }
}

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#171323] text-white">
        <p className="animate-pulse text-white/60">
          Chargement de la salle...
        </p>
      </main>
    );
  }

  if (error && !game) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#171323] px-5 text-white">
        <div className="text-center">
          <h1 className="text-3xl font-black">Oups !</h1>
          <p className="mt-3 text-red-300">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              void loadGame();
            }}
            className="mt-5 rounded-xl bg-[#8b5cf6] px-5 py-3 font-bold"
          >
            Réessayer
          </button>
        </div>
      </main>
    );
  }

  if (!game) return null;

  return (
    <main className="min-h-screen bg-[#171323] px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <p className="text-xl font-black tracking-tight">
            Quiz<span className="text-[#facc15]">Pop</span>
          </p>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/60">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Salle active
          </div>
        </header>

        <section className="py-12 text-center sm:py-16">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#c4b5fd]">
            Rejoins la partie
          </p>

          <h1 className="mt-4 text-4xl font-black sm:text-6xl">
            C'est parti ?
          </h1>

          <p className="mt-4 text-white/60">
            Partage le code avec tes amis pour qu'ils puissent te rejoindre.
          </p>

          <div className="mx-auto mt-8 max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <p className="text-sm font-semibold text-white/50">
              CODE PIN
            </p>

            <p className="my-4 text-5xl font-black tracking-[0.25em] text-[#facc15] sm:text-6xl">
              {game.pin}
            </p>

            <button
              onClick={() => void copyPin()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold transition hover:bg-white/10"
            >
              <Copy size={16} />
              {copied ? "Code copié !" : "Copier le code"}
            </button>

            <p className="mt-4 text-xs text-white/40">
              Les joueurs rejoignent la partie sur la page /join.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <Users className="text-[#c4b5fd]" size={22} />
                Joueurs dans la salle
              </h2>

              <p className="mt-1 text-sm text-white/50">
                Les nouveaux joueurs apparaissent automatiquement.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-[#8b5cf6]/20 px-4 py-2 font-bold text-[#c4b5fd]">
              <Users size={17} />
              {players.length}
            </div>
          </div>

          {error && (
            <p role="status" className="mt-4 text-sm text-amber-300">
              Actualisation impossible : nouvelle tentative automatique.
            </p>
          )}

          {players.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-white/15 px-5 py-12 text-center">
              <Clock3
                size={36}
                className="mx-auto text-white/30"
              />

              <p className="mt-4 font-semibold">
                En attente des joueurs...
              </p>

              <p className="mt-2 text-sm text-white/45">
                Envoie le PIN à tes amis pour commencer à remplir la salle.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/10 p-4"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#8b5cf6]/20 font-black text-[#c4b5fd]">
                    {index + 1}
                  </div>

                  <p className="min-w-0 truncate font-semibold">
                    {player.nickname}
                  </p>
                </div>
              ))}
            </div>
          )}

          <p className="mt-5 flex items-center justify-center gap-2 text-xs text-white/35">
            <RefreshCw size={13} />
            Actualisation toutes les 3 secondes
          </p>
        </section>

     
<div className="mt-8 text-center">
  {game.status === "playing" && currentQuestion ? (
    <section className="mx-auto max-w-2xl rounded-3xl border border-[#8b5cf6]/40 bg-white/5 p-6 text-left sm:p-8">
      <p className="text-sm font-bold uppercase tracking-widest text-[#c4b5fd]">
        Question {currentQuestion.position + 1}
      </p>

      <h2 className="mt-4 text-2xl font-black sm:text-3xl">
        {currentQuestion.title}
      </h2>

      <div className="mt-4 flex gap-4 text-sm text-white/50">
        <span>{currentQuestion.timeLimit} secondes</span>
        <span>{currentQuestion.points} points</span>
      </div>

     
{currentQuestion.config.answers && (
  <div className="mt-6 grid gap-3 sm:grid-cols-2">
    {currentQuestion.config.answers.map((answer, index) => {
      const selected = selectedAnswerId === answer.id;

      return (
        <button
          key={answer.id}
          type="button"
          disabled={isHost || hasAnswered || submittingAnswer || !playerId}
          onClick={() => setSelectedAnswerId(answer.id)}
          className={`rounded-xl border p-4 text-left font-semibold transition ${
            selected
              ? "border-[#c4b5fd] bg-[#8b5cf6]/30"
              : "border-white/10 bg-white/5"
          } ${
            !isHost && !hasAnswered
              ? "hover:border-[#c4b5fd]/60 hover:bg-white/10"
              : ""
          } disabled:cursor-default`}
        >
          <span className="mr-3 text-[#c4b5fd]">
            {String.fromCharCode(65 + index)}
          </span>
          {answer.text}
        </button>
      );
    })}
  </div>
)}

{currentQuestion.type === "free_text" && !isHost && (
  <div className="mt-6">
    <label
      htmlFor="free-answer"
      className="mb-2 block text-sm font-bold text-white/70"
    >
      Ta réponse
    </label>

    <textarea
      id="free-answer"
      value={freeText}
      onChange={(event) => setFreeText(event.target.value)}
      maxLength={2000}
      rows={3}
      disabled={hasAnswered || submittingAnswer || !playerId}
      placeholder="Écris ta réponse ici..."
      className="w-full resize-y rounded-xl border border-white/15 bg-black/20 p-4 text-white outline-none placeholder:text-white/30 focus:border-[#c4b5fd] disabled:opacity-50"
    />

    {!hasAnswered && (
      <button
        type="button"
        onClick={() => void submitAnswer()}
        disabled={!freeText.trim() || submittingAnswer || !playerId}
        className="mt-3 w-full rounded-xl bg-[#facc15] px-6 py-4 font-black text-[#171323] transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submittingAnswer ? "Envoi..." : "Envoyer ma réponse"}
      </button>
    )}

    {hasAnswered && (
      <p className="mt-4 text-center text-emerald-300">
        Réponse envoyée ! En attente de la correction de l'organisateur.
      </p>
    )}

    {answerFeedback && (
      <p role="status" className="mt-3 text-center text-sm text-white/70">
        {answerFeedback}
      </p>
    )}
  </div>
)}

{isHost && (
  <div className="mt-8 border-t border-white/10 pt-6">
    <h3 className="text-xl font-black">
      Réponses à corriger ({pendingAnswers.length})
    </h3>

    <p className="mt-2 text-sm text-white/50">
      Valide chaque réponse pour attribuer les points.
    </p>

    {reviewError && (
      <p role="alert" className="mt-3 text-sm text-red-300">
        {reviewError}
      </p>
    )}

    {pendingAnswers.length === 0 ? (
      <p className="mt-4 text-sm text-white/40">
        Aucune réponse libre en attente.
      </p>
    ) : (
      <div className="mt-4 space-y-4">
        {pendingAnswers.map((answer) => (
          <div
            key={answer.id}
            className="rounded-2xl border border-white/10 bg-black/20 p-4"
          >
            <p className="font-bold text-[#c4b5fd]">
              {answer.nickname}
            </p>

            <p className="mt-2 text-xs text-white/40">
              {answer.questionTitle}
            </p>

            <p className="mt-2 whitespace-pre-wrap wrap-break-word">
              {answer.answerText}
            </p>

            <p className="mt-3 text-sm text-white/50">
              Valeur : {answer.points} points
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void reviewAnswer(answer.id, true)}
                className="rounded-xl bg-emerald-500/15 px-4 py-3 font-bold text-emerald-300 transition hover:bg-emerald-500/25"
              >
                Correcte · Attribuer les points
              </button>

              <button
                type="button"
                onClick={() => void reviewAnswer(answer.id, false)}
                className="rounded-xl bg-red-500/15 px-4 py-3 font-bold text-red-300 transition hover:bg-red-500/25"
              >
                Incorrecte · 0 point
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}

{!isHost && playerId && currentQuestion.config.answers && (
  <div className="mt-6">
    {!hasAnswered && (
      <button
        type="button"
        onClick={() => void submitAnswer()}
        disabled={!selectedAnswerId || submittingAnswer}
        className="w-full rounded-xl bg-[#facc15] px-6 py-4 font-black text-[#171323] transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submittingAnswer ? "Envoi..." : "Valider ma réponse"}
      </button>
    )}

    {answerFeedback && (
      <p role="status" className="mt-4 text-center font-bold text-[#facc15]">
        {answerFeedback}
      </p>
    )}

    {hasAnswered && !answerFeedback && (
      <p className="mt-4 text-center text-emerald-300">
        Réponse enregistrée ! En attente de la suite...
      </p>
    )}
  </div>
)}

      <p className="mt-6 text-sm text-white/40">
        La question est lancée. Le système de réponses sera ajouté à
        l'étape suivante.
      </p>
    </section>
  ) : game.status === "playing" ? (
    <p className="text-white/60">
      Chargement de la question...
    </p>
  ) : isHost ? (
    <>
      <p className="text-sm text-white/50">
        Tous les joueurs sont-ils prêts ?
      </p>

      {startError && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {startError}
        </p>
      )}

      <button
        type="button"
        onClick={() => void startGame()}
        disabled={startingGame}
        className="mt-5 w-full max-w-sm rounded-xl bg-[#facc15] px-6 py-4 font-black text-[#171323] transition hover:bg-yellow-300 disabled:opacity-50"
      >
        {startingGame ? "Lancement..." : "Lancer le quiz"}
      </button>
    </>
  ) : (
    <p className="text-white/60">
      En attente du lancement par l'organisateur...
    </p>
  )}
</div>
      </div>
    </main>
  );
}

export default function GameLobbyPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#171323] text-white">
          Chargement de la salle...
        </main>
      }
    >
      <GameLobbyContent />
    </Suspense>
  );
}