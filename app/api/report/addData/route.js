import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AdminModel from "@/model/Admin";

export const GET = async (request) => {
    await dbConnect();

    try {
        const totalQueries = await QueryModel.countDocuments();
        const totalEnrolled = await QueryModel.countDocuments({ addmission: true });
        const totalDemo = await QueryModel.countDocuments({ demo: true });
        const totalAutoClosedOpen = await QueryModel.countDocuments({
            autoclosed: "open",
            addmission: false,
        });
        const totalAutoClosedClose = await QueryModel.countDocuments({ autoclosed: "close" });

      
        const allUsers = await AdminModel.find().lean();

       
        const allDetails = await QueryModel.find().lean();

       
        const detailedAllDetails = allDetails.map(query => {
            const user = allUsers.find(user => user._id.toString() === query.userid?.toString()); 
            const assignedToUser = allUsers.find(user => user._id.toString() === query.assignedTo?.toString());

            return {
                ...query,
                userName: user ? user.name : "N/A", 
                userBranch: user ? user.branch : "N/A", 
                assignedTo: assignedToUser ? assignedToUser.name : "N/A",
            };
        });

    
        const groupedData = allUsers.map(user => {
            const userQueries = detailedAllDetails.filter(query => query.userid.toString() === user._id.toString());
            return {
                userName: user.name,
                userBranch: user.branch,
                totalQueries: userQueries.length,
                queries: userQueries,
            };
        });

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
