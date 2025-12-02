export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AuditModel from "@/model/AuditLog";
import AdminModel from "@/model/Admin";
import CourseModel from "@/model/Courses";
import ReferenceModel from "@/model/Reference";

const sanitizeId = (value) => {
    if (!value) return null;
    return /^[0-9a-fA-F]{24}$/.test(value) ? value : null;
};

const buildDateRange = (fromDate, toDate) => {
    if (!fromDate && !toDate) return null;

    const range = {};
    if (fromDate) {
        const start = new Date(fromDate);
        if (!Number.isNaN(start.getTime())) {
            range.$gte = start;
        }
    }
    if (toDate) {
        const end = new Date(toDate);
        if (!Number.isNaN(end.getTime())) {
            end.setHours(23, 59, 59, 999);
            range.$lte = end;
        }
    }

    return Object.keys(range).length > 0 ? range : null;
};

export const GET = async (request) => {
    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);

        const mongoFilters = { addmission: true };

        const staffId = sanitizeId(searchParams.get("staffId"));
        if (staffId) {
            mongoFilters.userid = staffId;
        }

        const assignedToId = sanitizeId(searchParams.get("assignedToId"));
        if (assignedToId) {
            mongoFilters.assignedTo = assignedToId;
        }

        const studentName = searchParams.get("studentName");
        if (studentName) {
            mongoFilters.studentName = { $regex: studentName.trim(), $options: "i" };
        }

        const phoneNumber = searchParams.get("phoneNumber");
        if (phoneNumber) {
            mongoFilters["studentContact.phoneNumber"] = { $regex: phoneNumber.trim(), $options: "i" };
        }

        const courseId = sanitizeId(searchParams.get("courseId"));
        if (courseId) {
            mongoFilters.courseInterest = courseId;
        }

        const referenceId = searchParams.get("referenceId");
        if (referenceId) {
            mongoFilters.referenceid = referenceId;
        }

        const suboption = searchParams.get("suboption");
        if (suboption) {
            mongoFilters.suboption = suboption;
        }

        const branch = searchParams.get("branch");
        if (branch) {
            mongoFilters.branch = branch;
        }

        const city = searchParams.get("city");
        if (city) {
            mongoFilters["studentContact.city"] = city;
        }

        const finalFees = searchParams.get("finalFees");
        if (finalFees) {
            const parsed = Number(finalFees);
            if (!Number.isNaN(parsed)) {
                mongoFilters.finalfees = parsed;
            }
        }


        //  const dateRange = buildDateRange(searchParams.get("fromDate"), searchParams.get("toDate"));
        // if (dateRange) {
        //     mongoFilters.addmissiondate = dateRange;
        // }
        //
        const fromDate = searchParams.get("fromDate");
        const toDate = searchParams.get("toDate");

        if (fromDate || toDate) {
            mongoFilters.fees = {
                $elemMatch: {
                    transactionDate: {
                        ...(fromDate && { $gte: new Date(fromDate) }),
                        ...(toDate && { $lte: new Date(`${toDate}T23:59:59.999Z`) }),
                    },
                },
            };
        }
        // 


        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.min(500, Math.max(10, parseInt(searchParams.get("limit") || "50", 10)));
        const skip = (page - 1) * limit;

        const [allCourses, allAdmins, allReferences, total] = await Promise.all([
            CourseModel.find().select("_id course_name fees").lean(),
            AdminModel.find().select("_id name").lean(),
            ReferenceModel.find().lean(),
            QueryModel.countDocuments(mongoFilters),
        ]);

        const courseMap = allCourses.reduce((acc, course) => {
            acc[course._id.toString()] = {
                name: course.course_name,
                fees: course.fees,
            };
            return acc;
        }, {});

        const adminMap = allAdmins.reduce((acc, admin) => {
            acc[admin._id.toString()] = admin.name;
            return acc;
        }, {});

        // const queries = await QueryModel.find(mongoFilters)
        //     .sort({ addmissiondate: -1, createdAt: -1 })
        //     .skip(skip)
        //     .limit(limit)
        //     .lean();
        const queries = await QueryModel.aggregate([
            { $match: mongoFilters },

            // Add a field for the FIRST fee date
            {
                $addFields: {
                    firstFeeDate: {
                        $let: {
                            vars: {
                                sortedFees: {
                                    $sortArray: {
                                        input: "$fees",
                                        sortBy: { transactionDate: 1 }
                                    }
                                }
                            },
                            in: { $arrayElemAt: ["$$sortedFees.transactionDate", 0] }
                        }
                    }
                }
            },

            // Sorting priority: first fee date → createdAt
            {
                $sort: {
                    firstFeeDate: -1, // Latest paid should come first
                    createdAt: -1
                }
            },

            { $skip: skip },
            { $limit: limit }
        ]);


        const queryIds = queries.map((query) => query._id.toString());

        const auditLogs = queryIds.length
            ? await AuditModel.find({ queryId: { $in: queryIds } }).lean()
            : [];

        const formatted = queries.map((query) => {
            const queryIdStr = query._id.toString();
            const log = auditLogs.find((l) => l.queryId === queryIdStr);

            const admissionEntry = log?.history?.find(
                (entry) => entry.oflinesubStatus === "admission"
            );

            const courseData = courseMap[query.courseInterest] || null;
            const totalFees = courseData?.fees ?? query.finalfees ?? null;

            const finalFeesUsed =
                query.finalfees === 0 || query.finalfees == null
                    ? courseData?.fees ?? null
                    : query.finalfees;

            const remainingFees =
                finalFeesUsed != null && query.total != null
                    ? finalFeesUsed - query.total
                    : null;

            const getAdminName = (id) => {
                if (!id) return "Not Assigned";
                if (!/^[0-9a-fA-F]{24}$/.test(id)) return "Not Assigned";
                return adminMap[id] || "Not Assigned";
            };

            return {
                ...query,
                courseName: courseData?.name || "Not_Provided",
                totalFees,
                finalFeesUsed,
                remainingFees,
                staffName: getAdminName(query.userid),
                assignedToName: getAdminName(query.assignedTo),
                admissionupdatedate: admissionEntry?.actionDate || null,
            };
        });
        // Compute accurate userCourseCounts across ALL matching documents (not just the current page)
        // Prepare userCourseCounts object including detailed query lists
        // 1️⃣ Group by userid + courseInterest and collect query IDs
        const countsAgg = await QueryModel.aggregate([
            { $match: mongoFilters },
            {
                $group: {
                    _id: { userid: "$userid", courseInterest: "$courseInterest" },
                    count: { $sum: 1 },
                    queries: { $push: "$_id" } // collect IDs
                }
            }
        ]);

        // 2️⃣ Fetch FULL query details for ALL needed IDs in ONE request
        const allQueryIds = countsAgg.flatMap(g => g.queries);
        // Fetch FULL query details for ALL needed IDs but ONLY selected fields
        const fullQueryDocs = await QueryModel.find(
            { _id: { $in: allQueryIds } },
            {
                _id: 1,
                userid: 1,
                referenceid: 1,
                suboption: 1,
                demo: 1,
                studentName: 1,
                gender: 1,
                category: 1,
                studentContact: 1,
            }
        ).lean();


        // Convert to easy lookup map
        const queryMap = fullQueryDocs.reduce((acc, doc) => {
            acc[doc._id.toString()] = doc;
            return acc;
        }, {});

        // 3️⃣ Build userCourseCounts with full query details
        const userCourseCounts = {};

        countsAgg.forEach(({ _id, count, queries }) => {
            const staffId = _id.userid?.toString() || null;
            const courseId = _id.courseInterest?.toString() || null;

            const staffName = adminMap[staffId] || "Not Assigned";
            const courseName = courseMap[courseId]?.name || "Not_Provided";

            if (!userCourseCounts[staffName]) userCourseCounts[staffName] = {};
            if (!userCourseCounts[staffName][courseName]) userCourseCounts[staffName][courseName] = {};

            userCourseCounts[staffName][courseName] = {
                count,
                queries: queries.map(id => queryMap[id.toString()]) // FULL documents 🎯
            };
        });



        return Response.json(
            {
                message: "Admission data fetched successfully",
                success: true,
                fetch: formatted,
                userCourseCounts,
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
