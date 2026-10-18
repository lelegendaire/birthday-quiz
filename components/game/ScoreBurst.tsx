"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";

type ScoreBurstProps = {
  total: number;
  bonus: number;
  isCorrect?: boolean | null;
};

const COLORS = ["#fde047", "#2dd4bf", "#fb7185", "#c4b5fd", "#ffffff"];
const PARTICLES = 20;

export function ScoreBurst({ total, bonus,isCorrect = true, }: ScoreBurstProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.4, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 18 }}
      className="relative mt-6 overflow-visible rounded-2xl border border-[#fde047]/30 bg-[#fde047]/10 p-5 text-center"
    >
      {/* Confettis : trajectoires déterministes pour rester pures au rendu. */}
      <div className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden>
        {Array.from({ length: PARTICLES }, (_, i) => {
          const angle = (i / PARTICLES) * Math.PI * 2;
          const distance = 90 + (i % 4) * 22;

          return (
            <motion.span
              key={i}
              className="absolute block h-2 w-2 rounded-sm"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
              animate={{
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance + 24,
                opacity: 0,
                scale: 0.4,
                rotate: 180 + i * 25,
              }}
              transition={{ duration: 1.1, ease: "easeOut" }}
            />
          );
        })}
      </div>

      <motion.p
        className="text-5xl font-black text-[#fde047]"
        initial={{ scale: 0.6 }}
        animate={{ scale: [0.6, 1.25, 1] }}
        transition={{ duration: 0.5 }}
      >
        +{total}
      </motion.p>

      <p className="mt-1 text-sm font-semibold text-white/70">
         {isCorrect
    ? "Bonne réponse !"
    : "Tu marques quand même des points !"}
      </p>

      {bonus > 0 && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#2dd4bf]/15 px-3 py-1 text-sm font-bold text-[#2dd4bf]"
        >
          <Zap size={14} />
          dont +{bonus} de bonus de rapidité
        </motion.p>
      )}
    </motion.div>
  );
}
