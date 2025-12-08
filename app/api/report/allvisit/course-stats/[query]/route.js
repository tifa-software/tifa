// ------------------------ SAME IMPORTS ------------------------
export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AdminModel from "@/model/Admin";
import AuditLog from "@/model/AuditLog";

const escapeRegex = (string) => {
  return string.replace(/[.*+?^=!:${}()|\[\]\/\\]/g, "\\$&");
};

// ------------------------ API START ------------------------
export const GET = async (request) => {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);

    // ------------------------ SAME PARAMETERS ------------------------
    const referenceId = searchParams.get("referenceId");
    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const limitParam = parseInt(searchParams.get("limit") || "50", 10);

    const page = pageParam > 0 ? pageParam : 1;
    const limit = limitParam > 0 ? Math.min(limitParam, 200) : 50;

    const skip = (page - 1) * limit;

    const suboption = searchParams.get("suboption");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const admission = searchParams.get("admission");
    const grade = searchParams.get("grade");
    const location = searchParams.get("location");
    const city = searchParams.get("city");
    const assignedName = searchParams.get("assignedName");
    const assignedFrom = searchParams.get("assignedFrom");
    const userName = searchParams.get("userName");
    const showClosed = searchParams.get("showClosed");
    const branch = searchParams.get("branch");
    const studentName = searchParams.get("studentName");

    // ------------------------ SAME FILTER LOGIC ------------------------
    const queryFilter = {
      defaultdata: "query",
      branch: { $not: /\(Franchise\)$/i },
    };

    if (referenceId) {
      const escapedReferenceId = escapeRegex(decodeURIComponent(referenceId));
      queryFilter.referenceid = { $regex: escapedReferenceId, $options: "i" };
    }

    if (suboption) queryFilter.suboption = { $regex: suboption, $options: "i" };

    // ❌ createdAt filter removed – stage6 date controls the range

    if (admission) queryFilter.addmission = admission === "true";
    if (grade) queryFilter.lastgrade = { $regex: grade, $options: "i" };
    if (location) queryFilter.branch = { $regex: location, $options: "i" };

    if (studentName) {
      queryFilter.$or = [
        { studentName: { $exists: false } },
        { studentName: "" },
      ];
    }

    if (city) {
      if (city === "Not_Provided") {
        queryFilter["studentContact.city"] = "Not_Provided";
      } else if (city.toLowerCase() === "jaipur") {
        queryFilter["studentContact.city"] = { $regex: "^Jaipur$", $options: "i" };
      } else {
        queryFilter["studentContact.city"] = { $ne: "Jaipur" };
      }
    }

    if (assignedName) {
      if (assignedName === "Not-Assigned") {
        queryFilter.assignedTo = "Not-Assigned";
      } else {
        const admin = await AdminModel.findOne({
          name: { $regex: assignedName, $options: "i" },
        });
        if (admin) queryFilter.assignedTo = admin._id;
      }
    }

    if (assignedFrom) {
      if (assignedFrom === "Not-Assigned") {
        queryFilter.assignedsenthistory = { $in: [""] };
      } else {
        const admin = await AdminModel.findOne({
          name: { $regex: assignedFrom, $options: "i" },
        });
        if (admin) {
          queryFilter.assignedsenthistory = { $in: [admin._id.toString()] };
        }
      }
    }

    if (userName) {
      const admin = await AdminModel.findOne({
        name: { $regex: userName, $options: "i" },
      });
      if (admin) queryFilter.userid = admin._id;
    }

    if (showClosed === "close") queryFilter.autoclosed = "close";
    if (branch) queryFilter.branch = branch;

    // ---------------------------------------------------------
    //  ✔ ONLY STAGE 6
    //  Default to current month when fromDate/toDate not provided.
    // ---------------------------------------------------------
    let stageSixQueryIds = [];

    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    const effectiveFrom = fromDate ? new Date(fromDate) : defaultFrom;
    const effectiveTo = toDate ? new Date(toDate) : new Date();
    effectiveTo.setHours(23, 59, 59, 999);

    // Narrow to logs that have stage 6 transitions in range
    const stage6Logs = await AuditLog.find(
      {
        stage: 6,
        history: {
          $elemMatch: {
            actionDate: { $gte: effectiveFrom, $lte: effectiveTo },
            "changes.stage.newValue": 6,
          },
        },
      },
      { queryId: 1, history: 1 }
    );

    const stage6DateMap = {};

    for (const log of stage6Logs) {
      if (!log.history || log.history.length === 0) continue;

      const latest = [...log.history].reverse().find((h) =>
        h.changes && h.changes.get("stage")?.newValue == 6
      );

      if (latest) stage6DateMap[log.queryId.toString()] = latest.actionDate;
    }

    stageSixQueryIds = Object.entries(stage6DateMap)
      .filter(([, dt]) => dt && dt >= effectiveFrom && dt <= effectiveTo)
      .map(([id]) => id);

    if (stageSixQueryIds.length === 0) {
      return Response.json({
        success: true,
        message: "No data for given filters",
        courseStats: [],
        userBranchCounts: {},
        pagination: { total: 0, page, limit, totalPages: 1 },
      });
    }

    // ---------------------------------------------------------
    // Merge stage6 IDs with existing filters
    // ---------------------------------------------------------
    if (queryFilter._id?.$in) {
      const existing = new Set(queryFilter._id.$in.map((x) => x.toString()));
      stageSixQueryIds = stageSixQueryIds.filter((id) => existing.has(id));
      if (stageSixQueryIds.length === 0) {
        return Response.json({
          success: true,
          message: "No data after combining filters",
          courseStats: [],
          userBranchCounts: {},
          pagination: { total: 0, page, limit, totalPages: 1 },
        });
      }
      queryFilter._id = { $in: stageSixQueryIds };
    } else {
      queryFilter._id = { $in: stageSixQueryIds };
    }

    // ---------------------------------------------------------
    // Staff-wise course query counts (same aggregation as before)
    // ---------------------------------------------------------
    const staffCourseStats = await QueryModel.aggregate([
      {
        $match: {
          ...queryFilter,
          courseInterest: { $exists: true, $ne: null },
          _id: { $in: stageSixQueryIds },
          userid: { $exists: true, $ne: null }, // Ensure userid exists
        },
      },
      {
        $lookup: {
          from: "course2s",
          localField: "courseInterest",
          foreignField: "_id",
          as: "courseInfo",
        },
      },
      { $unwind: "$courseInfo" },
      {
        $lookup: {
          from: "admins",
          localField: "userid",
          foreignField: "_id",
          as: "staffInfo",
        },
      },
      { $unwind: "$staffInfo" },
      {
        $group: {
          _id: {
            staffId: "$userid",
            staffName: "$staffInfo.name",
            courseId: "$courseInfo._id",
            courseName: "$courseInfo.course_name",
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          staffId: "$_id.staffId",
          staffName: "$_id.staffName",
          courseId: "$_id.courseId",
          courseName: "$_id.courseName",
          count: 1,
        },
      },
      { $sort: { staffName: 1, count: -1 } },
    ]);

    const courseStats = staffCourseStats.reduce((acc, stat) => {
      const staffName = stat.staffName || "Unassigned";
      if (!acc[staffName]) {
        acc[staffName] = [];
      }
      acc[staffName].push({
        courseId: stat.courseId,
        courseName: stat.courseName,
        count: stat.count,
      });
      return acc;
    }, {});

    // ---------------------------------------------------------
    // Pagination counts (no need to fetch paginated list)
    // ---------------------------------------------------------
    const totalQueries = await QueryModel.countDocuments(queryFilter);

    // Get admins map
    const admins = await AdminModel.find({}, { _id: 1, name: 1 });
    const adminMap = Object.fromEntries(
      admins.map((a) => [a._id.toString(), a.name])
    );

    // ---------------------------------------------------------
    //  NEW: USER-LEVEL BRANCH COUNTS (NO PAGINATION, ONLY COUNTING)
    // ---------------------------------------------------------
    const allMatchingQueries = await QueryModel.find(
      { ...queryFilter },
      {
        _id: 1,
        userid: 1,
        branch: 1,
      }
    );

    // Ensure adminMap has all users present (add missing admins)
    const allUserIds = [
      ...new Set(
        allMatchingQueries
          .map((q) => q.userid)
          .filter(Boolean)
          .map((id) => id.toString())
      ),
    ];

    if (allUserIds.length > 0) {
      const missingAdminIds = allUserIds.filter((id) => !adminMap[id]);
      if (missingAdminIds.length > 0) {
        const missingAdmins = await AdminModel.find(
          { _id: { $in: missingAdminIds } },
          { _id: 1, name: 1 }
        );
        for (const a of missingAdmins) {
          adminMap[a._id.toString()] = a.name;
        }
      }
    }

    // Build the userBranchCounts object (staff x branch) with ONLY counts
    const userBranchCounts = {};

    for (const q of allMatchingQueries) {
      const staffName = adminMap[q.userid?.toString()] || "Unassigned";
      const branchName = q.branch || "No Branch";

      if (!userBranchCounts[staffName]) {
        userBranchCounts[staffName] = {};
      }

      if (!userBranchCounts[staffName][branchName]) {
        userBranchCounts[staffName][branchName] = {
          count: 0,
        };
      }

      // Only increment count – no detailed query list
      userBranchCounts[staffName][branchName].count++;
    }

    // ---------------------------------------------------------
    // Final response (NO fetch / NO detailed list)
    // ---------------------------------------------------------
    return Response.json({
      success: true,
      message: "All data fetched!",
      courseStats: Object.entries(courseStats).map(
        ([staffName, courses]) => ({
          staffName,
          courses: courses.map((c) => ({
            courseId: c.courseId,
            courseName: c.courseName,
            count: c.count,
          })),
        })
      ),
      userBranchCounts, // ✅ only counts
      pagination: {
        total: totalQueries,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(totalQueries / limit)),
      },
    });
  } catch (err) {
    console.log("Error:", err);
    return Response.json(
      {
        success: false,
        message: "Error on getting data list!",
        error: err?.message,
      },
      { status: 500 }
    );
  }
};
