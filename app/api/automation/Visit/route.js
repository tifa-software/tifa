export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import { NextResponse } from "next/server";

export const GET = async () => {
  await dbConnect();

  try {
    // Current time in IST
    const now = new Date();
    const istNow = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    // Start of Today (IST)
    const startOfDayIST = new Date(istNow);
    startOfDayIST.setHours(0, 0, 0, 0);

    // End of Today (IST)
    const endOfDayIST = new Date(istNow);
    endOfDayIST.setHours(23, 59, 59, 999);

    // Convert to ISO (DB uses UTC format)
    const startISO = new Date(
      startOfDayIST.getTime() - startOfDayIST.getTimezoneOffset() * 60000
    ).toISOString();

    const endISO = new Date(
      endOfDayIST.getTime() - endOfDayIST.getTimezoneOffset() * 60000
    ).toISOString();

    // Fetch Today's Deadline Records
    const todaysQueries = await QueryModel.find({
      deadline: {
        $ne: "Not_Provided",
        $gte: startISO,
        $lte: endISO,
      },
      autoclosed:"open",
      addmission: false,
      
    }).select(
      "name mobile deadline studentContact.phoneNumber studentContact.whatsappNumber studentContact.address studentContact.city"
    );

    return NextResponse.json({
      success: true,
      message: "Today's deadline data fetched successfully",
      totalCount: todaysQueries.length,   // 🔥 Total Count Added
      data: todaysQueries,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error while fetching today's deadlines",
        error: error.message,
      },
      { status: 500 }
    );
  }
};
