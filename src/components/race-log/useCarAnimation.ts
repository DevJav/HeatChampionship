"use client";

import { useEffect, useRef, useState } from "react";
import type { Positions } from "@/lib/race-log/rounds";

const STAGGER_MS = 160;
const BASE_MS = 260;
const PER_SPACE_MS = 28;
const MAX_MS = 900;

/**
 * Moves cars from where they are drawn to `positions`, one after another in
 * `order` (turn order), so a round plays back the way it happened at the table.
 */
export function useCarAnimation(positions: Positions, order: string[]) {
  const [shown, setShown] = useState(positions);
  const current = useRef(positions);
  const key = JSON.stringify(positions);

  useEffect(() => {
    const from = current.current;
    const ids = Object.keys(positions);
    const rank = new Map(order.map((id, i) => [id, i]));
    const plans = ids.map((id) => {
      const a = from[id] ?? positions[id];
      const b = positions[id];
      const distance = Math.abs(b.pos - a.pos);
      return {
        id,
        a,
        b,
        delay: (rank.get(id) ?? ids.length) * STAGGER_MS,
        duration: distance === 0 && a.spot === b.spot ? 0 : Math.min(MAX_MS, BASE_MS + distance * PER_SPACE_MS),
      };
    });

    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      let running = false;
      const next: Positions = {};
      for (const { id, a, b, delay, duration } of plans) {
        const t = duration === 0 ? 1 : Math.min(1, Math.max(0, (now - start - delay) / duration));
        if (t < 1) running = true;
        const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        next[id] = { pos: a.pos + (b.pos - a.pos) * ease, spot: a.spot + (b.spot - a.spot) * ease };
      }
      current.current = next;
      setShown(next);
      if (running) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return shown;
}
