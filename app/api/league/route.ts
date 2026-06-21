import { NextResponse } from "next/server";

export const runtime = "nodejs";

// SCAFFOLD (not wired yet). Weekly leagues across real users: rank by weekly XP
// within a league group; on week rollover promote top‑3 / demote bottom‑3.
// Future GET → return the caller's current group standings. See BACKEND.md.
export async function GET() {
  return NextResponse.json(
    { error: "not_implemented", message: "Лиги появятся позже." },
    { status: 501 }
  );
}
