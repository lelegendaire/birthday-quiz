import {
  Trophy,
  Image,
  Zap,
  Users,
  Gamepad2,
  Sparkles,
} from "lucide-react";

import Hero from "@/components/home/Hero";
import FeatureCard from "@/components/home/FeatureCard";
import CreatedGames from "@/components/ui/CreatedGames";
const features = [
  {
    icon: <Trophy size={24} />,
    title: "Un classement en direct",
    description:
      "Chaque réponse compte. Grimpe au classement et vise le podium final.",
    color: "yellow" as const,
  },
  {
    icon: <Image size={24} />,
    title: "Photos et souvenirs",
    description:
      "Devine qui se cache sur une photo, complète une anecdote ou reconnais une citation.",
    color: "pink" as const,
  },
  {
    icon: <Zap size={24} />,
    title: "Des modes variés",
    description:
      "QCM, réponses libres, estimation, ordre chronologique et mini-défis.",
    color: "turquoise" as const,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <Hero />
<CreatedGames />
      <section className="border-t border-white/10 bg-black/10 px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 max-w-2xl">
            <p className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-teal-300">
              Bien plus qu'un QCM
            </p>

            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
              La compétition,
              <span className="text-violet-300"> version anniversaire.</span>
            </h2>

            <p className="mt-5 leading-7 text-white/60">
              Des formats différents, des retournements de situation et
              juste ce qu'il faut de mauvaise foi pour rendre la soirée
              mémorable.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-3xl border border-violet-300/15 bg-violet-500/10 p-6 sm:flex-row sm:items-center sm:p-8">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-yellow-300">
                <Sparkles size={17} />
                À TOI DE JOUER
              </div>
              <h3 className="text-2xl font-black">
                Prêt à lancer les hostilités ?
              </h3>
              <p className="mt-2 text-sm text-white/60">
                La prochaine étape : créer ta première partie.
              </p>
            </div>

            <a
              href="/host"
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-violet-500 px-6 font-bold transition hover:bg-violet-400"
            >
              <Gamepad2 size={19} />
              Créer une partie
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8 text-center text-sm text-white/40">
        QuizPop · Fait pour jouer ensemble
      </footer>
    </main>
  );
}