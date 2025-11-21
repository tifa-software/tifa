import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req) {
  // Authorization check (Required by Vercel Cron)
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized Tifa" }, { status: 401 });
  }

  // ⭐ Your scheduled task logic here
  console.log("Cron job executed automatically at 2:46 PM");

  return NextResponse.json({ ok: true, time: "2:46 PM job executed" });
}
