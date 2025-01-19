import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AuditModel from "@/model/AuditLog";

export const GET = async (request, context) => {
    await dbConnect();

    try {
        const { branch } = context.params;
        if (!branch) {
            return Response.json(
                {
                    message: "Branch name is missing!",
                    success: false,
                },
                { status: 400 }
            );
        }
       
        // Step 1: Fetch all unique queryIds from the AuditLog where stage is 5
        const auditLogs = await AuditModel.find({ stage: 6 }).select('queryId grade');

        // Step 2: Create a map of queryIds to their corresponding grades
        const queryIdMap = {};
        auditLogs.forEach(log => {
            queryIdMap[log.queryId] = log.grade;
        });

        // Step 3: Extract the queryIds from the audit logs
        const queryIds = auditLogs.map(log => log.queryId);

        // Step 4: Fetch the queries from QueryModel where _id is in the list of queryIds and branch matches
        const queries = await QueryModel.find({
            _id: { $in: queryIds },
            branch: branch, // Match the branch parameter
        });

        // Step 5: Map the queries to include the grade from AuditLog
        const result = queries.map(query => ({
            ...query.toObject(),
            grade: queryIdMap[query._id], // Add grade from audit log
        }));

        return Response.json(
            {
                message: "Filtered data fetched successfully!",
                success: true,
                queries: result,
            },
            { status: 200 }
        );
    } catch (error) {
        console.log("Error fetching data list:", error);
        return Response.json(
            {
                message: "Error on fetching data list!",
                success: false,
            },
            { status: 500 }
        );
    }
};
