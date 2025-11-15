export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AuditModel from "@/model/AuditLog";
import AdminModel from "@/model/Admin";

export async function GET(req) {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.max(1, Number(searchParams.get("limit")) || 10);

    const branch = searchParams.get("branch") || "All";
    const deadline = searchParams.get("deadline") || "All";
    const status = searchParams.get("status") || "All";

    // Base filter (non-deadline parts)
    let queryFilter = {
      demo: true,
      autoclosed: "open",
    };

    if (branch !== "All") {
      queryFilter.branch = branch;
    }

    if (status === "Enroll") queryFilter.addmission = true;
    if (status === "Pending") queryFilter.addmission = false;

    // Prepare finalMongoFilter. We'll attach deadline constraint to this.
    let finalMongoFilter = { ...queryFilter };

    // --------------------------
    // Deadline filter (IST boundaries, robust to string or Date field)
    // --------------------------
    if (deadline !== "All") {
      // IST offset minutes
      const IST_OFFSET_MINUTES = 5.5 * 60; // 330

      const now = new Date();

      // Convert now -> IST time
      const nowIST = new Date(now.getTime() + IST_OFFSET_MINUTES * 60 * 1000);

      // Start of today in IST
      const startTodayIST = new Date(nowIST);
      startTodayIST.setHours(0, 0, 0, 0);

      // Start of tomorrow/day after in IST
      const startTomorrowIST = new Date(startTodayIST);
      startTomorrowIST.setDate(startTomorrowIST.getDate() + 1);

      const startDayAfterIST = new Date(startTodayIST);
      startDayAfterIST.setDate(startDayAfterIST.getDate() + 2);

      // Convert IST midnights back to UTC Date objects for comparison
      const startTodayUTC = new Date(startTodayIST.getTime() - IST_OFFSET_MINUTES * 60 * 1000);
      const startTomorrowUTC = new Date(startTomorrowIST.getTime() - IST_OFFSET_MINUTES * 60 * 1000);
      const startDayAfterUTC = new Date(startDayAfterIST.getTime() - IST_OFFSET_MINUTES * 60 * 1000);

      // Build $expr comparison using $toDate so both string ISO and Date fields work.
      // We'll put an $expr into finalMongoFilter that compares the converted date.
      if (deadline === "Today") {
        finalMongoFilter.$expr = {
          $and: [
            { $gte: [{ $toDate: "$deadline" }, startTodayUTC] },
            { $lt: [{ $toDate: "$deadline" }, startTomorrowUTC] },
          ],
        };
      } else if (deadline === "Tomorrow") {
        finalMongoFilter.$expr = {
          $and: [
            { $gte: [{ $toDate: "$deadline" }, startTomorrowUTC] },
            { $lt: [{ $toDate: "$deadline" }, startDayAfterUTC] },
          ],
        };
      } else if (deadline === "Past") {
        finalMongoFilter.$expr = {
          $lt: [{ $toDate: "$deadline" }, startTodayUTC],
        };
      }
    }

    // --------------------------
    // COUNT matching documents
    // --------------------------
    const totalCount = await QueryModel.countDocuments(finalMongoFilter);

    // --------------------------
    // PAGINATION & FETCH
    // --------------------------
    const skip = (page - 1) * limit;
    const queries = await QueryModel.find(finalMongoFilter)
      .skip(skip)
      .limit(limit)
      .sort({ deadline: 1 });

    // --------------------------
    // AUDIT LOGS
    // --------------------------
    const queryIds = queries.map((q) => q._id.toString());
    const auditLogs = queryIds.length ? await AuditModel.find({ queryId: { $in: queryIds } }) : [];

    // --------------------------
    // ADMIN names
    // --------------------------
    const userIds = queries.map((q) => q.userid).filter(Boolean);
    const adminDetails = userIds.length
      ? await AdminModel.find({ _id: { $in: userIds } }).select("_id name")
      : [];

    const adminMap = adminDetails.reduce((acc, a) => {
      acc[a._id.toString()] = a.name;
      return acc;
    }, {});

    // --------------------------
    // Merge audit/admin info
    // --------------------------
    const finalData = queries.map((q) => {
      const qObj = q.toObject();
      const log = auditLogs.find((l) => l.queryId === qObj._id.toString());
      const stage6Entry = log?.history?.find((h) => String(h.stage) === "5");
      return {
        ...qObj,
        stage6Date: stage6Entry?.actionDate || null,
        staffName: adminMap[qObj.userid?.toString()] || null,
      };
    });

    return Response.json(
      {
        success: true,
        fetch: finalData,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        currentPage: page,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("demoserver GET error:", err);
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
