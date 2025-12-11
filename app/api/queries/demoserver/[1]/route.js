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

    // ------------------------------------
    // BASE FILTER (same for all counts)
    // ------------------------------------
    let baseFilter = {
      demo: true,
      autoclosed: "open",
    };

    if (branch !== "All") baseFilter.branch = branch;

    if (status === "Enroll") baseFilter.addmission = true;
    if (status === "Pending") baseFilter.addmission = false;

    // Apply deadline filtering later using $expr
    let finalMongoFilter = { ...baseFilter };

    // ------------------------------------
    // DEADLINE FILTER
    // ------------------------------------
    if (deadline !== "All") {
      const IST_OFFSET_MINUTES = 5.5 * 60;

      const now = new Date();
      const nowIST = new Date(now.getTime() + IST_OFFSET_MINUTES * 60 * 1000);

      const startTodayIST = new Date(nowIST);
      startTodayIST.setHours(0, 0, 0, 0);

      const startTomorrowIST = new Date(startTodayIST);
      startTomorrowIST.setDate(startTomorrowIST.getDate() + 1);

      const startDayAfterIST = new Date(startTodayIST);
      startDayAfterIST.setDate(startDayAfterIST.getDate() + 2);

      const startTodayUTC = new Date(startTodayIST.getTime() - IST_OFFSET_MINUTES * 60 * 1000);
      const startTomorrowUTC = new Date(startTomorrowIST.getTime() - IST_OFFSET_MINUTES * 60 * 1000);
      const startDayAfterUTC = new Date(startDayAfterIST.getTime() - IST_OFFSET_MINUTES * 60 * 1000);

      if (deadline === "Today") {
        finalMongoFilter.$expr = {
          $and: [
            { $gte: [{ $toDate: "$deadline" }, startTodayUTC] },
            { $lt: [{ $toDate: "$deadline" }, startTomorrowUTC] },
          ],
        };
      }

      if (deadline === "Tomorrow") {
        finalMongoFilter.$expr = {
          $and: [
            { $gte: [{ $toDate: "$deadline" }, startTomorrowUTC] },
            { $lt: [{ $toDate: "$deadline" }, startDayAfterUTC] },
          ],
        };
      }

      if (deadline === "Past") {
        finalMongoFilter.$expr = {
          $lt: [{ $toDate: "$deadline" }, startTodayUTC],
        };
      }
    }

    // ------------------------------------
    // ALL COUNTS based ONLY on finalMongoFilter
    // ------------------------------------

    // Total filtered results
    const totalCount = await QueryModel.countDocuments(finalMongoFilter);

    // total === 0
    const totalZeroCount = await QueryModel.countDocuments({
      ...finalMongoFilter,
      total: 0,
    });

    // total > 0
    const totalGreaterCount = await QueryModel.countDocuments({
      ...finalMongoFilter,
      total: { $gt: 0 },
    });

    // Enrolled count (based on filter)
    const totalEnroll = await QueryModel.countDocuments({
      ...finalMongoFilter,
      addmission: true,
    });
    const totalTrash = await QueryModel.countDocuments({
       ...finalMongoFilter,
      autoclosed: "close",
    });

    // Pending count (based on filter)
    const totalPending = await QueryModel.countDocuments({
      ...finalMongoFilter,
      addmission: false,
    });

    // Branch-wise (based on filter)
    const branchCountsAgg = await QueryModel.aggregate([
      { $match: finalMongoFilter },
      {
        $group: {
          _id: "$branch",
          total: { $sum: 1 },
        },
      },
    ]);

    const branchWiseCounts = {};
    branchCountsAgg.forEach((b) => {
      branchWiseCounts[b._id] = b.total;
    });

    // Selected branch total (filtered)
    const totalBranchQueries =
      branch !== "All" ? branchWiseCounts[branch] || 0 : null;

    // ------------------------------------
    // PAGINATION RESULTS
    // ------------------------------------
    const skip = (page - 1) * limit;

    const queries = await QueryModel.find(finalMongoFilter)
      .skip(skip)
      .limit(limit)
      .sort({ deadline: 1 });

    // ------------------------------------
    // AUDIT + ADMIN MERGE
    // ------------------------------------
    const queryIds = queries.map((q) => q._id.toString());
    const auditLogs = queryIds.length
      ? await AuditModel.find({ queryId: { $in: queryIds } })
      : [];

    const userIds = queries.map((q) => q.userid).filter(Boolean);
    const adminList = userIds.length
      ? await AdminModel.find({ _id: { $in: userIds } }).select("_id name")
      : [];

    const adminMap = adminList.reduce((acc, a) => {
      acc[a._id.toString()] = a.name;
      return acc;
    }, {});

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

    // ------------------------------------
    // RESPONSE
    // ------------------------------------
    return Response.json(
      {
        success: true,
        fetch: finalData,

        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        currentPage: page,
        totalTrash,
        totalEnroll,
        totalZeroCount,
        totalGreaterCount,
        totalPending,
        branchWiseCounts,
        totalBranchQueries,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("demo GET error:", err);
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
