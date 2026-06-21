"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";
import { FocusProvider } from "@/lib/focus";
import { DailyPanel } from "./DailyPanel";
import { Footer } from "./Footer";
import { FocusTimer } from "./FocusTimer";
import { Guide } from "./Guide";

// Client-side providers mounted once at the layout level so the focus session
// survives route navigation and can render into a Picture-in-Picture window.
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    track("app_open");
  }, []);

  return (
    <FocusProvider>
      <div className="flex min-h-screen flex-col">
        <div className="flex-1">{children}</div>
        <Footer />
      </div>
      <FocusTimer />
      <Guide />
      <DailyPanel />
    </FocusProvider>
  );
}
