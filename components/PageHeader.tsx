"use client";

import Link from "next/link";
import { NavLinks } from "./NavLinks";
import { ThemeMenu } from "./ThemeMenu";
import { XpChip } from "./XpChip";

export function PageHeader({ lifeXP }: { lifeXP: number }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="shrink-0 text-lg font-bold tracking-tight">
          Grind<span className="text-prog">OS</span>
        </Link>
        <div className="hidden md:block">
          <NavLinks />
        </div>
        <div className="flex items-center gap-2">
          <XpChip lifeXP={lifeXP} />
          <ThemeMenu />
        </div>
      </div>
      <div className="border-t border-slate-800/60 px-4 py-1.5 md:hidden">
        <NavLinks />
      </div>
    </header>
  );
}
