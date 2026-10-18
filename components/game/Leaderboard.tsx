"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AnimatedNumber } from "./AnimatedNumber";

type LeaderboardPlayer = {
  id: string;
  nickname: string;
  score: number;
};

type LeaderboardProps = {
  players: LeaderboardPlayer[];
  highlightId?: string;
  limit?: number;
  /** Décalage du rang affiché (ex. 3 pour afficher à partir de la 4e place). */
  rankOffset?: number;
};

export function rankPlayers<T extends LeaderboardPlayer>(players: T[]): T[] {
  return [...players].sort(
    (a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname),
  );
}

const MEDALS = ["🥇", "🥈", "🥉"];

export function Leaderboard({
  players,
  highlightId,
  limit,
  rankOffset = 0,
}: LeaderboardProps) {
  const sorted = rankPlayers(players);
  const visible = limit ? sorted.slice(0, limit) : sorted;

  return (
    <ul className="space-y-2">
      <AnimatePresence initial={false}>
        {visible.map((player, index) => {
          const isMe = player.id === highlightId;

          return (
            <motion.li
              key={player.id}
              layout
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{
                layout: { type: "spring", stiffness: 420, damping: 32 },
                opacity: { duration: 0.2 },
              }}
              className={`flex items-center gap-3 rounded-2xl border p-3 ${
                isMe
                  ? "border-[#fde047]/60 bg-[#fde047]/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7c3aed]/25 font-black text-[#c4b5fd]">
                {MEDALS[index + rankOffset] ?? index + rankOffset + 1}
              </span>

              <span className="min-w-0 flex-1 truncate font-semibold">
                {player.nickname}
                {isMe && (
                  <span className="ml-2 text-xs font-bold text-[#fde047]">
                    toi
                  </span>
                )}
              </span>

              <span className="font-black text-[#fde047]">
                <AnimatedNumber value={player.score} />
              </span>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
