"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

type CountdownRingProps = {
  /** ISO du lancement de la question (horloge serveur). */
  startedAt: string | null;
  /** Durée de la question en secondes. */
  timeLimit: number;
  /** Décalage serveur - client en ms, pour afficher le bon temps restant. */
  serverOffsetMs: number;
  /** Appelé une seule fois quand le chrono atteint zéro. */
  onExpire?: () => void;
};

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function colorFor(ratio: number) {
  if (ratio > 0.5) return "#2dd4bf";
  if (ratio > 0.25) return "#fde047";
  return "#fb7185";
}

export function CountdownRing({
  startedAt,
  timeLimit,
  serverOffsetMs,
  onExpire,
}: CountdownRingProps) {
  const totalMs = timeLimit * 1000;
  const [remainingMs, setRemainingMs] = useState(totalMs);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!startedAt) return;

    const start = new Date(startedAt).getTime();
    let frame = 0;
    let expired = false;

    const tick = () => {
      const left = Math.max(
        0,
        start + totalMs - (Date.now() + serverOffsetMs),
      );
      setRemainingMs(left);

      if (left <= 0) {
        if (!expired) {
          expired = true;
          onExpireRef.current?.();
        }
        return;
      }

      frame = requestAnimationFrame(tick);
    };

    tick();

    return () => cancelAnimationFrame(frame);
  }, [startedAt, totalMs, serverOffsetMs]);

  const ratio = Math.min(1, remainingMs / totalMs);
  const seconds = Math.ceil(remainingMs / 1000);
  const urgent = remainingMs > 0 && seconds <= 5;
  const color = colorFor(ratio);

  return (
    <motion.div
      className="relative h-24 w-24 shrink-0"
      animate={urgent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={
        urgent ? { duration: 1, repeat: Infinity, ease: "easeInOut" } : {}
      }
      role="timer"
      aria-label={`${seconds} secondes restantes`}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
          style={{ transition: "stroke 0.4s ease" }}
        />
      </svg>

      <span
        className="absolute inset-0 flex items-center justify-center text-3xl font-black tabular-nums"
        style={{ color }}
      >
        {seconds}
      </span>
    </motion.div>
  );
}
