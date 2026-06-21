import { NextResponse } from "next/server";

export const runtime = "nodejs";

// SCAFFOLD (not wired yet). Future: read+verify the session JWT cookie and
// return the current user ({ id, username }) or 401. See BACKEND.md.
export async function GET() {
  return NextResponse.json(
    { error: "not_implemented", message: "Авторизация появится позже." },
    { status: 501 }
  );
}
