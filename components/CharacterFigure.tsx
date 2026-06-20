"use client";

// A friendly, original stylized "vault dweller" figure, themed via CSS vars.
export function CharacterFigure({ level }: { level: number }) {
  return (
    <svg
      viewBox="0 0 170 240"
      className="h-60 w-auto"
      role="img"
      aria-label="Персонаж"
    >
      <defs>
        <linearGradient id="suit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--prog) / 0.35)" />
          <stop offset="100%" stopColor="rgb(var(--prog) / 0.12)" />
        </linearGradient>
      </defs>

      {/* soft ground shadow */}
      <ellipse cx="85" cy="226" rx="46" ry="7" fill="rgb(var(--prog) / 0.10)" />

      <g stroke="rgb(var(--prog))" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        {/* legs + boots */}
        <path d="M70 168 v34" fill="none" />
        <path d="M100 168 v34" fill="none" />
        <path d="M60 202 h20 v12 h-20 z" fill="url(#suit)" />
        <path d="M90 202 h20 v12 h-20 z" fill="url(#suit)" />

        {/* arms */}
        <path d="M52 110 q-16 22 -12 50" fill="none" />
        <path d="M118 110 q16 22 12 50" fill="none" />
        <circle cx="40" cy="162" r="6" fill="url(#suit)" />
        <circle cx="130" cy="162" r="6" fill="url(#suit)" />

        {/* torso / jumpsuit */}
        <path
          d="M56 104 q29 -16 58 0 q6 4 5 12 l-7 52 q-26 10 -54 0 l-7 -52 q-1 -8 5 -12 z"
          fill="url(#suit)"
        />
        {/* zipper + collar */}
        <path d="M85 96 v66" fill="none" strokeWidth="2" />
        <path d="M70 100 l15 -8 l15 8" fill="none" strokeWidth="2.5" />
        {/* belt */}
        <path d="M62 150 h46" fill="none" strokeWidth="4" stroke="rgb(var(--loot))" />
        <rect x="80" y="146" width="10" height="9" rx="2" fill="rgb(var(--loot) / 0.25)" stroke="rgb(var(--loot))" strokeWidth="2" />

        {/* neck */}
        <path d="M78 86 v8 M92 86 v8" fill="none" strokeWidth="2.5" />

        {/* head */}
        <circle cx="85" cy="58" r="26" fill="rgb(var(--prog) / 0.10)" />
        {/* hair tuft */}
        <path d="M62 50 q8 -26 46 -18 q-6 6 -16 6 q6 4 2 10 q-18 -12 -32 2 z" fill="rgb(var(--prog) / 0.35)" strokeWidth="2" />
        {/* ear */}
        <circle cx="60" cy="60" r="4" fill="rgb(var(--prog) / 0.10)" strokeWidth="2" />
        {/* eyes */}
        <circle cx="77" cy="56" r="3" fill="rgb(var(--prog))" stroke="none" />
        <circle cx="93" cy="56" r="3" fill="rgb(var(--prog))" stroke="none" />
        {/* smile */}
        <path d="M75 68 q10 9 20 0" fill="none" strokeWidth="2.5" />
      </g>

      {/* level badge */}
      <g>
        <circle cx="138" cy="40" r="19" fill="rgb(var(--loot) / 0.14)" stroke="rgb(var(--loot))" strokeWidth="2.5" />
        <text x="138" y="46" textAnchor="middle" className="fill-loot font-mono text-[16px] font-bold">
          {level}
        </text>
      </g>
    </svg>
  );
}
