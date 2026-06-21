import { NextResponse } from "next/server";

export const runtime = "nodejs";

// SCAFFOLD (not wired yet). Future: clear the session cookie. See BACKEND.md.
export async function POST() {
  return NextResponse.json(
    { error: "not_implemented", message: "Авторизация появится позже." },
    { status: 501 }
  );
}
