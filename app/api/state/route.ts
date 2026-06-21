import { NextResponse } from "next/server";

export const runtime = "nodejs";

// SCAFFOLD (not wired yet). Cross-device sync: the client persists its whole
// localStorage payload (index + grinds + profile) as one JSON blob per user.
// Future GET → return the saved blob for the authed user (from `user_state`).
export async function GET() {
  return NextResponse.json(
    { error: "not_implemented", message: "Синхронизация появится позже." },
    { status: 501 }
  );
}

// Future PUT → upsert the blob for the authed user; also denormalize weekly XP
// for leagues. See BACKEND.md.
export async function PUT() {
  return NextResponse.json(
    { error: "not_implemented", message: "Синхронизация появится позже." },
    { status: 501 }
  );
}
