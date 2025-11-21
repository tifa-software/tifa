import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";

// Make sure your models are imported
// import QueryModel from "@/model/Query";

export const runtime = "nodejs";

export async function GET(request) {
  // 1. Validate the cron secret
  const authHeader = request.headers.get("authorization");

  if (
    authHeader !== process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Connect Database
  await dbConnect();

  try {
    // 3. Your task logic here
    // Example:
    // const result = await QueryModel.find({ addmission: true });

    console.log("CRON JOB RUN SUCCESSFULLY");

    return NextResponse.json({
      success: true,
      message: "Cron job executed successfully",
      // data: result,
    });
  } catch (error) {
    console.error("CRON ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Cron job failed", error: String(error) },
      { status: 500 }
    );
  }
}
