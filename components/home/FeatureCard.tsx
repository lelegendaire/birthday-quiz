import type { ReactNode } from "react";

type FeatureCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  color: "yellow" | "pink" | "turquoise";
};

const colors = {
  yellow: "bg-yellow-300 text-[#24133f]",
  pink: "bg-pink-400 text-[#24133f]",
  turquoise: "bg-teal-300 text-[#123b3a]",
};

export default function FeatureCard({
  icon,
  title,
  description,
  color,
}: FeatureCardProps) {
  return (
    <article className="group rounded-3xl border border-white/10 bg-white/4 p-5 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]">
      <div
        className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${colors[color]}`}
      >
        {icon}
      </div>

      <h3 className="mb-2 text-lg font-black">{title}</h3>

      <p className="text-sm leading-6 text-white/60">
        {description}
      </p>
    </article>
  );
}