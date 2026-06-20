"use client";

import { Home, Map, Trophy, Layers } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Note: "Персонаж" (/character) is intentionally not here — it's reached by
// clicking the level chip (XpChip).
const LINKS = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/map", label: "Карта", icon: Map },
  { href: "/projects", label: "Проекты", icon: Layers },
  { href: "/rewards", label: "Награды", icon: Trophy },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition ${
              active
                ? "bg-slate-800 text-prog"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            }`}
          >
            <Icon size={15} />
            <span className="hidden sm:inline">{l.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
