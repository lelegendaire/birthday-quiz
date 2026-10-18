"use client";

import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";
import { rankPlayers } from "./Leaderboard";

type PodiumPlayer = {
  id: string;
  nickname: string;
  score: number;
};

// Ordre d'affichage : 2e, 1er, 3e. Le 1er est au centre et le plus haut.
const SLOTS = [
  { rank: 1, height: "h-28", color: "#c0c8d8", delay: 0.6 },
  { rank: 0, height: "h-40", color: "#fde047", delay: 1.2 },
  { rank: 2, height: "h-20", color: "#e0955a", delay: 0.0 },
];

export function Podium({ players }: { players: PodiumPlayer[] }) {
  const sorted = rankPlayers(players);

  return (
    <div className="mx-auto flex max-w-md items-end justify-center gap-3">
      {SLOTS.map(({ rank, height, color, delay }) => {
        const player = sorted[rank];

        if (!player) return <div key={rank} className="w-1/3" />;

        return (
          <div key={rank} className="flex w-1/3 flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delay + 0.5, type: "spring", stiffness: 300, damping: 16 }}
              className="mb-2 text-center"
            >
              {rank === 0 && (
                <motion.div
                  animate={{ rotate: [-8, 8, -8] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="mb-1 flex justify-center text-[#fde047]"
                >
                  <Trophy size={30} />
                </motion.div>
              )}
              <p className="max-w-full truncate text-sm font-bold">
                {player.nickname}
              </p>
              <p className="text-sm font-black" style={{ color }}>
                <AnimatedNumber value={player.score} />
              </p>
            </motion.div>

            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{ originY: 1, backgroundColor: color }}
              className={`flex w-full items-start justify-center rounded-t-2xl pt-2 text-2xl font-black text-[#130b2b] ${height}`}
            >
              {rank + 1}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
