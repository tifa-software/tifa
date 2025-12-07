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

        // const mongoFilters = { addmission: true };
        const mongoFilters = {
            $or: [
                { addmission: true },
                { total: { $exists: true, $gt: 0 } }
            ],
            branch: { $regex: /\(Franchise\)$/i }   // ONLY include Franchise branches
        };

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

        // 👉 Date filter for firstFeeDate
        const fromDate = searchParams.get("fromDate");
        const toDate = searchParams.get("toDate");
        const firstFeeDateRange = buildDateRange(fromDate, toDate);

        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.min(500, Math.max(10, parseInt(searchParams.get("limit") || "50", 10)));
        const skip = (page - 1) * limit;

        // 🔢 totalUnfiltered = only mongoFilters (without firstFeeDate)
        const [allCourses, allAdmins, allReferences, totalUnfiltered] = await Promise.all([
            CourseModel.find().select("_id course_name fees").lean(),
            AdminModel.find({ franchisestaff: { $ne: "1" } })
                .select("_id name")
                .lean(),
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

        // ----------------- MAIN QUERY LIST WITH firstFeeDate FILTER -----------------

        const baseAddFirstFeeDateStage = {
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
        };

        // 🔢 totalByFilter = mongoFilters + firstFeeDateRange
        const totalByFilterAgg = await QueryModel.aggregate([
            { $match: mongoFilters },
            baseAddFirstFeeDateStage,
            ...(firstFeeDateRange ? [{ $match: { firstFeeDate: firstFeeDateRange } }] : []),
            { $count: "count" }
        ]);

        const totalByFilter = totalByFilterAgg[0]?.count || 0;

        const mainPipeline = [
            { $match: mongoFilters },
            baseAddFirstFeeDateStage
        ];

        if (firstFeeDateRange) {
            mainPipeline.push({
                $match: {
                    firstFeeDate: firstFeeDateRange
                }
            });
        }

        mainPipeline.push(
            {
                $sort: {
                    firstFeeDate: -1, // Latest paid should come first
                    createdAt: -1
                }
            },
            { $skip: skip },
            { $limit: limit }
        );

        const queries = await QueryModel.aggregate(mainPipeline);

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

        // ----------------- COUNTS & GROUPING ALSO RESPECT firstFeeDate FILTER -----------------

        // 1️⃣ Group by userid + courseInterest + branch
        const countsPipeline = [
            { $match: mongoFilters },
            baseAddFirstFeeDateStage,
        ];

        if (firstFeeDateRange) {
            countsPipeline.push({
                $match: {
                    firstFeeDate: firstFeeDateRange
                }
            });
        }

        countsPipeline.push({
            $group: {
                _id: { userid: "$userid", courseInterest: "$courseInterest", branch: "$branch" },
                count: { $sum: 1 },
                queries: { $push: "$_id" } // collect IDs
            }
        });

        const countsAgg = await QueryModel.aggregate(countsPipeline);

        // 2️⃣ Fetch FULL query details for ALL needed IDs but ONLY selected fields
        const allQueryIds = countsAgg.flatMap(g => g.queries);

        const fullQueryPipeline = [
            { $match: { _id: { $in: allQueryIds } } },
            baseAddFirstFeeDateStage,
        ];

        if (firstFeeDateRange) {
            fullQueryPipeline.push({
                $match: {
                    firstFeeDate: firstFeeDateRange
                }
            });
        }

        fullQueryPipeline.push({
            $project: {
                _id: 1,
                userid: 1,
                referenceid: 1,
                suboption: 1,
                branch: 1,
                demo: 1,
                studentName: 1,
                gender: 1,
                courseInterest: 1,
                category: 1,
                studentContact: 1,
                firstFeeDate: 1,
            }
        });

        const fullQueryDocs = await QueryModel.aggregate(fullQueryPipeline);

        // Convert to easy lookup map
        const queryMap = fullQueryDocs.reduce((acc, doc) => {
            acc[doc._id.toString()] = doc;
            return acc;
        }, {});

        // 3️⃣ Build userCourseCounts with full query details
        const userCourseCounts = {};

        countsAgg.forEach(({ _id, count, queries }) => {
            const staffIdStr = _id.userid?.toString() || null;
            const courseIdStr = _id.courseInterest?.toString() || null;

            if (!userCourseCounts[staffIdStr]) {
                userCourseCounts[staffIdStr] = {
                    staffName: adminMap[staffIdStr] || "Not Assigned",
                    courses: {}
                };
            }

            if (!userCourseCounts[staffIdStr].courses[courseIdStr]) {
                userCourseCounts[staffIdStr].courses[courseIdStr] = {
                    courseName: courseMap[courseIdStr]?.name || "Not_Provided",
                    count: 0,
                    queries: []
                };
            }

            userCourseCounts[staffIdStr].courses[courseIdStr].count += count;
            userCourseCounts[staffIdStr].courses[courseIdStr].queries.push(
                ...queries.map(id => {
                    const q = queryMap[id.toString()];
                    if (!q) return null;

                    const staffName = q.userid
                        ? adminMap[q.userid.toString()] || "Not Assigned"
                        : "Not Assigned";

                    return {
                        ...q,
                        staffName,
                        userid: undefined // optional: hide raw userid
                    };
                }).filter(Boolean)
            );
        });

        // 🔥 New: Group Course → Branch
        const courseBranchCounts = {};

        countsAgg.forEach(({ _id, queries }) => {
            queries.forEach(queryId => {
                const q = queryMap[queryId.toString()];
                if (!q) return;

                const courseIdStr = q.courseInterest?.toString() || null;
                const courseName = courseMap[courseIdStr]?.name || "Not_Provided";

                const branchName = q.branch || "Not_Provided";
                const staffName = q.userid
                    ? adminMap[q.userid.toString()] || "Not Assigned"
                    : "Not Assigned";

                if (!courseBranchCounts[courseName]) {
                    courseBranchCounts[courseName] = {};
                }

                if (!courseBranchCounts[courseName][branchName]) {
                    courseBranchCounts[courseName][branchName] = {
                        count: 0,
                        queries: []
                    };
                }

                courseBranchCounts[courseName][branchName].count += 1;
                courseBranchCounts[courseName][branchName].queries.push({
                    ...q,
                    staffName,
                    userid: undefined
                });
            });
        });

        return Response.json(
            {
                message: "Admission data fetched successfully",
                success: true,
                fetch: formatted,
                userCourseCounts,
                courseBranchCounts,
                pagination: {
                    page,
                    limit,
                    // 👇 Now this is TOTAL AFTER ALL FILTERS (including date)
                    total: totalByFilter,
                    // 👇 Optional: full count without date filter (only mongoFilters)
                    totalUnfiltered,
                    totalPages: Math.max(1, Math.ceil(totalByFilter / limit)),
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
