
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const router = useRouter();

  const [pin, setPin] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function joinGame(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(pin)) {
      setError("Le code PIN doit contenir 6 chiffres.");
      return;
    }

    if (nickname.trim().length < 2 || nickname.trim().length > 20) {
      setError("Ton pseudo doit contenir entre 2 et 20 caractères.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/games/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pin,
          nickname: nickname.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de rejoindre la partie.");
      }

      // Garde l'identifiant du joueur pour la prochaine étape.
      sessionStorage.setItem("quizpop_player_id", data.player.id);
      sessionStorage.setItem("quizpop_player_nickname", data.player.nickname);

      router.push(
        `/game/${data.game.id}?player=${encodeURIComponent(data.player.id)}`,
      );
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
    <main className="flex min-h-screen items-center justify-center bg-[#171323] px-5 py-12 text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-[#c4b5fd]">
            QuizPop
          </p>

          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            Prêt à jouer ?
          </h1>

          <p className="mt-3 text-white/60">
            Entre le code de la partie et choisis ton pseudo.
          </p>
        </div>

        <form
          onSubmit={joinGame}
          className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl sm:p-8"
        >
          <div>
            <label
              htmlFor="pin"
              className="mb-2 block text-sm font-semibold text-white/80"
            >
              Code PIN
            </label>

            <input
              id="pin"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={pin}
              onChange={(event) =>
                setPin(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="123456"
              required
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-4 text-center text-3xl font-black tracking-[0.35em] text-[#facc15] outline-none transition placeholder:text-white/20 focus:border-[#8b5cf6]"
            />
          </div>

          <div>
            <label
              htmlFor="nickname"
              className="mb-2 block text-sm font-semibold text-white/80"
            >
              Ton pseudo
            </label>

            <input
              id="nickname"
              type="text"
              autoComplete="nickname"
              minLength={2}
              maxLength={20}
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="Ex. SuperFab"
              required
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-[#8b5cf6]"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || pin.length !== 6 || nickname.trim().length < 2}
            className="w-full rounded-xl bg-[#8b5cf6] px-5 py-4 font-bold text-white transition hover:bg-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Connexion..." : "Rejoindre la partie"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-white/40">
          Aucun compte nécessaire. Juste ton pseudo et ton envie de jouer !
        </p>
      </div>
    </main>
  );
}