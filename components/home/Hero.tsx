"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Gamepad2, Sparkles, Users } from "lucide-react";

export default function Hero() {
  const [pin, setPin] = useState("");
  const router = useRouter();

  function joinGame(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pin.length !== 6) return;

    router.push(`/join/${pin}`);
  }

  return (
    <section className="relative overflow-hidden px-5 pb-20 pt-10 sm:px-8 sm:pb-28 sm:pt-16">
      <div className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-[100px]" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-violet-500/20 blur-[100px]" />

      <div className="relative mx-auto max-w-6xl">
        <header className="mb-20 flex items-center justify-between sm:mb-28">
          <a href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 shadow-lg shadow-violet-600/30">
              <Gamepad2 size={25} />
            </span>
            <span className="text-xl font-black tracking-tight">
              Quiz<span className="text-yellow-300">Pop</span>
            </span>
          </a>

          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 sm:flex">
            <Users size={16} className="text-teal-300" />
            Le fun se partage
          </div>
        </header>

        <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-4 py-2 text-sm font-semibold text-violet-200">
              <Sparkles size={16} className="text-yellow-300" />
              Ta soirée. Tes règles. Ton quiz.
            </div>

            <h1 className="max-w-3xl text-5xl font-black leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
              Qui connaît
              <br />
              vraiment
              <br />
              <span className="relative inline-block text-yellow-300">
                ses amis
                <svg
                  className="absolute -bottom-3 left-0 w-full"
                  viewBox="0 0 240 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 9C65 2 163 2 236 8"
                    stroke="#FB7185"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span> ?</span>
            </h1>

            <p className="mt-8 max-w-xl text-base leading-7 text-white/65 sm:text-lg">
              Des questions improbables, des souvenirs gênants, des défis
              et une compétition sans pitié. Crée ton quiz d'anniversaire
              et découvre qui mérite vraiment la première place.
            </p>

            <form
              onSubmit={joinGame}
              className="mt-9 flex max-w-xl flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-3 sm:flex-row"
            >
              <label className="flex min-w-0 flex-1 flex-col gap-2 px-3 py-1">
                <span className="text-xs font-bold uppercase tracking-widest text-white/50">
                  Tu as un code de partie ?
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={pin}
                  onChange={(event) =>
                    setPin(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000 000"
                  aria-label="Code de la partie à six chiffres"
                  className="w-full bg-transparent text-2xl font-black tracking-[0.2em] text-white outline-none placeholder:text-white/20"
                />
              </label>

              <button
                type="submit"
                disabled={pin.length !== 6}
                className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-yellow-300 px-6 font-black text-[#24133f] transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Rejoindre
                <ArrowRight size={19} />
              </button>
            </form>

            <p className="mt-4 text-sm text-white/40">
              Aucun compte nécessaire pour rejoindre une partie.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -right-3 top-8 rotate-12 rounded-2xl bg-pink-400 px-4 py-3 font-black text-[#24133f] shadow-xl sm:-right-5">
              C'EST PARTI !
            </div>

            <div className="-rotate-2 rounded-4xl border border-white/15 bg-linear-to-br from-violet-500/30 to-fuchsia-500/10 p-5 shadow-2xl shadow-violet-950/40 sm:p-7">
              <div className="mb-6 flex items-center justify-between">
                <span className="text-sm font-bold text-white/60">
                  EXEMPLE DE PARTIE
                </span>
                <span className="flex items-center gap-2 rounded-full bg-teal-300/10 px-3 py-1 text-xs font-bold text-teal-200">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-teal-300" />
                  LIVE
                </span>
              </div>

              <div className="rounded-3xl bg-[#211344] p-6 text-center sm:p-8">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-300 text-3xl">
                  🎉
                </div>

                <p className="text-sm font-semibold text-violet-200">
                  QUESTION 01
                </p>

                <h2 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">
                  Qui est le plus susceptible d'arriver en retard ?
                </h2>

                <div className="mt-7 grid grid-cols-2 gap-3 text-left">
                  <div className="rounded-2xl bg-pink-400 p-4 font-bold text-[#24133f]">
                    <span className="mb-3 block text-2xl">🕐</span>
                    Lucas
                  </div>
                  <div className="rounded-2xl bg-teal-300 p-4 font-bold text-[#123b3a]">
                    <span className="mb-3 block text-2xl">🏃</span>
                    Emma
                  </div>
                  <div className="rounded-2xl bg-yellow-300 p-4 font-bold text-[#24133f]">
                    <span className="mb-3 block text-2xl">😴</span>
                    Hugo
                  </div>
                  <div className="rounded-2xl bg-violet-300 p-4 font-bold text-[#24133f]">
                    <span className="mb-3 block text-2xl">🚀</span>
                    Léa
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-2 rotate-[-8deg] rounded-2xl bg-teal-300 px-4 py-3 font-black text-[#123b3a] shadow-xl sm:-left-7">
              + 1000 POINTS
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}