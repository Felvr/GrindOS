import { NextResponse } from "next/server";

export const runtime = "nodejs";

// SCAFFOLD (not wired yet). Future: verify username+password against the `users`
// table (bcrypt), sign a JWT, set it as an httpOnly cookie. See BACKEND.md.
export async function POST() {
  return NextResponse.json(
    { error: "not_implemented", message: "Авторизация появится позже." },
    { status: 501 }
  );
}
