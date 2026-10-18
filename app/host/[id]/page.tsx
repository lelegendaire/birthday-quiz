"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Clock,
  Trophy,
  Sparkles,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

const MapPicker = dynamic(
  () => import("@/components/maps/MapPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] items-center justify-center rounded-xl bg-gray-100">
        Chargement de la carte...
      </div>
    ),
  }
);

const questionTypes = [
  { value: "multiple_choice", label: "QCM" },
  { value: "free_text", label: "Réponse libre" },
  { value: "slider", label: "Curseur" },
  { value: "pin", label: "Placer sur une carte" },
  { value: "ordering", label: "Remettre dans l'ordre" },
  { value: "image_guess", label: "Deviner l'image" },
  { value: "audio_guess", label: "Deviner le son" },
  { value: "closest_wins", label: "Au plus proche" },
];

type Answer = {
  id: string;
  text: string;
};

type Question = {
  id: string;
  title: string;
  type: string;
  timeLimit: number;
  points: number;
  config: {
    answers?: Answer[];
    correctAnswerId?: string;
    expectedAnswer?: string;
    min?: number;
    max?: number;
    target?: number;
    imageUrl?: string;
    audioUrl?: string;
    targetLat?: number;
    targetLng?: number;
    items?: { id: string; text: string }[];
    correctOrder?: string[];
  };
};

