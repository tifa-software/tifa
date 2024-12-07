import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AdminModel from "@/model/Admin";

export const GET = async (request) => {
    await dbConnect();

    try {
        // Fetch counts for different query types
        const totalQueries = await QueryModel.countDocuments();
        const totalEnrolled = await QueryModel.countDocuments({ addmission: true });
        const totalDemo = await QueryModel.countDocuments({ demo: true });
        const totalAutoClosedOpen = await QueryModel.countDocuments({
            autoclosed: "open",
            addmission: false,
        });
        const totalAutoClosedClose = await QueryModel.countDocuments({ autoclosed: "close" });

        // Fetch all admin users and all query details
        const allUsers = await AdminModel.find().lean();
        const allDetails = await QueryModel.find().lean();

        // Map detailed information for each query
        const detailedAllDetails = allDetails.map(query => {
            const user = allUsers.find(user => user._id.toString() === query.userid?.toString());
            const assignedToUser = allUsers.find(user => user._id.toString() === query.assignedTo?.toString());

            return {
                ...query,
                userName: user ? user.name : "N/A",
                userBranch: user ? user.branch : "N/A",
                assignedTo: assignedToUser ? assignedToUser.name : "Not Assign",
            };
        });

        // Group queries by user
        const groupQueriesByUser = (queries) =>
            allUsers.map(user => {
                const userQueries = queries.filter(
                    query => query.userid?.toString() === user._id.toString()
                );
                return {
                    userName: user.name,
                    userBranch: user.branch,
                    totalQueries: userQueries.length,
                    queries: userQueries,
                };
            });

        // Filter and group queries by specific criteria
        const allClosedQueries = groupQueriesByUser(
            detailedAllDetails.filter(query => query.autoclosed === "close")
        );

        const allOpenQueries = groupQueriesByUser(
            detailedAllDetails.filter(query => query.autoclosed === "open")
        );

        const allunderdemoQueries = groupQueriesByUser(
            detailedAllDetails.filter(query => query.demo === true)
        );

        const allEnrolledQueries = groupQueriesByUser(
            detailedAllDetails.filter(query => query.addmission === true)
        );

        // Group all queries by user for groupedData
        const groupedData = groupQueriesByUser(detailedAllDetails);

        // Final response
        return Response.json(
            {
                message: "Report data fetched successfully!",
                success: true,
                data: {
                    totalQueries,
                    totalEnrolled,
                    totalDemo,
                    totalAutoClosed: {
                        open: totalAutoClosedOpen,
                        close: totalAutoClosedClose,
                    },
                    groupedData,
                    allClosedQueries,
                    allOpenQueries,
                    allunderdemoQueries,
                    allEnrolledQueries,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.log("Error on fetching report data:", error);
        return Response.json(
            {
                message: "Error on fetching report data!",
                success: false,
            },
            { status: 500 }
        );
    }
};
