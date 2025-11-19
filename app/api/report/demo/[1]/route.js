export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AuditModel from "@/model/AuditLog";
import AdminModel from "@/model/Admin";
import CourseModel from "@/model/Courses";
import ReferenceModel from "@/model/Reference";
import mongoose from "mongoose";

const normalizeString = (value) => (value || "").toLowerCase();

const sanitizeId = (value) => {
    if (!value) return null;
    return /^[0-9a-fA-F]{24}$/.test(value) ? value : null;
};

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
        const staffId = sanitizeId(searchParams.get("staffId"));
        const courseId = sanitizeId(searchParams.get("courseId"));
        const assignedToId = sanitizeId(searchParams.get("assignedToId"));
        const branch = searchParams.get("branch") || "";
        const city = searchParams.get("city") || "";
        const finalFees = searchParams.get("finalFees");
        const fromDate = searchParams.get("fromDate");
        const toDate = searchParams.get("toDate");
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

        const [auditLogs, adminDetails, courses, allReferences] = await Promise.all([
            AuditModel.find({ queryId: { $in: queryIds } }).lean(),
            AdminModel.find({ _id: { $in: adminIds } }).select("_id name").lean(),
            CourseModel.find().select("_id course_name fees enrollpercent").lean(),
            ReferenceModel.find().lean(),
        ]);

        const adminMap = adminDetails.reduce((map, admin) => {
            map[admin._id.toString()] = admin.name;
            return map;
        }, {});

        const courseMap = courses.reduce((map, course) => {
            map[course._id.toString()] = {
                name: course.course_name,
                fees: course.fees,
                enrollpercent: course.enrollpercent,
            };
            return map;
        }, {});

        const getRelevantDate = (query) => {
            // Use demodate if available (set in map function), otherwise fall back to other dates
            if (query.demodate) {
                const dt = new Date(query.demodate);
                if (!Number.isNaN(dt.valueOf())) return dt;
            }
            if (query.demoupdatedate) {
                const dt = new Date(query.demoupdatedate);
                if (!Number.isNaN(dt.valueOf())) return dt;
            }
            if (query.fees && query.fees.length > 0 && query.fees[0]?.transactionDate) {
                const dt = new Date(query.fees[0].transactionDate);
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

        const getAdminName = (id) => {
            if (!id) return "Not Assigned";
            if (!/^[0-9a-fA-F]{24}$/.test(id)) return "Not Assigned";
            return adminMap[id] || "Not Assigned";
        };

        const filteredQueries = queries
            .map((query) => {
                const queryObj = query.toObject ? query.toObject() : query;
                const log = auditLogs.find((entry) => entry.queryId === queryObj._id.toString());
                
                // Find demo entry from history - look for oflinesubStatus === "demo" or changes.demo === true
                const demoEntry = log?.history?.find((entry) => 
                    entry.oflinesubStatus === "demo" || 
                    (entry.changes && entry.changes.demo === true)
                );

                const courseData = courseMap[queryObj.courseInterest?.toString()] || null;
                
                // Calculate totalFees using course fees and enrollpercent
                // Formula: (fees * enrollpercent) / 100
                let totalFees = null;
                if (courseData?.fees && courseData?.enrollpercent) {
                    const courseFees = parseFloat(courseData.fees) || 0;
                    const enrollPercent = parseFloat(courseData.enrollpercent) || 0;
                    totalFees = (courseFees * enrollPercent) / 100;
                } else if (queryObj.finalfees) {
                    totalFees = queryObj.finalfees;
                }

                const finalFeesUsed =
                    queryObj.finalfees === 0 || queryObj.finalfees == null
                        ? (courseData?.fees ? parseFloat(courseData.fees) : null)
                        : queryObj.finalfees;

                // Remaining fees = (course enroll percent total) - (deposit total)
                // totalFees is the enroll percent total, queryObj.total is the deposit/paid amount
                const remainingFees =
                    totalFees != null && queryObj.total != null
                        ? totalFees - queryObj.total
                        : null;

                // Get demo date from audit log entry, or use the first fee transaction date when demo was set
                let demodate = null;
                if (demoEntry?.actionDate) {
                    demodate = demoEntry.actionDate;
                } else if (queryObj.fees && queryObj.fees.length > 0) {
                    // Use the first fee transaction date if demo entry not found
                    // Sort fees by date to get the earliest one
                    const sortedFees = [...queryObj.fees].sort((a, b) => {
                        const dateA = a.transactionDate ? new Date(a.transactionDate).getTime() : 0;
                        const dateB = b.transactionDate ? new Date(b.transactionDate).getTime() : 0;
                        return dateA - dateB;
                    });
                    const firstFee = sortedFees[0];
                    if (firstFee?.transactionDate) {
                        demodate = firstFee.transactionDate;
                    }
                } else if (queryObj.createdAt) {
                    // Fallback to createdAt if no other date available
                    demodate = queryObj.createdAt;
                }

                return {
                    ...queryObj,
                    courseName: courseData?.name || "Not_Provided",
                    totalFees,
                    finalFeesUsed,
                    remainingFees,
                    staffName: getAdminName(queryObj.userid),
                    assignedToName: getAdminName(queryObj.assignedTo),
                    demoupdatedate: demoEntry?.actionDate || null,
                    demodate: demodate,
                };
            })
            .filter((query) => {
                // Filter by staffId (userid)
                if (staffId && query.userid?.toString() !== staffId) {
                    return false;
                }

                // Filter by courseId (courseInterest)
                if (courseId && query.courseInterest?.toString() !== courseId) {
                    return false;
                }

                // Filter by assignedToId
                if (assignedToId && query.assignedTo?.toString() !== assignedToId) {
                    return false;
                }

                // Filter by finalFees
                if (finalFees) {
                    const parsed = Number(finalFees);
                    if (!Number.isNaN(parsed) && query.finalfees !== parsed) {
                        return false;
                    }
                }

                // Date filtering
                const relevantDate = getRelevantDate(query);
                if (fromDateObj && (!relevantDate || relevantDate < fromDateObj)) {
                    return false;
                }
                if (toDateObj && (!relevantDate || relevantDate > toDateObj)) {
                    return false;
                }

                // Reference and suboption filtering
                if (referenceId && query.referenceid !== referenceId) {
                    return false;
                }
                if (suboption && query.suboption !== suboption) {
                    return false;
                }

                // String matching filters
                const matchesString = (source, target) => {
                    if (!target) return true;
                    return normalizeString(source).includes(normalizeString(target));
                };

                return (
                    matchesString(query.studentName, studentName) &&
                    matchesString(query.studentContact?.phoneNumber, phoneNumber) &&
                    matchesString(query.branch, branch) &&
                    matchesString(query.studentContact?.city, city)
                );
            })
            .sort((a, b) => {
                // Sort by demodate first, then createdAt
                const dateA = getRelevantDate(a);
                const dateB = getRelevantDate(b);
                if (dateB && dateA) {
                    return dateB.getTime() - dateA.getTime();
                }
                if (dateB) return -1;
                if (dateA) return 1;
                // Fallback to createdAt
                const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return createdB - createdA;
            });

        const total = filteredQueries.length;
        const paginatedQueries = filteredQueries.slice(skip, skip + limit);

        const allAdmins = adminDetails.map((admin) => ({
            _id: admin._id,
            name: admin.name,
        }));

        const allCourses = courses.map((course) => ({
            _id: course._id,
            course_name: course.course_name,
            fees: course.fees,
            enrollpercent: course.enrollpercent,
        }));

        return Response.json(
            {
                message: "Demo data fetched successfully",
                success: true,
                fetch: paginatedQueries,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.max(1, Math.ceil(total / limit)),
                },
                allAdmins,
                allCourses,
                allReferences,
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