function QuizEditorContent() {
  const params = useParams<{ id: string }>();
  const quizId = params.id;

  const [quizTitle, setQuizTitle] = useState("Mon nouveau quiz");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("multiple_choice");
  const [timeLimit, setTimeLimit] = useState(20);
  const [points, setPoints] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [answers, setAnswers] = useState(["", "", "", ""]);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null,
  );
  const [correctAnswerId, setCorrectAnswerId] = useState("a");
  const [expectedAnswer, setExpectedAnswer] = useState("");
  const [minValue, setMinValue] = useState(0);
  const [maxValue, setMaxValue] = useState(100);
  const [targetValue, setTargetValue] = useState(50);
  const [imageUrl, setImageUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [targetLat, setTargetLat] = useState(48.8566);
  const [targetLng, setTargetLng] = useState(2.3522);
  const [orderingItems, setOrderingItems] = useState(["", "", ""]);
  const [creatingGame, setCreatingGame] = useState(false);
  const [gamePin, setGamePin] = useState("");
  const [gameError, setGameError] = useState("");
  useEffect(() => {
    async function loadQuestions() {
      try {
        const response = await fetch(`/api/quizzes/${quizId}/questions`);

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Erreur de chargement.");
        }

        setQuestions(
          data.questions.map((question: Question) => ({
            ...question,
            config: question.config ?? {},
          })),
        );
      } catch (error) {
        console.error("Erreur de chargement des questions :", error);
        setError("Impossible de charger les questions enregistrées.");
      }
    }

    if (quizId) {
      void loadQuestions();
    }
  }, [quizId]);
  function editQuestion(question: Question) {
    setEditingQuestionId(question.id);
    setTitle(question.title);
    setType(question.type);
    setTimeLimit(question.timeLimit);
    setPoints(question.points);
    setAnswers(
      question.config.answers?.map((answer) => answer.text) ?? ["", "", "", ""],
    );
    setCorrectAnswerId(question.config.correctAnswerId ?? "a");
    setExpectedAnswer(question.config.expectedAnswer ?? "");
    setMinValue(question.config.min ?? 0);
    setMaxValue(question.config.max ?? 100);
    setTargetValue(question.config.target ?? 50);
    setImageUrl(question.config.imageUrl ?? "");
    setAudioUrl(question.config.audioUrl ?? "");
    setTargetLat(question.config.targetLat ?? 48.8566);
    setTargetLng(question.config.targetLng ?? 2.3522);
    setOrderingItems(question.config.items?.map(item => item.text) ?? ["", "", ""]);
    setError("");
    setSuccess("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function addQuestion() {
    setError("");
    setSuccess("");

    if (!title.trim()) {
      setError("Écris d'abord le titre de ta question.");
      return;
    }
    if (
      type === "multiple_choice" &&
      answers.some((answer) => !answer.trim())
    ) {
      setError("Complète les quatre propositions de réponse.");
      return;
    }

    if ((type === "free_text" || type === "image_guess" || type === "audio_guess") && !expectedAnswer.trim()) {
      setError("Renseigne la réponse attendue avant d'enregistrer la question.");
      return;
    }

    if (type === "slider" && !(maxValue > minValue && targetValue >= minValue && targetValue <= maxValue)) {
      setError("Pour le curseur, la valeur cible doit être comprise entre le minimum et le maximum.");
      return;
    }
    if (type === "image_guess" && !imageUrl.trim()) {
      setError("Ajoute une URL d'image valide.");
      return;
    }
    if (type === "audio_guess" && !audioUrl.trim()) {
      setError("Ajoute une URL audio valide.");
      return;
    }
    if (type === "ordering" && (orderingItems.filter(item => item.trim()).length < 2 || orderingItems.some(item => !item.trim()))) {
      setError("Renseigne au moins deux éléments et complète chaque ligne.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        editingQuestionId
          ? `/api/quizzes/${quizId}/questions/${editingQuestionId}`
          : `/api/quizzes/${quizId}/questions`,
        {
          method: editingQuestionId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            title: title.trim(),
            timeLimit,
            points,
            config:
              type === "multiple_choice"
                ? {
                    answers: answers.map((text, index) => ({
                      id: String.fromCharCode(97 + index),
                      text: text.trim(),
                    })),
                    correctAnswerId,
                  }
                : type === "free_text"
                  ? { expectedAnswer: expectedAnswer.trim() }
                  : type === "slider"
                    ? { min: minValue, max: maxValue, target: targetValue }
                    : type === "pin"
                      ? { targetLat, targetLng }
                      : type === "ordering"
                        ? {
                            items: orderingItems.map((text, index) => ({ id: String(index + 1), text: text.trim() })),
                            correctOrder: orderingItems.map((_, index) => String(index + 1)),
                          }
                        : type === "image_guess"
                          ? { imageUrl: imageUrl.trim(), expectedAnswer: expectedAnswer.trim() }
                          : type === "audio_guess"
                            ? { audioUrl: audioUrl.trim(), expectedAnswer: expectedAnswer.trim() }
                            : type === "closest_wins"
                              ? { target: targetValue, min: minValue, max: maxValue }
                              : {},
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible d'ajouter la question.");
      }

      const savedQuestion: Question = {
        id: data.question.id,
        title: data.question.title,
        type: data.question.type,
        timeLimit: data.question.timeLimit,
        points: data.question.points,
        config: data.question.config ?? {},
      };

      if (editingQuestionId) {
        setQuestions((current) =>
          current.map((question) =>
            question.id === editingQuestionId ? savedQuestion : question,
          ),
        );
      } else {
        setQuestions((current) => [...current, savedQuestion]);
      }

      setTitle("");
      setAnswers(["", "", "", ""]);
      setCorrectAnswerId("a");
      setExpectedAnswer("");
      setImageUrl("");
      setAudioUrl("");
      setMinValue(0);
      setMaxValue(100);
      setTargetValue(50);
      setTargetLat(50);
      setTargetLng(50);
      setOrderingItems(["", "", ""]);
      setEditingQuestionId(null);
      setSuccess("Question enregistrée !");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }
  async function deleteQuestion(questionId: string) {
    if (!window.confirm("Supprimer définitivement cette question ?")) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/quizzes/${quizId}/questions/${questionId}`,
        { method: "DELETE" },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de supprimer la question.");
      }

      setQuestions((current) =>
        current.filter((question) => question.id !== questionId),
      );

      if (editingQuestionId === questionId) {
        setEditingQuestionId(null);
        setTitle("");
        setAnswers(["", "", "", ""]);
        setCorrectAnswerId("a");
        setExpectedAnswer("");
      }

      setSuccess("Question supprimée.");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Une erreur est survenue.",
      );
    }
  }
  async function createGame() {
    setCreatingGame(true);
    setGameError("");
    setGamePin("");

    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quizId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de créer la partie.");
      }
      if (!data.game?.id || !data.game?.pin || !data.hostToken) {
        throw new Error(
          "La partie a été créée, mais le serveur n'a pas renvoyé le jeton organisateur.",
        );
      }
      sessionStorage.setItem(
        `quizpop_host_token_${data.game.id}`,
        data.hostToken,
      );
 // 2. Enregistrer la partie dans l'historique local.
    const rawGames = localStorage.getItem("quizpop_created_games");
    const savedGames = rawGames ? JSON.parse(rawGames) : [];

    const updatedGames = [
      {
        id: data.game.id,
        pin: data.game.pin,
        quizId,
        createdAt: new Date().toISOString(),
      },
      ...savedGames.filter(
        (item: { id: string }) => item.id !== data.game.id,
      ),
    ];

    localStorage.setItem(
      "quizpop_created_games",
      JSON.stringify(updatedGames),
    );

    // 3. Mettre à jour l'interface.
    setGamePin(data.game.pin);
    setSuccess("Partie créée et enregistrée !");
    } catch (error) {
      setGameError(
        error instanceof Error ? error.message : "Une erreur est survenue.",
      );
    } finally {
      setCreatingGame(false);
    }
  }
  return (
    <main className="min-h-screen bg-[#100d20] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/host"
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
        >
          <ArrowLeft size={18} />
          Retour
        </Link>

        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#f5d547]">
              <Sparkles size={16} />
              QUIZPOP · ÉDITEUR
            </p>
            <input
              value={quizTitle}
              onChange={(event) => setQuizTitle(event.target.value)}
              className="w-full bg-transparent text-3xl font-black outline-none sm:text-4xl"
              aria-label="Titre du quiz"
            />
            <p className="mt-2 break-all text-xs text-white/40">
              ID : {quizId}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
            <p className="text-sm text-white/50">Questions</p>
            <p className="text-2xl font-bold">{questions.length}</p>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Tes questions</h2>
              <span className="text-sm text-white/40">
                {questions.length} question(s)
              </span>
            </div>

            {questions.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/20 bg-white/3 px-6 py-12 text-center">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#8b5cf6]/20 text-[#c4b5fd]">
                  <Plus size={28} />
                </div>
                <h3 className="text-lg font-bold">Tout commence ici !</h3>
                <p className="mt-2 text-sm text-white/50">
                  Ajoute ta première question avec le formulaire.
                </p>
              </div>
            ) : (
              questions.map((question, index) => (
                <article
                  key={question.id}
                  className="rounded-2xl border border-white/10 bg-white/4 p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#8b5cf6]/20 font-bold text-[#c4b5fd]">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="wrap-break-word font-semibold">
                        {question.title}
                      </h3>
                      <p className="mt-2 text-sm text-white/50">
                        {
                          questionTypes.find(
                            (item) => item.value === question.type,
                          )?.label
                        }
                      </p>
                      {question.type === "multiple_choice" &&
                        question.config.answers?.map((answer) => (
                          <div
                            key={answer.id}
                            className="mt-2 flex items-center gap-2 text-sm"
                          >
                            <span
                              className={
                                answer.id === question.config.correctAnswerId
                                  ? "text-emerald-400"
                                  : "text-white/50"
                              }
                            >
                              {answer.id === question.config.correctAnswerId
                                ? "✓"
                                : "○"}
                            </span>
                            <span
                              className={
                                answer.id === question.config.correctAnswerId
                                  ? "text-emerald-300"
                                  : "text-white/70"
                              }
                            >
                              {answer.text}
                            </span>
                          </div>
                        ))}
                      {question.type === "free_text" && (
                        <p className="mt-3 text-sm text-emerald-300">
                          Réponse attendue : {question.config.expectedAnswer || "Non renseignée"}
                        </p>
                      )}
                      <div className="mt-3 flex gap-4 text-xs text-white/50">
                        <span className="flex items-center gap-1">
                          <Clock size={14} /> {question.timeLimit} s
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy size={14} /> {question.points} points
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2 border-t border-white/10 pt-4">
                    <button
                      type="button"
                      onClick={() => editQuestion(question)}
                      className="flex items-center gap-2 rounded-lg bg-[#8b5cf6]/20 px-3 py-2 text-sm text-[#c4b5fd] hover:bg-[#8b5cf6]/30"
                    >
                      <Pencil size={15} />
                      Modifier
                    </button>

                    <button
                      type="button"
                      onClick={() => void deleteQuestion(question.id)}
                      className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 hover:bg-red-500/20"
                    >
                      <Trash2 size={15} />
                      Supprimer
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-xl font-bold text-white">Lancer une partie</h2>

            <p className="mt-2 text-sm text-white/60">
              Génère un code PIN pour permettre aux joueurs de rejoindre ton
              quiz.
            </p>

            <button
              type="button"
              onClick={() => void createGame()}
              disabled={creatingGame}
              className="mt-4 w-full rounded-xl bg-[#8b5cf6] px-4 py-3 font-semibold text-white transition hover:bg-[#7c3aed] disabled:opacity-50"
            >
              {creatingGame ? "Création en cours..." : "Créer une partie"}
            </button>

            {gamePin && (
              <div className="mt-5 rounded-xl bg-black/20 p-5 text-center">
                <p className="text-sm text-white/60">Code PIN de la partie</p>

                <p className="my-3 text-4xl font-black tracking-[0.3em] text-[#facc15]">
                  {gamePin}
                </p>

                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(gamePin)}
                  className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/10"
                >
                  Copier le PIN
                </button>
              </div>
            )}

            {gameError && (
              <p className="mt-3 text-sm text-red-400">{gameError}</p>
            )}
          </div>
          <aside className="h-fit rounded-3xl border border-white/10 bg-white/4 p-5 sm:p-6">
            <h2 className="mb-5 text-xl font-bold">
              {editingQuestionId ? "Modifier la question" : "Nouvelle question"}
            </h2>

            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                void addQuestion();
              }}
            >
              <div>
                <label
                  htmlFor="question-title"
                  className="mb-2 block text-sm font-medium text-white/70"
                >
                  Ta question
                </label>
                <textarea
                  id="question-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ex. Quel est mon plat préféré ?"
                  maxLength={500}
                  rows={4}
                  className="w-full resize-y rounded-xl border border-white/10 bg-black/20 p-3 text-sm outline-none transition focus:border-[#a78bfa]"
                />
              </div>

              <div>
                <label
                  htmlFor="question-type"
                  className="mb-2 block text-sm font-medium text-white/70"
                >
                  Type de question
                </label>
                <select
                  id="question-type"
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#211a35] p-3 text-sm outline-none focus:border-[#a78bfa]"
                >
                  {questionTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {(type === "free_text" || type === "image_guess" || type === "audio_guess") && (
                <div>
                  <label
                    htmlFor="expected-answer"
                    className="mb-2 block text-sm font-medium text-white/70"
                  >
                    Réponse attendue
                  </label>
                  <input
                    id="expected-answer"
                    type="text"
                    value={expectedAnswer}
                    onChange={(event) => setExpectedAnswer(event.target.value)}
                    placeholder={type === "audio_guess" ? "Ex. Le bruit d'un chat" : type === "image_guess" ? "Ex. Tour Eiffel" : "Ex. Rome"}
                    maxLength={500}
                    className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm outline-none transition focus:border-[#a78bfa]"
                  />
                  <p className="mt-2 text-xs text-white/40">
                    Cette réponse sert de référence à l'organisateur. Les joueurs ne la verront pas.
                  </p>
                </div>
              )}

              {type === "pin" && (
                <div className="space-y-3">
                  <p className="text-sm text-white/70">Clique sur la carte pour définir l'emplacement correct. Les joueurs ne verront pas ce marqueur.</p>
                  <MapPicker value={{ lat: targetLat, lng: targetLng }} onChange={(point) => { setTargetLat(point.lat); setTargetLng(point.lng); }} center={[48.8566, 2.3522]} zoom={5} />
                  <p className="text-xs text-white/40">Latitude : {targetLat.toFixed(5)} · Longitude : {targetLng.toFixed(5)}</p>
                </div>
              )}

              {type === "image_guess" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">URL de l'image</label>
                  <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} type="url" placeholder="https://exemple.com/image.jpg" className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm outline-none focus:border-[#a78bfa]" />
                </div>
              )}

              {type === "audio_guess" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">URL du fichier audio</label>
                  <input value={audioUrl} onChange={(event) => setAudioUrl(event.target.value)} type="url" placeholder="https://exemple.com/son.mp3" className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm outline-none focus:border-[#a78bfa]" />
                </div>
              )}

              {(type === "slider" || type === "closest_wins") && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-sm text-white/70">Minimum<input type="number" value={minValue} onChange={e => setMinValue(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 p-3" /></label>
                    <label className="text-sm text-white/70">Maximum<input type="number" value={maxValue} onChange={e => setMaxValue(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 p-3" /></label>
                  </div>
                  <label className="block text-sm text-white/70">Valeur cible<input type="number" value={targetValue} onChange={e => setTargetValue(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 p-3" /></label>
                  <p className="text-xs text-white/40">La valeur cible est conservée dans la configuration privée de la question.</p>
                </div>
              )}

              {type === "ordering" && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-white/70">Éléments dans le bon ordre</p>
                  <p className="text-xs text-white/40">Saisis les éléments dans l'ordre attendu. Les joueurs devront les réordonner.</p>
                  {orderingItems.map((item, index) => (
                    <input key={index} value={item} onChange={e => setOrderingItems(current => current.map((value, i) => i === index ? e.target.value : value))} placeholder={`Élément ${index + 1}`} className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm outline-none focus:border-[#a78bfa]" />
                  ))}
                  <button type="button" onClick={() => setOrderingItems(current => current.length < 10 ? [...current, ""] : current)} disabled={orderingItems.length >= 10} className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70 disabled:opacity-40">Ajouter un élément</button>
                  <button type="button" onClick={() => setOrderingItems(current => current.length > 2 ? current.slice(0, -1) : current)} disabled={orderingItems.length <= 2} className="ml-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70 disabled:opacity-40">Retirer</button>
                </div>
              )}

              {type === "multiple_choice" && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-white/70">
                      Propositions de réponse
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      Sélectionne le cercle de la bonne réponse.
                    </p>
                  </div>

                  {answers.map((answer, index) => {
                    const answerId = String.fromCharCode(97 + index);

                    return (
                      <div key={answerId} className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="correct-answer"
                          value={answerId}
                          checked={correctAnswerId === answerId}
                          onChange={() => setCorrectAnswerId(answerId)}
                          aria-label={`Définir la réponse ${index + 1} comme correcte`}
                          className="size-4 shrink-0 accent-[#f5d547]"
                        />

                        <input
                          type="text"
                          value={answer}
                          onChange={(event) => {
                            const nextAnswers = [...answers];
                            nextAnswers[index] = event.target.value;
                            setAnswers(nextAnswers);
                          }}
                          placeholder={`Réponse ${index + 1}`}
                          maxLength={200}
                          aria-label={`Texte de la réponse ${index + 1}`}
                          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 p-3 text-sm outline-none focus:border-[#a78bfa]"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <div>
                <label
                  htmlFor="question-time"
                  className="mb-2 flex items-center gap-2 text-sm font-medium text-white/70"
                >
                  <Clock size={15} /> Temps (secondes)
                </label>
                <input
                  id="question-time"
                  type="number"
                  min={5}
                  max={300}
                  value={timeLimit}
                  onChange={(event) => setTimeLimit(Number(event.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm outline-none focus:border-[#a78bfa]"
                />
              </div>

              <div>
                <label
                  htmlFor="question-points"
                  className="mb-2 flex items-center gap-2 text-sm font-medium text-white/70"
                >
                  <Trophy size={15} /> Points
                </label>
                <input
                  id="question-points"
                  type="number"
                  min={0}
                  max={10000}
                  step={100}
                  value={points}
                  onChange={(event) => setPoints(Number(event.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm outline-none focus:border-[#a78bfa]"
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300"
                >
                  {error}
                </p>
              )}

              {success && (
                <p
                  role="status"
                  className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300"
                >
                  {success}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f5d547] px-4 py-3 font-bold text-[#201a32] transition hover:bg-[#ffe779] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Enregistrement..."
                  : editingQuestionId
                    ? "Enregistrer les modifications"
                    : "Enregistrer la question"}
              </button>
              {editingQuestionId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingQuestionId(null);
                    setTitle("");
                    setAnswers(["", "", "", ""]);
                    setCorrectAnswerId("a");
                    setExpectedAnswer("");
                    setError("");
                    setSuccess("");
                  }}
                  className="w-full rounded-xl border border-white/15 px-4 py-3 text-sm text-white/70 hover:bg-white/5"
                >
                  Annuler la modification
                </button>
              )}
            </form>
          </aside>
        </section>
      </div>
    </main>
  );
}
export default function QuizEditorPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#100d20] text-white">
          <p className="animate-pulse">Chargement de ton quiz...</p>
        </main>
      }
    >
      <QuizEditorContent />
    </Suspense>
  );
}
