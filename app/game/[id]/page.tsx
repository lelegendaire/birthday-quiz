
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Copy, Users, Clock3, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { ScoreBurst } from "@/components/game/ScoreBurst";
import { Podium } from "@/components/game/Podium";
import { Leaderboard } from "@/components/game/Leaderboard";
import { CountdownRing } from "@/components/game/CountdownRing";
const MapPicker = dynamic(
  () => import("@/components/maps/MapPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-100 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
        Chargement de la carte...
      </div>
    ),
  }
);

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
  questionStartedAt: string | null;
};

type PublicQuestion = {
  id: string;
  title: string;
  type: string;
  timeLimit: number;
  points: number;
  position: number;
  correctAnswer?: string | null;
  config: {
    answers?: { id: string; text: string }[];
    min?: number;
    max?: number;
    imageUrl?: string;
    audioUrl?: string;
    items?: { id: string; text: string }[];
  };
  hasAnswered?: boolean;
myAnswer?: {
  pointsAwarded: number;
  isCorrect: boolean | null;
  
} | null;
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

type ScoreFeedback = {
  total: number;
  bonus: number;
};

function GameLobbyContent() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;
const searchParams = useSearchParams();
const playerId = searchParams.get("player") ?? "";
const [freeText, setFreeText] = useState("");
const [numericAnswer, setNumericAnswer] = useState(0);
const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(null);
const [orderIds, setOrderIds] = useState<string[]>([]);
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
const [clockNow, setClockNow] = useState(Date.now());

useEffect(() => {
  const interval = window.setInterval(() => {
    setClockNow(Date.now());
  }, 100);

  return () => window.clearInterval(interval);
}, []);
const remainingSeconds =
  currentQuestion && game?.questionStartedAt
    ? Math.max(
        0,
        Math.ceil(
          (
            new Date(game.questionStartedAt).getTime() +
            currentQuestion.timeLimit * 1000 -
            clockNow
          ) / 1000
        )
      )
    : currentQuestion?.timeLimit ?? 0;
const timeExpired = Boolean(
  currentQuestion && remainingSeconds <= 0
);
const timerProgress = currentQuestion
  ? Math.min(
      100,
      Math.max(0, (remainingSeconds / currentQuestion.timeLimit) * 100)
    )
  : 100;
useEffect(() => {
  setIsHost(
    Boolean(
      sessionStorage.getItem(`quizpop_host_token_${gameId}`),
    ),
  );
}, [gameId]);
  const loadGame = useCallback(async () => {
    try {
    
const hostToken = sessionStorage.getItem(
  `quizpop_host_token_${gameId}`,
);

const response = await fetch(
  `/api/games/${gameId}${playerId ? `?player=${encodeURIComponent(playerId)}` : ""}`,
  {
    cache: "no-store",
    headers: hostToken ? { "x-host-token": hostToken } : {},
  },
);


      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de charger la partie.");
      }

      setGame(data.game);
      setPlayers(data.players);
      setIsHost(Boolean(data.isHost));
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


async function nextQuestion() {
  const hostToken = sessionStorage.getItem(
    `quizpop_host_token_${gameId}`
  );

  if (!hostToken) {
    setStartError("Jeton organisateur introuvable.");
    return;
  }

  setStartError("");

  try {
    const response = await fetch(`/api/games/${gameId}/next`, {
      method: "POST",
      headers: {
        "x-host-token": hostToken,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Impossible de passer à la question suivante."
      );
    }

    await loadGame();
  } catch (error) {
    setStartError(
      error instanceof Error
        ? error.message
        : "Une erreur est survenue."
    );
  }
}

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

if (currentQuestion.type === "multiple_choice" && !selectedAnswerId) return;
if (["free_text", "image_guess", "audio_guess"].includes(currentQuestion.type) && !freeText.trim()) return;
if (["slider", "closest_wins"].includes(currentQuestion.type) && !Number.isFinite(numericAnswer)) return;
if (currentQuestion.type === "pin" && !selectedPoint) return;
if (currentQuestion.type === "ordering" && orderIds.length === 0) return;

  setSubmittingAnswer(true);
  setAnswerFeedback("");

  try {
    const answerPayload = currentQuestion.type === "multiple_choice"
      ? { answerId: selectedAnswerId }
      : { answerText:
          ["free_text", "image_guess", "audio_guess"].includes(currentQuestion.type) ? freeText.trim()
          : ["slider", "closest_wins"].includes(currentQuestion.type) ? String(numericAnswer)
          : currentQuestion.type === "pin" ? JSON.stringify(selectedPoint)
          : currentQuestion.type === "ordering" ? JSON.stringify(orderIds)
          : "" };
    const response = await fetch(`/api/games/${gameId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, ...answerPayload }),
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
  setSelectedPoint(null);
  setNumericAnswer(currentQuestion?.config.min ?? 0);
  const items = currentQuestion?.config.items ?? [];
  setOrderIds(items.map(item => item.id).sort(() => Math.random() - 0.5));
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

        {game.status === "waiting" && (
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
        )}
        {game.status === "waiting" && (
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
  <div className="mt-6">
    <Leaderboard
      players={players}
      highlightId={playerId || undefined}
    />
  </div>
)}

            </div>
          )}

          <p className="mt-5 flex items-center justify-center gap-2 text-xs text-white/35">
            <RefreshCw size={13} />
            Actualisation toutes les 3 secondes
          </p>
        </section>

        )}
<div className="mt-8 text-center">
  {game.status === "playing" && currentQuestion ? (
    <section className="mx-auto max-w-2xl rounded-3xl border border-[#8b5cf6]/40 bg-white/5 p-6 text-left sm:p-8">
     {isHost && (
  <>
    <p className="text-sm font-bold uppercase tracking-widest text-[#c4b5fd]">
      Question {currentQuestion.position + 1}
    </p>

    <h2 className="mt-4 text-2xl font-black sm:text-3xl">
      {currentQuestion.title}
    </h2>

    {currentQuestion.type === "image_guess" &&
      currentQuestion.config.imageUrl && (
        <img
          src={currentQuestion.config.imageUrl}
          alt="Visuel de la question"
          className="mt-6 max-h-100 w-full rounded-xl object-contain"
        />
      )}

    {currentQuestion.type === "audio_guess" &&
      currentQuestion.config.audioUrl && (
        <audio
          controls
          src={currentQuestion.config.audioUrl}
          className="mt-6 w-full"
        >
          Ton navigateur ne prend pas en charge l'audio.
        </audio>
      )}

    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-col gap-2 text-sm text-white/50">
        <span>{currentQuestion.timeLimit} secondes maximum</span>
        <span>{currentQuestion.points} points à gagner</span>
      </div>

      <CountdownRing
        startedAt={game.questionStartedAt}
        timeLimit={currentQuestion.timeLimit}
        serverOffsetMs={0}
      />
    </div>
  </>
)}

{!isHost && (
  <p className="text-sm font-bold uppercase tracking-widest text-[#c4b5fd]">
    Question {currentQuestion.position + 1}
  </p>
)}

  {!isHost && timeExpired && (
  <div className="mt-6 rounded-2xl border border-[#facc15]/30 bg-[#facc15]/10 p-6 text-center">
    <p className="text-sm font-bold uppercase tracking-widest text-[#facc15]">
      Résultats de la manche
    </p>

    {!hasAnswered || !currentQuestion.myAnswer ? (
      <p className="mt-4 font-semibold text-white/80">
        Temps écoulé ! Tu n'as pas envoyé de réponse.
      </p>
    ) : currentQuestion.myAnswer.isCorrect === null ? (
      <>
        <p className="mt-4 font-bold text-[#c4b5fd]">
          Réponse en attente de correction
        </p>
        <p className="mt-2 text-sm text-white/60">
          L'organisateur doit encore valider ta réponse.
        </p>
        <p className="mt-4 text-3xl font-black text-white">
          +{currentQuestion.myAnswer.pointsAwarded} points
        </p>
      </>
    ) : (
      <>
       <ScoreBurst
      key={`${currentQuestion.id}-${currentQuestion.myAnswer.pointsAwarded}`}
      total={currentQuestion.myAnswer.pointsAwarded}
      bonus={0}
      isCorrect={currentQuestion.myAnswer.isCorrect}
    />
        {currentQuestion.correctAnswer && (
          <div className="mt-5 rounded-xl bg-black/20 p-4">
            <p className="text-sm text-white/50">Bonne réponse</p>
            <p className="mt-1 font-bold text-white">
              {currentQuestion.correctAnswer}
            </p>
          </div>
        )}
      </>
    )}

    <p className="mt-5 text-sm text-white/50">
      Ton score total est actualisé dans le classement.
    </p>
  </div>
)}



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

{["free_text", "image_guess", "audio_guess"].includes(currentQuestion.type) && !isHost && (
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
      disabled={hasAnswered || submittingAnswer || !playerId || timeExpired}
      placeholder="Écris ta réponse ici..."
      className="w-full resize-y rounded-xl border border-white/15 bg-black/20 p-4 text-white outline-none placeholder:text-white/30 focus:border-[#c4b5fd] disabled:opacity-50"
    />

    {!hasAnswered && (
      <button
        type="button"
        onClick={() => void submitAnswer()}
        disabled={!freeText.trim() || submittingAnswer || !playerId }
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

    
  </div>
)}

{!isHost && currentQuestion.type === "slider" && (
  <div className="mt-6 space-y-3">
    <div className="flex justify-between text-sm text-white/50"><span>{currentQuestion.config.min}</span><span>{currentQuestion.config.max}</span></div>
    <input type="range" min={currentQuestion.config.min ?? 0} max={currentQuestion.config.max ?? 100} value={numericAnswer} disabled={hasAnswered || submittingAnswer || !playerId || timeExpired} onChange={e => setNumericAnswer(Number(e.target.value))} className="w-full accent-[#facc15]" />
    <p className="text-center text-3xl font-black text-[#facc15]">{numericAnswer}</p>
    {!hasAnswered && <button type="button" onClick={() => void submitAnswer()} disabled={submittingAnswer || !playerId} className="w-full rounded-xl bg-[#facc15] px-6 py-4 font-black text-[#171323] disabled:opacity-40">{submittingAnswer ? "Envoi..." : "Valider ma réponse"}</button>}
  </div>
)}

{!isHost && currentQuestion.type === "closest_wins" && (
  <div className="mt-6">
    <label className="mb-2 block text-sm font-bold text-white/70">Ton estimation</label>
    <input type="number" min={currentQuestion.config.min} max={currentQuestion.config.max} value={numericAnswer} disabled={hasAnswered || submittingAnswer || !playerId || timeExpired} onChange={e => setNumericAnswer(Number(e.target.value))} className="w-full rounded-xl border border-white/15 bg-black/20 p-4 text-white outline-none focus:border-[#c4b5fd] disabled:opacity-50" />
    {!hasAnswered && <button type="button" onClick={() => void submitAnswer()} disabled={submittingAnswer || !playerId} className="mt-3 w-full rounded-xl bg-[#facc15] px-6 py-4 font-black text-[#171323] disabled:opacity-40">{submittingAnswer ? "Envoi..." : "Envoyer mon estimation"}</button>}
  </div>
)}

{!isHost && currentQuestion.type === "pin" && (
  <div className="mt-6 space-y-3">
    <p className="text-sm text-white/60">Zoome et déplace la carte, puis clique sur l'endroit que tu penses correct.</p>
    <MapPicker value={selectedPoint} onChange={setSelectedPoint} disabled={hasAnswered || submittingAnswer || !playerId || timeExpired} center={[20, 0]} zoom={2} />
    {selectedPoint && <p className="text-xs text-white/50">Position choisie : {selectedPoint.lat.toFixed(3)}, {selectedPoint.lng.toFixed(3)}</p>}
    {!hasAnswered && <button type="button" onClick={() => void submitAnswer()} disabled={!selectedPoint || submittingAnswer || !playerId} className="w-full rounded-xl bg-[#facc15] px-6 py-4 font-black text-[#171323] disabled:opacity-40">{submittingAnswer ? "Envoi..." : "Valider la position"}</button>}
  </div>
)}

{!isHost && currentQuestion.type === "ordering" && currentQuestion.config.items && (
  <div className="mt-6 space-y-2">
    <p className="mb-3 text-sm text-white/60">Utilise les flèches pour remettre les éléments dans l'ordre.</p>
    {orderIds.map((id, index) => {
      const item = currentQuestion.config.items?.find(entry => entry.id === id);
      if (!item) return null;
      return <div key={id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3"><span className="flex-1">{item.text}</span><button type="button" disabled={index === 0 || hasAnswered || submittingAnswer} onClick={() => setOrderIds(current => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })} className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-30" aria-label="Monter">↑</button><button type="button" disabled={index === orderIds.length - 1 || hasAnswered || submittingAnswer} onClick={() => setOrderIds(current => { const next = [...current]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next; })} className="rounded-lg border border-white/10 px-3 py-2 disabled:opacity-30" aria-label="Descendre">↓</button></div>;
    })}
    {!hasAnswered && <button type="button" onClick={() => void submitAnswer()} disabled={submittingAnswer || !playerId} className="mt-3 w-full rounded-xl bg-[#facc15] px-6 py-4 font-black text-[#171323] disabled:opacity-40">{submittingAnswer ? "Envoi..." : "Valider l'ordre"}</button>}
  </div>
)}

{isHost && pendingAnswers.length > 0 && (
  <div className="mt-8 border-t border-white/10 pt-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-xl font-black">Réponses à corriger ({pendingAnswers.length})</h3>
    </div>
    {startError && <p role="alert" className="mt-3 text-sm text-red-300">{startError}</p>}

    <p className="mt-2 text-sm text-white/50">
      Valide chaque réponse pour attribuer les points.
    </p>

    {reviewError && (
      <p role="alert" className="mt-3 text-sm text-red-300">
        {reviewError}
      </p>
    )}

   
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
    
  </div>
)}
{isHost && timeExpired && (

      <button type="button" onClick={() => void nextQuestion()} className="rounded-xl bg-[#8b5cf6] px-4 py-3 font-bold text-white transition hover:bg-[#7c3aed]">Question suivante →</button>
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


      <p className="mt-6 text-sm text-white/40">Les réponses sont actualisées automatiquement.</p>
    </section>
  ) : game.status === "playing" ? (
    <p className="text-white/60">
      Chargement de la question...
    </p>
 
) : game.status === "finished" ? (
  <section className="mx-auto max-w-2xl rounded-3xl border border-[#facc15]/30 bg-white/5 p-6 text-center sm:p-8">
    <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#c4b5fd]">
      Fin de la partie
    </p>

    <h2 className="mt-3 text-3xl font-black text-[#facc15] sm:text-4xl">
      Quiz terminé !
    </h2>

    <p className="mt-3 text-white/60">
      Bravo à tous les participants. Voici les résultats !
    </p>

    {players.length > 0 && (
      <div className="mt-10">
        <Podium players={players} />
      </div>
    )}

    <div className="mt-10 text-left">
      <h3 className="mb-4 text-xl font-black">
        Classement final
      </h3>

      <Leaderboard
        players={players}
        highlightId={playerId || undefined}
      />
    </div>
  </section>
)
 : isHost ? (
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