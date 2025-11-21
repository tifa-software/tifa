import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AdminModel from "@/model/Admin";
import DailyTaskModel from "@/model/DailyTaskModel";

export const runtime = "nodejs";

const parseDeadlineToDate = (deadlineStr) => {
  if (!deadlineStr || deadlineStr === "Not_Provided") return null;

  const tryIso = new Date(deadlineStr);
  if (!isNaN(tryIso.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(deadlineStr)) {
    return new Date(tryIso.getFullYear(), tryIso.getMonth(), tryIso.getDate());
  }

  const ddmmyyyy = /^(\d{2})-(\d{2})-(\d{4})$/;
  const ddmmyy = /^(\d{2})-(\d{2})-(\d{2})$/;

  let m;
  if ((m = deadlineStr.match(ddmmyyyy))) {
    const [_, dd, mm, yyyy] = m;
    return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
  }
  if ((m = deadlineStr.match(ddmmyy))) {
    const [_, dd, mm, yy] = m;
    const yyyy = 2000 + parseInt(yy);
    return new Date(yyyy, parseInt(mm) - 1, parseInt(dd));
  }

  const alt = new Date(deadlineStr);
  if (!isNaN(alt.getTime())) {
    return new Date(alt.getFullYear(), alt.getMonth(), alt.getDate());
  }

  return null;
};

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

  // ---------------------------
  //   MAIN LOGIC STARTS HERE
  // ---------------------------

  try {
    await dbConnect();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const admins = await AdminModel.find({ status: true })
      .select("_id name branch")
      .lean();

    const results = [];

    for (const admin of admins) {
      const adminId = admin._id.toString();

      const baseQuery = {
        autoclosed: "open",
        addmission: false,
        demo: false,
        $or: [
          { userid: adminId, assignedTo: "Not-Assigned" },
          { assignedTo: adminId },
        ],
      };

      const queries = await QueryModel.find(baseQuery)
        .select("_id deadline")
        .lean();

      let todayQueries = [];
      let pastDueQueries = [];

      for (const query of queries) {
        if (!query.deadline || query.deadline === "Not_Provided") continue;

        const deadlineDate = parseDeadlineToDate(query.deadline);
        if (!deadlineDate) continue;

        const queryDate = new Date(deadlineDate);
        queryDate.setHours(0, 0, 0, 0);

        const today = new Date(todayStart);
        today.setHours(0, 0, 0, 0);

        if (queryDate.getTime() === today.getTime()) {
          todayQueries.push(query._id.toString());
        } else if (queryDate < today) {
          pastDueQueries.push(query._id.toString());
        }
      }

      const today = new Date().toISOString().split("T")[0];

      await DailyTaskModel.findOneAndUpdate(
        {
          userId: admin._id,
          date: today,
        },
        {
          $set: {
            userId: admin._id,
            date: today,
            "stats.todayQueries": todayQueries.length,
            "stats.pastDueQueries": pastDueQueries.length,
            "stats.pendingToday": todayQueries.length,
            "stats.pendingPastDue": pastDueQueries.length,
            branch: admin.branch || "default",
          },
          $addToSet: {
            todayQueries: { $each: todayQueries },
            pastDueQueries: { $each: pastDueQueries },
            pendingTodayQueries: { $each: todayQueries },
            pendingPastDueQueries: { $each: pastDueQueries },
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      results.push({
        adminId,
        adminName: admin.name || "Unknown",
        todayQueriesCount: todayQueries.length,
        pastDueQueriesCount: pastDueQueries.length,
        totalAssigned: todayQueries.length + pastDueQueries.length,
        todayQueries,
        pastDueQueries,
      });
    }

    results.sort((a, b) => b.totalAssigned - a.totalAssigned);

    const totalToday = results.reduce((s, r) => s + r.todayQueriesCount, 0);
    const totalPastDue = results.reduce((s, r) => s + r.pastDueQueriesCount, 0);

    return NextResponse.json({
      success: true,
      date: todayStart.toISOString().split("T")[0],
      totalAdmins: results.length,
      stats: {
        totalTodayQueries: totalToday,
        totalPastDueQueries: totalPastDue,
        totalAssigned: totalToday + totalPastDue,
      },
      admins: results,
    });
  } catch (error) {
    console.error("Error in today-queries CRON API:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to compute today's queries",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
