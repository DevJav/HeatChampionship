"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

function useMediaQuery(media: string) {
  return useSyncExternalStore(
    (callback) => {
      const query = matchMedia(media);
      query.addEventListener("change", callback);
      return () => query.removeEventListener("change", callback);
    },
    () => matchMedia(media).matches,
    () => false,
  );
}

export const usePhone = () => useMediaQuery("(max-width: 639px)");

/** Below the desktop two-column layout: the recorder fits one screen instead */
export const useCompact = () => useMediaQuery("(max-width: 1023px)");

/** Squarer map on phones so the zoomed-in spaces are big enough to see */
export function usePhoneMapAspect() {
  return usePhone() ? 1 : undefined;
}

/** Width / height of an element, kept up to date; the map frame takes whatever space is left. */
export function useBoxAspect() {
  const [aspect, setAspect] = useState<number>();
  const ref = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      // Rounded so small layout shifts don't restart the zoom tween
      if (width > 0 && height > 0) setAspect(Math.round((width / height) * 50) / 50);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, aspect] as const;
}

const noSubscribe = () => () => {};

/** False during server rendering and hydration, true afterwards. */
export function useOnClient() {
  return useSyncExternalStore(noSubscribe, () => true, () => false);
}
