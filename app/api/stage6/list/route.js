// ------------------------ SAME IMPORTS ------------------------
export const runtime = "nodejs";
export const preferredRegion = ["bom1"];
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AdminModel from "@/model/Admin";
import AuditLog from "@/model/AuditLog";
import CourseModel from "@/model/Courses";

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
    const reason = searchParams.get("reason");
    const location = searchParams.get("location");
    const city = searchParams.get("city");
    const assignedName = searchParams.get("assignedName");
    const assignedFrom = searchParams.get("assignedFrom");
    const userName = searchParams.get("userName");
    const showClosed = searchParams.get("showClosed");
    const branch = searchParams.get("branch");
    const studentName = searchParams.get("studentName");

    // ------------------------ FILTER BUILDING ------------------------
    const queryFilter = { defaultdata: "query" };

    if (referenceId) {
      const escapedReferenceId = escapeRegex(decodeURIComponent(referenceId));
      queryFilter.referenceid = { $regex: escapedReferenceId, $options: "i" };
    }

    if (suboption) queryFilter.suboption = { $regex: suboption, $options: "i" };

    // ---- SAME Reason Filter ----
    if (reason) {
      const validReasons = [
        "Wrong Lead Looking For Job",
        "interested_but_not_proper_response",
        "no_connected",
        "not_lifting",
        "busy",
        "not_interested",
        "wrong_no",
        "no_visit_branch_yet",
      ];

      const reasonArray = reason
        .split(",")
        .filter((r) => validReasons.includes(r));

      if (reasonArray.length > 0) {
        const matchingAuditLogs = await AuditLog.find({
          $or: [
            { connectedsubStatus: { $in: reasonArray } },
            { connectionStatus: { $in: reasonArray } },
            { onlinesubStatus: { $in: reasonArray } },
            { oflinesubStatus: { $in: reasonArray } },
            { ready_visit: { $in: reasonArray } },
            { not_liftingsubStatus: { $in: reasonArray } },
          ],
        });

        const matchingQueryIds = matchingAuditLogs.map((l) =>
          l.queryId.toString()
        );

        if (matchingQueryIds.length > 0) {
          queryFilter._id = { $in: matchingQueryIds };
        }
      }
    }

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
    // ---------------------------------------------------------
    const stageSixAuditLogs = await AuditLog.find({ stage: 6 }, { queryId: 1 });
    let stageSixQueryIds = [
      ...new Set(stageSixAuditLogs.map((l) => l.queryId?.toString())),
    ].filter(Boolean);

    if (stageSixQueryIds.length === 0) {
      return Response.json({
        success: true,
        fetch: [],
        courseStats: [],
        pagination: { total: 0, page, limit, totalPages: 1 },
      });
    }

    // ---------------------------------------------------------
    // ⭐ Filter by stage6UpdatedDate ONLY
    // ---------------------------------------------------------
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);

      const stage6Logs = await AuditLog.find({
        stage: 6,
        queryId: { $in: stageSixQueryIds },
      });

      const stage6DateMap = {};

      for (const log of stage6Logs) {
        if (!log.history || log.history.length === 0) continue;

        const latest = [...log.history].reverse().find(
          (h) => h.changes && h.changes.get("stage")?.newValue == 6
        );

        if (latest) stage6DateMap[log.queryId.toString()] = latest.actionDate;
      }

      stageSixQueryIds = stageSixQueryIds.filter((id) => {
        const dt = stage6DateMap[id];
        return dt && dt >= from && dt <= to;
      });

      if (stageSixQueryIds.length === 0) {
        return Response.json({
          success: true,
          fetch: [],
          courseStats: [],
          pagination: { total: 0, page, limit, totalPages: 1 },
        });
      }
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
          fetch: [],
          courseStats: [],
          pagination: { total: 0, page, limit, totalPages: 1 },
        });
      }
      queryFilter._id = { $in: stageSixQueryIds };
    } else {
      queryFilter._id = { $in: stageSixQueryIds };
    }

    // ------------------------ STAFF COURSE STATS ------------------------
    const staffCourseStats = await QueryModel.aggregate([
      {
        $match: {
          ...queryFilter,
          courseInterest: { $exists: true, $ne: null },
          _id: { $in: stageSixQueryIds },
          userid: { $exists: true, $ne: null },
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
      if (!acc[staffName]) acc[staffName] = [];
      acc[staffName].push({
        courseId: stat.courseId,
        courseName: stat.courseName,
        count: stat.count,
      });
      return acc;
    }, {});

    // ------------------------ FETCH PAGINATED QUERIES ------------------------
    const [queries, totalQueries] = await Promise.all([
      QueryModel.find(queryFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      QueryModel.countDocuments(queryFilter),
    ]);

    // ADMIN & COURSE MAPS
    const admins = await AdminModel.find({}, { _id: 1, name: 1 });
    const adminMap = Object.fromEntries(
      admins.map((a) => [a._id.toString(), a.name])
    );

    const auditLogs = await AuditLog.find({
      queryId: { $in: queries.map((q) => q._id) },
    });

    const courseIds = queries
      .map((q) => q.courseInterest)
      .filter(Boolean)
      .map((id) => id.toString());

    const courses =
      courseIds.length > 0
        ? await CourseModel.find(
            { _id: { $in: courseIds } },
            { _id: 1, course_name: 1 }
          )
        : [];

    const courseMap = Object.fromEntries(
      courses.map((c) => [c._id.toString(), c.course_name])
    );

    // AUDIT MAP
    const auditLogMap = auditLogs.reduce((map, log) => {
      const id = log.queryId.toString();
      if (!map[id]) {
        map[id] = { stage: log.stage, history: [], historyCount: 0 };
      }
      map[id].history.push(...(log.history || []));
      map[id].historyCount += (log.history || []).length;
      return map;
    }, {});

    const getStage6UpdatedDate = (auditHistory) => {
      if (!auditHistory || auditHistory.length === 0) return null;

      for (const h of [...auditHistory].reverse()) {
        if (h.changes && h.changes.get("stage")?.newValue == 6) {
          return h.actionDate || null;
        }
      }
      return null;
    };

    // FINAL FORMAT
    const formatted = queries.map((q) => {
      const audit = auditLogMap[q._id.toString()] || {};
      return {
        ...q._doc,
        userid: adminMap[q.userid?.toString()] || q.userid,
        assignedTo: adminMap[q.assignedTo?.toString()] || q.assignedTo,
        assignedsenthistory: (q.assignedsenthistory || []).map(
          (id) => adminMap[id?.toString()] || id
        ),
        assignedreceivedhistory: (q.assignedreceivedhistory || []).map(
          (id) => adminMap[id?.toString()] || id
        ),
        assignedToreq: adminMap[q.assignedToreq?.toString()] || q.assignedToreq,
        courseInterestName: courseMap[q.courseInterest?.toString()] || null,
        historyCount: audit.historyCount || 0,
        stage: audit.stage || 0,
        stage6UpdatedDate: getStage6UpdatedDate(audit.history),
      };
    });

    // ------------------------ FINAL RESPONSE (NO userBranchCounts here) ------------------------
    return Response.json({
      success: true,
      message: "All data fetched!",
      fetch: formatted,
      courseStats: Object.entries(courseStats).map(([staffName, courses]) => ({
        staffName,
        courses,
      })),
      pagination: {
        total: totalQueries,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(totalQueries / limit)),
      },
    });
  } catch (err) {
    return Response.json(
      { success: false, message: "Error!", error: err.message },
      { status: 500 }
    );
  }
};
