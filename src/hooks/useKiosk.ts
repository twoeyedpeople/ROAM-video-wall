"use client";

import { useEffect, useState } from "react";

/**
 * Asks the display not to sleep. The kiosk's own power settings should already say so; this
 * covers the machine whose settings nobody checked. The lock is dropped whenever the page is
 * hidden, so it is asked for again on the way back.
 */
export function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let stopped = false;

    const request = async () => {
      if (stopped || document.visibilityState !== "visible" || !("wakeLock" in navigator)) return;
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        // Refused (battery saver, an insecure origin). The wall plays regardless.
      }
    };

    const onVisibility = () => void request();
    void request();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void lock?.release().catch(() => {});
    };
  }, []);
}

/** `?debug=1`: region outlines and the loop's state. Documented in CLAUDE.md, not on screen. */
export function useDebugFlag(): boolean {
  const [debug, setDebug] = useState(false);
  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).get("debug") === "1");
  }, []);
  return debug;
}
