import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request) {
  const authHeader = request.headers.get("authorization");

  console.log("🔎 AUTH HEADER RECEIVED:", authHeader);
  console.log("🔐 EXPECTED:", process.env.CRON_SECRET);

  if (
    authHeader !== process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("✅ CRON JOB AUTHORIZED & RUNNING");

  return NextResponse.json({ ok: true });
}
