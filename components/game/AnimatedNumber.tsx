"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

export function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const controls = animate(previous.current, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });

    previous.current = value;

    return () => controls.stop();
  }, [value]);

  return <span className="tabular-nums">{display}</span>;
}
