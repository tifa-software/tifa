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
    const reason = searchParams.get("reason");
    const location = searchParams.get("location");
    const city = searchParams.get("city");
    const assignedName = searchParams.get("assignedName");
    const assignedFrom = searchParams.get("assignedFrom");
    const userName = searchParams.get("userName");
    const showClosed = searchParams.get("showClosed");
    const branch = searchParams.get("branch");
    const studentName = searchParams.get("studentName");

    // ------------------------ SAME FILTER LOGIC ------------------------
    const queryFilter = { defaultdata: "query" };

    if (referenceId) {
      const escapedReferenceId = escapeRegex(decodeURIComponent(referenceId));
      queryFilter.referenceid = { $regex: escapedReferenceId, $options: "i" };
    }

    if (suboption) queryFilter.suboption = { $regex: suboption, $options: "i" };

    // ---- SAME reason filter ----
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

    // ❌ REMOVE createdAt filter because stage6 filtering must control date
    // (old code for createdAt removed)

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
        pagination: { total: 0, page, limit, totalPages: 1 },
      });
    }

    // ---------------------------------------------------------
    // ⭐ FILTER BY stage6UpdatedDate (ONLY THIS)
    // ---------------------------------------------------------
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);

      const stage6Logs = await AuditLog.find({
        stage: 6,
        queryId: { $in: stageSixQueryIds }
      });

      const stage6DateMap = {};

      for (const log of stage6Logs) {
        if (!log.history || log.history.length === 0) continue;

        const latest = [...log.history].reverse().find(h =>
          h.changes && h.changes.get("stage")?.newValue == 6
        );

        if (latest) stage6DateMap[log.queryId.toString()] = latest.actionDate;
      }

      stageSixQueryIds = stageSixQueryIds.filter(id => {
        const dt = stage6DateMap[id];
        return dt && dt >= from && dt <= to;
      });

      if (stageSixQueryIds.length === 0) {
        return Response.json({
          success: true,
          fetch: [],
          pagination: { total: 0, page, limit, totalPages: 1 },
        });
      }
    }

    // ---------------------------------------------------------
    // Merge stage6 IDs with existing filters
    // ---------------------------------------------------------
    if (queryFilter._id?.$in) {
      const existing = new Set(queryFilter._id.$in.map(x => x.toString()));
      stageSixQueryIds = stageSixQueryIds.filter(id => existing.has(id));
      if (stageSixQueryIds.length === 0) {
        return Response.json({
          success: true,
          fetch: [],
          pagination: { total: 0, page, limit, totalPages: 1 },
        });
      }
      queryFilter._id = { $in: stageSixQueryIds };
    } else {
      queryFilter._id = { $in: stageSixQueryIds };
    }

    // ------------------------ SAME FETCH ------------------------
    const [queries, totalQueries] = await Promise.all([
      QueryModel.find(queryFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      QueryModel.countDocuments(queryFilter),
    ]);

    const admins = await AdminModel.find({}, { _id: 1, name: 1 });
    const adminMap = Object.fromEntries(
      admins.map((a) => [a._id.toString(), a.name])
    );

    const auditLogs = await AuditLog.find({
      queryId: { $in: queries.map((q) => q._id) },
    });

    // ----------------------- GROUP AUDIT BY QUERY -----------------------
    const auditLogMap = auditLogs.reduce((map, log) => {
      const id = log.queryId.toString();
      if (!map[id]) {
        map[id] = {
          stage: log.stage,
          history: [],
          historyCount: 0,
        };
      }

      map[id].history.push(...log.history);
      map[id].historyCount += log.history.length;

      return map;
    }, {});

    // ---------------------------------------------------------
    //  Get stage6 updated date for final output
    // ---------------------------------------------------------
    const getStage6UpdatedDate = (auditHistory) => {
      if (!auditHistory || auditHistory.length === 0) return null;

      for (const h of [...auditHistory].reverse()) {
        if (
          h.changes &&
          h.changes.get("stage")?.newValue == 6
        ) {
          return h.actionDate || null;
        }
      }
      return null;
    };

    // ----------------------- FORMAT FINAL RESPONSE -----------------------
    const formatted = queries.map((q) => {
      const audit = auditLogMap[q._id.toString()] || {};

      return {
        ...q._doc,
        userid: adminMap[q.userid] || q.userid,
        assignedTo: adminMap[q.assignedTo] || q.assignedTo,
        assignedsenthistory: q.assignedsenthistory.map(
          (id) => adminMap[id] || id
        ),
        assignedreceivedhistory: q.assignedreceivedhistory.map(
          (id) => adminMap[id] || id
        ),
        assignedToreq: adminMap[q.assignedToreq] || q.assignedToreq,

        historyCount: audit.historyCount || 0,
        stage: audit.stage || 0,

        // ⭐ THIS DATE IS WHAT USER WANTS
        stage6UpdatedDate: getStage6UpdatedDate(audit.history),
      };
    });

    return Response.json({
      success: true,
      message: "All data fetched!",
      fetch: formatted,
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
      { success: false, message: "Error on getting data list!" },
      { status: 500 }
    );
  }
};
