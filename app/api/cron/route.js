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

  if (
    authHeader !== process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const today = todayStart.toISOString().split("T")[0];

    

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
          { assignedTo: adminId }
        ]
      };

      const queries = await QueryModel.find(baseQuery)
        .select("_id deadline")
        .lean();

      const todayQueries = [];
      const pastDueQueries = [];

      for (const q of queries) {
        if (!q.deadline || q.deadline === "Not_Provided") continue;

        const d = parseDeadlineToDate(q.deadline);
        if (!d) continue;

        const dMid = new Date(d);
        dMid.setHours(0, 0, 0, 0);

        const tMid = new Date(todayStart);
        tMid.setHours(0, 0, 0, 0);

        if (dMid.getTime() === tMid.getTime()) {
          todayQueries.push(q._id);
        } else if (dMid < tMid) {
          pastDueQueries.push(q._id);
        }
      }

      await DailyTaskModel.findOneAndUpdate(
        { userId: admin._id, date: today },
        {
          $set: {
            'stats.todayQueries': todayQueries.length,
            'stats.pastDueQueries': pastDueQueries.length,
            branch: admin.branch || "default"
          },
          $addToSet: {
            todayQueries: { $each: todayQueries },
            pastDueQueries: { $each: pastDueQueries }
          }
        },
        { upsert: true }
      );

      results.push({
        adminId,
        adminName: admin.name,
        todayQueriesCount: todayQueries.length,
        pastDueQueriesCount: pastDueQueries.length
      });
    }

    return NextResponse.json({
      success: true,
      message: "Day closed successfully",
      closedAt: new Date(),
      results
    });

  } catch (error) {
    console.error("❌ Error closing day:", error);
    return NextResponse.json(
      { success: false, message: "Failed to close day", error: error.message },
      { status: 500 }
    );
  }
}
