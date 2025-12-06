export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AuditModel from "@/model/AuditLog";
import AdminModel from "@/model/Admin";
import CourseModel from "@/model/Courses";
import ReferenceModel from "@/model/Reference";
import mongoose from "mongoose";

/**
 * Helper utils
 */
const sanitizeId = (value) => {
  if (!value) return null;
  return /^[0-9a-fA-F]{24}$/.test(value) ? value : null;
};

const normalizeStringForRegex = (value) => {
  if (!value) return null;
  // escape regex special chars
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i");
};

export const GET = async (request) => {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);

    // Pagination params
    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const limitParam = parseInt(searchParams.get("limit") || "50", 10);
    const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limit = Number.isNaN(limitParam) || limitParam < 1 ? 50 : Math.min(limitParam, 200);
    const skip = (page - 1) * limit;

    // Filters (raw)
    const studentName = (searchParams.get("studentName") || "").trim();
    const phoneNumber = (searchParams.get("phoneNumber") || "").trim();
    const staffId = sanitizeId(searchParams.get("staffId"));
    const zeroFilter = searchParams.get("zeroFilter");

    const courseId = sanitizeId(searchParams.get("courseId"));
    const assignedToId = sanitizeId(searchParams.get("assignedToId"));
    const branch = (searchParams.get("branch") || "").trim();
    const city = (searchParams.get("city") || "").trim();
    const finalFees = searchParams.get("finalFees");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const referenceId = (searchParams.get("referenceId") || "").trim();
    const suboption = (searchParams.get("suboption") || "").trim();
    const franchise = searchParams.get("franchise");
    let adminFilter = {};

    if (franchise === "1") {
      // Exclude admins that are franchise staff
      adminFilter.franchisestaff = "1";
    } else {
      // Normal mode → exclude franchise staff
      adminFilter.franchisestaff = { $ne: "1" };
    }
    // Build MongoDB filter (do as much as possible in DB)
    const mongoFilter = {
      demo: true,
      autoclosed: "open",
    };

    if (staffId) mongoFilter.userid = staffId;
    if (zeroFilter === "0") {
      mongoFilter.total = { $in: [0, null] };
    }
    if (courseId) mongoFilter.courseInterest = courseId;
    if (assignedToId) mongoFilter.assignedTo = assignedToId;

    if (studentName) {
      mongoFilter.studentName = normalizeStringForRegex(studentName);
    }
    if (phoneNumber) {
      mongoFilter["studentContact.phoneNumber"] = normalizeStringForRegex(phoneNumber);
    }
    if (branch) {
      mongoFilter.branch = normalizeStringForRegex(branch);
    }
    if (city) {
      mongoFilter["studentContact.city"] = normalizeStringForRegex(city);
    }
    if (referenceId) {
      mongoFilter.referenceid = referenceId;
    }
    if (suboption) {
      mongoFilter.suboption = suboption;
    }
    // finalFees exact match filter
    if (finalFees) {
      const parsed = Number(finalFees);
      if (!Number.isNaN(parsed)) {
        mongoFilter.finalfees = parsed;
      }
    }
    if (branch) {
      const normalizedBranch = normalizeStringForRegex(branch);

      if (franchise === "1") {
        // Franchise mode → selected branch MUST be franchise branch
        mongoFilter.$and = [
          { branch: normalizedBranch },
          { branch: { $regex: /\(Franchise\)$/i } }
        ];
      } else {
        // Normal mode → selected branch MUST NOT be franchise branch
        mongoFilter.$and = [
          { branch: normalizedBranch },
          { branch: { $not: /\(Franchise\)$/i } }
        ];
      }
    } else {
      if (franchise === "1") {
        // Franchise mode + NO branch selected → only Franchise branches
        mongoFilter.branch = { $regex: /\(Franchise\)$/i };
      } else {
        // Normal mode + NO branch selected → exclude Franchise branches
        mongoFilter.branch = { $not: /\(Franchise\)$/i };
      }
    }
    // Date filtering: we cannot easily filter by "derived demo date" (because demo date is stored in audit logs),
    // so we filter by createdAt or fee transaction date as a reasonable approximation.
    // This will accept queries whose createdAt or any fees.transactionDate falls into the window.
    const fromDateObj = fromDate ? new Date(fromDate) : null;
    const toDateObj = toDate ? new Date(toDate) : null;
    if (fromDateObj && toDateObj) {
      fromDateObj.setHours(0, 0, 0, 0);
      toDateObj.setHours(23, 59, 59, 999);

      // Use $or to match either createdAt or fees.transactionDate range
      mongoFilter.$or = [
        { createdAt: { $gte: fromDateObj, $lte: toDateObj } },
        { "fees.transactionDate": { $gte: fromDateObj.toISOString(), $lte: toDateObj.toISOString() } },
      ];
    } else if (fromDateObj) {
      fromDateObj.setHours(0, 0, 0, 0);
      mongoFilter.$or = [
        { createdAt: { $gte: fromDateObj } },
        { "fees.transactionDate": { $gte: fromDateObj.toISOString() } },
      ];
    } else if (toDateObj) {
      toDateObj.setHours(23, 59, 59, 999);
      mongoFilter.$or = [
        { createdAt: { $lte: toDateObj } },
        { "fees.transactionDate": { $lte: toDateObj.toISOString() } },
      ];
    }

    // Get total count (fast because it's server side and uses indexes)
    const total = await QueryModel.countDocuments(mongoFilter);

    // Fetch only paginated queries (lean for performance)
    const queries = await QueryModel.find(mongoFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // If no queries, still return dropdown data
    const queryIds = queries.map((q) => q._id.toString());

    // Load audit logs only for this page
    const auditLogs = queryIds.length
      ? await AuditModel.find({ queryId: { $in: queryIds } }).lean()
      : [];

    // Admins: fetch admins required for this page (for mapping names) + also fetch all admins for dropdown
    const pageAdminIds = Array.from(
      new Set(
        queries.flatMap((q) => [q.userid, q.assignedTo]).filter((id) => mongoose.Types.ObjectId.isValid(id))
      )
    );

    const adminDetailsForPage = pageAdminIds.length
      ? await AdminModel.find({ _id: { $in: pageAdminIds }, ...adminFilter, }).select("_id name").lean()
      : [];

    // Fetch all admins for dropdown (small payload). If huge, consider paginating in frontend.
    const allAdmins = await AdminModel.find(adminFilter).select("_id name").lean();

    // Courses: fetch required courses for paginated queries + all courses for dropdown
    const pageCourseIds = Array.from(
      new Set(queries.map((q) => q.courseInterest).filter((id) => mongoose.Types.ObjectId.isValid(id)))
    );

    const courseDocsForPage = pageCourseIds.length
      ? await CourseModel.find({ _id: { $in: pageCourseIds } }).select("_id course_name fees enrollpercent").lean()
      : [];

    const allCourses = await CourseModel.find().select("_id course_name fees enrollpercent").lean();

    // References for dropdown
    const allReferences = await ReferenceModel.find().lean();

    // Build quick maps for mapping in-memory
    const adminMap = {};
    adminDetailsForPage.forEach((a) => {
      adminMap[a._id.toString()] = a.name;
    });

    // Also map allAdmins for dropdown mapping in frontend (we returned allAdmins)
    const allAdminsResponse = allAdmins.map((a) => ({ _id: a._id, name: a.name }));

    const courseMap = {};
    courseDocsForPage.forEach((c) => {
      courseMap[c._id.toString()] = {
        name: c.course_name,
        fees: c.fees,
        enrollpercent: c.enrollpercent,
      };
    });

    // Map audit logs by queryId for quick lookup
    const auditLogMap = {};
    auditLogs.forEach((log) => {
      // Keep the most relevant entry (for your previous logic you used log.history.find)
      // We'll store the whole log for now; mapping will find demo entries in history below.
      auditLogMap[log.queryId.toString()] = log;
    });

    // Helper to get admin name (fallback to "Not Assigned")
    const getAdminName = (id) => {
      if (!id) return "Not Assigned";
      if (!/^[0-9a-fA-F]{24}$/.test(id)) return "Not Assigned";
      return adminMap[id] || "Not Assigned";
    };

    // Helper to compute the "most relevant date" (same logic as before but only for paginated queries)
    const getRelevantDate = (query, auditLog) => {
      // 1) demo entry date in audit log (history)
      if (auditLog && Array.isArray(auditLog.history)) {
        // find first history entry where oflinesubStatus === "demo" OR changes.demo === true
        const found = auditLog.history.find((h) => {
          try {
            return (
              (h.oflinesubStatus && String(h.oflinesubStatus).toLowerCase() === "demo") ||
              (h.changes && (h.changes.demo === true || String(h.changes.demo).toLowerCase() === "true"))
            );
          } catch (e) {
            return false;
          }
        });
        if (found && found.actionDate) {
          const dt = new Date(found.actionDate);
          if (!Number.isNaN(dt.valueOf())) return dt;
        }
      }

      // 2) demoupdatedate (if present on query)
      if (query.demoupdatedate) {
        const dt = new Date(query.demoupdatedate);
        if (!Number.isNaN(dt.valueOf())) return dt;
      }

      // 3) First fee transaction date (earliest)
      if (Array.isArray(query.fees) && query.fees.length > 0) {
        const validDates = query.fees
          .map((f) => (f && f.transactionDate ? new Date(f.transactionDate) : null))
          .filter((d) => d && !Number.isNaN(d.valueOf()));
        if (validDates.length > 0) {
          const min = new Date(Math.min(...validDates.map((d) => d.getTime())));
          return min;
        }
      }

      // 4) createdAt fallback
      if (query.createdAt) {
        const dt = new Date(query.createdAt);
        if (!Number.isNaN(dt.valueOf())) return dt;
      }

      return null;
    };

    // Build final mapped queries to send to frontend
    const mapped = queries.map((queryObj) => {
      const q = queryObj; // lean result
      const auditLog = auditLogMap[q._id.toString()];

      // Find demoEntry (if any) from auditLog history - mimic previous logic
      let demoEntry = null;
      if (auditLog && Array.isArray(auditLog.history)) {
        demoEntry =
          auditLog.history.find(
            (entry) =>
              (entry.oflinesubStatus && String(entry.oflinesubStatus).toLowerCase() === "demo") ||
              (entry.changes && (entry.changes.demo === true || String(entry.changes.demo).toLowerCase() === "true"))
          ) || null;
      }

      const courseData = courseMap[q.courseInterest?.toString()] || null;

      // Calculate totalFees using course fees and enrollpercent if possible
      let totalFees = null;
      if (courseData?.fees && courseData?.enrollpercent) {
        const courseFees = parseFloat(courseData.fees) || 0;
        const enrollPercent = parseFloat(courseData.enrollpercent) || 0;
        totalFees = (courseFees * enrollPercent) / 100;
      } else if (q.finalfees != null) {
        totalFees = q.finalfees;
      }

      const finalFeesUsed =
        q.finalfees === 0 || q.finalfees == null ? (courseData?.fees ? parseFloat(courseData.fees) : null) : q.finalfees;

      const remainingFees =
        totalFees != null && q.total != null ? Number(totalFees) - Number(q.total) : null;

      // Derive demodate similarly to your earlier code
      let demodate = null;
      if (demoEntry?.actionDate) {
        demodate = demoEntry.actionDate;
      } else if (Array.isArray(q.fees) && q.fees.length > 0) {
        // Use earliest fee date
        const sortedFees = [...q.fees].sort((a, b) => {
          const dateA = a.transactionDate ? new Date(a.transactionDate).getTime() : Infinity;
          const dateB = b.transactionDate ? new Date(b.transactionDate).getTime() : Infinity;
          return dateA - dateB;
        });
        const firstFee = sortedFees[0];
        if (firstFee?.transactionDate) demodate = firstFee.transactionDate;
      } else if (q.createdAt) {
        demodate = q.createdAt;
      }

      return {
        ...q,
        courseName: courseData?.name || "Not_Provided",
        totalFees,
        finalFeesUsed,
        remainingFees,
        staffName: getAdminName(q.userid),
        assignedToName: getAdminName(q.assignedTo),
        demoupdatedate: demoEntry?.actionDate || null,
        demodate,
      };
    });

    // Build allCourses response (for dropdowns)
    const allCoursesResponse = allCourses.map((c) => ({
      _id: c._id,
      course_name: c.course_name,
      fees: c.fees,
      enrollpercent: c.enrollpercent,
    }));

    return Response.json(
      {
        message: "Demo data fetched successfully",
        success: true,
        fetch: mapped,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
        allAdmins: allAdminsResponse,
        allCourses: allCoursesResponse,
        allReferences,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error on getting data list:", error);
    return Response.json(
      {
        message: "Error on getting data list!",
        success: false,
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
};
