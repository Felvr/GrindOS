"use client";

// Fire-and-forget engagement events. Uses sendBeacon so it doesn't block the UI
// and survives page unloads. Server logs them with the anon cookie id.
export type TrackEvent =
  | "app_open"
  | "tree_generated"
  | "focus_start"
  | "focus_complete"
  | "quiz_done"
  | "daily_open";

export function track(event: TrackEvent): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({ event });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* never break the app for analytics */
  }
}
