export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AdminModel from "@/model/Admin";
import AuditLog from "@/model/AuditLog";

const escapeRegex = (string) => {
  return string.replace(/[.*+?^=!:${}()|\[\]\/\\]/g, "\\$&");
};

export const GET = async (request) => {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);

    // SAME PARAMETERS
    const referenceId = searchParams.get("referenceId");
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

    const queryFilter = { defaultdata: "query" };

    if (referenceId) {
      const escapedReferenceId = escapeRegex(decodeURIComponent(referenceId));
      queryFilter.referenceid = { $regex: escapedReferenceId, $options: "i" };
    }

    if (suboption) queryFilter.suboption = { $regex: suboption, $options: "i" };

    // Reason filtering SAME AS API 1
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

        const matchingIds = matchingAuditLogs.map((l) => l.queryId.toString());
        if (matchingIds.length > 0) queryFilter._id = { $in: matchingIds };
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

    // -------- FILTER TO ONLY stage 6 --------
    const stageSixAuditLogs = await AuditLog.find({ stage: 6 }, { queryId: 1 });
    let stageSixQueryIds = [
      ...new Set(stageSixAuditLogs.map((l) => l.queryId?.toString())),
    ].filter(Boolean);

    if (stageSixQueryIds.length === 0)
      return Response.json({ success: true, userBranchCounts: {} });

    // DATE FILTER (same as API 1)
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);

      const stage6Logs = await AuditLog.find({
        stage: 6,
        queryId: { $in: stageSixQueryIds },
      });

      const stage6Map = {};
      for (const log of stage6Logs) {
        if (!log.history) continue;

        const latest = [...log.history].reverse().find(
          (h) => h.changes?.get("stage")?.newValue == 6
        );
        if (latest) stage6Map[log.queryId.toString()] = latest.actionDate;
      }

      stageSixQueryIds = stageSixQueryIds.filter(
        (id) => stage6Map[id] && stage6Map[id] >= from && stage6Map[id] <= to
      );

      if (stageSixQueryIds.length === 0)
        return Response.json({ success: true, userBranchCounts: {} });
    }

    if (queryFilter._id?.$in) {
      const existing = new Set(queryFilter._id.$in.map((i) => i.toString()));
      stageSixQueryIds = stageSixQueryIds.filter((id) => existing.has(id));
      if (!stageSixQueryIds.length)
        return Response.json({ success: true, userBranchCounts: {} });

      queryFilter._id = { $in: stageSixQueryIds };
    } else {
      queryFilter._id = { $in: stageSixQueryIds };
    }

    // -------- FETCH MATCHING QUERIES (NO PAGINATION) --------
    const allMatchingQueries = await QueryModel.find(
      { ...queryFilter },
      {
        _id: 1,
        userid: 1,
        branch: 1,
        referenceid: 1,
        suboption: 1,
        studentContact: 1,
        studentName: 1,
      }
    );

    // ADMIN MAP
    const admins = await AdminModel.find({}, { _id: 1, name: 1 });
    const adminMap = Object.fromEntries(
      admins.map((a) => [a._id.toString(), a.name])
    );

    // Add missing admins
    const allUserIds = [...new Set(allMatchingQueries.map((q) => q.userid?.toString()))];
    const missing = allUserIds.filter((id) => !adminMap[id]);

    if (missing.length > 0) {
      const missingAdmins = await AdminModel.find(
        { _id: { $in: missing } },
        { _id: 1, name: 1 }
      );

      missingAdmins.forEach((a) => {
        adminMap[a._id.toString()] = a.name;
      });
    }

    // -------- BUILD userBranchCounts --------
    const userBranchCounts = {};

    for (const q of allMatchingQueries) {
      const staffName = adminMap[q.userid?.toString()] || "Unassigned";
      const branchName = q.branch || "No Branch";

      if (!userBranchCounts[staffName])
        userBranchCounts[staffName] = {};

      if (!userBranchCounts[staffName][branchName])
        userBranchCounts[staffName][branchName] = {
          count: 0,
          queries: [],
        };

      userBranchCounts[staffName][branchName].count++;

      userBranchCounts[staffName][branchName].queries.push({
        _id: q._id,
        referenceid: q.referenceid,
        suboption: q.suboption,
        studentName: q.studentName,
        studentContact: q.studentContact,
      });
    }

    return Response.json({
      success: true,
      userBranchCounts,
    });
  } catch (err) {
    return Response.json(
      { success: false, message: "Error!", error: err.message },
      { status: 500 }
    );
  }
};
