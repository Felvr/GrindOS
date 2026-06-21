"use client";

import { FocusProvider } from "@/lib/focus";
import { DailyPanel } from "./DailyPanel";
import { Footer } from "./Footer";
import { FocusTimer } from "./FocusTimer";
import { Guide } from "./Guide";

// Client-side providers mounted once at the layout level so the focus session
// survives route navigation and can render into a Picture-in-Picture window.
export function Providers({ children }: { children: React.ReactNode }) {
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
