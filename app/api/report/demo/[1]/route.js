export const runtime = "nodejs";
export const preferredRegion = ["bom1"]; 
import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AuditModel from "@/model/AuditLog";
import AdminModel from "@/model/Admin";
import CourseModel from "@/model/Courses";
import mongoose from "mongoose";
const normalizeString = (value) => (value || "").toLowerCase();

export const GET = async (request) => {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const limitParam = parseInt(searchParams.get("limit") || "50", 10);
    const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limit = Number.isNaN(limitParam) || limitParam < 1 ? 50 : Math.min(limitParam, 200);
    const skip = (page - 1) * limit;

    const studentName = searchParams.get("studentName") || "";
    const phoneNumber = searchParams.get("phoneNumber") || "";
    const courseInterest = searchParams.get("courseInterest") || "";
    const assignedToFilter = searchParams.get("assignedTo") || "";
    const staffNameFilter = searchParams.get("staffName") || "";
    const branch = searchParams.get("branch") || "";
    const city = searchParams.get("city") || "";
    const enrollFilter = searchParams.get("enroll") || "";
    const totalFilter = searchParams.get("total") || "";
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const greaterThan0 = searchParams.get("greaterThan0") === "true";
    const referenceId = searchParams.get("referenceId") || "";
    const suboption = searchParams.get("suboption") || "";

    // Base queries
    const queries = await QueryModel.find({ demo: true, autoclosed: "open" });
    const queryIds = queries.map((query) => query._id.toString());
    

    // helper
    const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
    
    const adminIds = Array.from(
      new Set(
        queries
          .flatMap((query) => [query.userid, query.assignedTo])
          .filter((id) => isValidObjectId(id)) // REMOVE invalid IDs like "Not-Assigned"
          .map((id) => id.toString())
      )
    );
    

    const [auditLogs, adminDetails, courses] = await Promise.all([
      AuditModel.find({ queryId: { $in: queryIds } }),
      AdminModel.find({ _id: { $in: adminIds } }).select("_id name"),
      CourseModel.find({}, { _id: 1, course_name: 1 }),
    ]);

    const adminMap = adminDetails.reduce((map, admin) => {
      map[admin._id.toString()] = admin.name;
      return map;
    }, {});

    const courseNameMap = courses.reduce((map, course) => {
      map[course._id.toString()] = course.course_name;
      return map;
    }, {});

    const getRelevantDate = (query) => {
      if (query.fees && query.fees.length > 0 && query.fees[0]?.transactionDate) {
        const dt = new Date(query.fees[0].transactionDate);
        if (!Number.isNaN(dt.valueOf())) return dt;
      }
      if (query.stage6Date) {
        const dt = new Date(query.stage6Date);
        if (!Number.isNaN(dt.valueOf())) return dt;
      }
      if (query.createdAt) {
        const dt = new Date(query.createdAt);
        if (!Number.isNaN(dt.valueOf())) return dt;
      }
      return null;
    };

    const fromDateObj = fromDate ? new Date(fromDate) : null;
    const toDateObj = toDate ? new Date(toDate) : null;

    if (fromDateObj) {
      fromDateObj.setHours(0, 0, 0, 0);
    }
    if (toDateObj) {
      toDateObj.setHours(23, 59, 59, 999);
    }

    const filteredQueries = queries
      .map((query) => {
        const log = auditLogs.find((entry) => entry.queryId === query._id.toString());
        const stage6Entry = log?.history?.find((entry) => entry.stage === "5");
        return {
          ...query.toObject(),
          stage6Date: stage6Entry?.actionDate || null,
          staffName: adminMap[query.userid?.toString()] || query.staffName || null,
          assignedToName: adminMap[query.assignedTo?.toString()] || "",
          courseName: courseNameMap[query.courseInterest?.toString()] || "",
        };
      })
      .filter((query) => {
        const relevantDate = getRelevantDate(query);
        if (fromDateObj && (!relevantDate || relevantDate < fromDateObj)) {
          return false;
        }
        if (toDateObj && (!relevantDate || relevantDate > toDateObj)) {
          return false;
        }

        const queryTotal = parseFloat(query.total) || 0;
        if (greaterThan0 && !(queryTotal > 0)) {
          return false;
        }
        if (totalFilter) {
          const targetTotal = parseFloat(totalFilter);
          if (!Number.isNaN(targetTotal) && queryTotal !== targetTotal) {
            return false;
          }
        }

        if (referenceId && query.referenceid !== referenceId) {
          return false;
        }
        if (suboption && query.suboption !== suboption) {
          return false;
        }

        if (enrollFilter === "Enroll" && !query.addmission) {
          return false;
        }
        if (enrollFilter === "Not Enroll" && query.addmission) {
          return false;
        }

        const matchesString = (source, target) => {
          if (!target) return true;
          return normalizeString(source).includes(normalizeString(target));
        };

        return (
          matchesString(query.staffName, staffNameFilter) &&
          matchesString(query.studentName, studentName) &&
          matchesString(query.studentContact?.phoneNumber, phoneNumber) &&
          matchesString(query.courseName, courseInterest) &&
          matchesString(query.assignedToName, assignedToFilter) &&
          matchesString(query.branch, branch) &&
          matchesString(query.studentContact?.city, city)
        );
      })
      .sort((a, b) => {
        const dateA = getRelevantDate(a);
        const dateB = getRelevantDate(b);
        return (dateB ? dateB.getTime() : 0) - (dateA ? dateA.getTime() : 0);
      });

    const total = filteredQueries.length;
    const paginatedQueries = filteredQueries.slice(skip, skip + limit).map((query) => {
      const { assignedToName, courseName, ...rest } = query;
      return {
        ...rest,
        assignedToDisplay: assignedToName,
        courseNameDisplay: courseName,
      };
    });

    return Response.json(
      {
        message: "All data fetched!",
        success: true,
        fetch: paginatedQueries,
        pagination: {
          total,
          page,
          limit,
          totalPages: limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.log("Error on getting data list:", error);
    return Response.json(
      {
        message: "Error on getting data list!",
        success: false,
      },
      { status: 500 }
    );
  }
};
