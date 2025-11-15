export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AuditModel from "@/model/AuditLog";

export const GET = async (request) => {
    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);

        // Filters
        const grade = searchParams.get("grade") || "Null";
        const deadline = searchParams.get("deadline") || "All";
        const enroll = searchParams.get("enroll") || "All";
        const search = searchParams.get("search") || "";

        // Pagination
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const skip = (page - 1) * limit;

        // Step 1: Fetch all unique queryIds from the AuditLog where stage = 5
        const auditLogs = await AuditModel.find({ stage: 5 }).select("queryId grade");

        // Step 2: Map queryId → grade
        const queryIdMap = {};
        auditLogs.forEach(log => {
            queryIdMap[log.queryId] = log.grade;
        });

        // Step 3: Extract queryIds
        const queryIds = auditLogs.map(log => log.queryId);

        // Step 4: Build filtering
        let filter = { 
            _id: { $in: queryIds }, 
            autoclosed: "open", 
            defaultdata: "query" 
        };

        // Grade filter
        if (grade !== "Null") {
            const idsByGrade = auditLogs
                .filter(log => log.grade === grade)
                .map(log => log.queryId);

            filter._id = { $in: idsByGrade };
        }

        // Deadline filter
       // Deadline filter (Exact client-side working logic)
if (deadline !== "All") {
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));

    const tomorrow = new Date(Date.now() + 86400000);
    const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0));
    const tomorrowEnd = new Date(tomorrow.setHours(23, 59, 59, 999));

    if (deadline === "Today") {
        filter.deadline = {
            $gte: todayStart,
            $lte: todayEnd,
        };
    } 
    else if (deadline === "Tomorrow") {
        filter.deadline = {
            $gte: tomorrowStart,
            $lte: tomorrowEnd,
        };
    } 
    else if (deadline === "Past") {
        filter.deadline = { 
            $lt: todayStart 
        };
    }
}


        // Enroll status
        if (enroll === "Enroll") filter.addmission = true;
        if (enroll === "Pending") filter.addmission = false;

        // Search filter
        if (search) {
            filter.$or = [
                { studentName: { $regex: search, $options: "i" } },
                { "studentContact.phoneNumber": { $regex: search, $options: "i" } },
                { "studentContact.city": { $regex: search, $options: "i" } },
            ];
        }

        // Step 5: Fetch data with pagination
        const total = await QueryModel.countDocuments(filter);

        const queries = await QueryModel.find(filter)
            .skip(skip)
            .limit(limit)
            .sort({ deadline: 1 });

        // Step 6: Attach grade with every record
        const finalResult = queries.map(q => ({
            ...q.toObject(),
            grade: queryIdMap[q._id]
        }));

        return Response.json(
            {
                success: true,
                message: "Filtered data fetched successfully!",
                total,
                page,
                limit,
                queries: finalResult
            },
            { status: 200 }
        );
    } catch (error) {
        console.log("Error:", error);
        return Response.json(
            { success: false, message: "Error on fetching data list!" },
            { status: 500 }
        );
    }
};
