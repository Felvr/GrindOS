import { NextResponse } from "next/server";

export const runtime = "nodejs";

// SCAFFOLD (not wired yet). Future: create a `users` row (bcrypt hash of the
// password), then issue a session JWT like /api/auth/login. See BACKEND.md.
export async function POST() {
  return NextResponse.json(
    { error: "not_implemented", message: "Регистрация появится позже." },
    { status: 501 }
  );
}
