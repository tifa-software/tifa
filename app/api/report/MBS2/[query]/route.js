export const runtime = "nodejs";
export const preferredRegion = ["bom1"];
import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AdminModel from "@/model/Admin";

export const GET = async () => {
    await dbConnect();

    try {
        // FETCH LIMITED FIELDS ONLY
        const queries = await QueryModel.find({}, {
            studentName: 1,
            assignedDate: 1,
            assignedsenthistory: 1,
            assignedreceivedhistory: 1
        });

        const admins = await AdminModel.find({}, { _id: 1, name: 1, branch: 1 });

        // ADMIN ID → NAME
        const adminIdToName = admins.reduce((map, admin) => {
            map[admin._id.toString()] = admin.name;
            return map;
        }, {});

        // INITIALIZE COUNTERS
        const sentReceivedCounts = {};
        admins.forEach(admin => {
            const id = admin._id.toString();
            sentReceivedCounts[id] = {
                sent: 0,
                received: 0,
                sentQueryDetails: [],
                receivedQueryDetails: []
            };
        });

        // PROCESS EACH QUERY
        queries.forEach(query => {
            admins.forEach(admin => {
                const adminId = admin._id.toString();

                // SENT HISTORY MATCH
                if (query.assignedsenthistory.includes(adminId)) {
                    sentReceivedCounts[adminId].sent++;

                    sentReceivedCounts[adminId].sentQueryDetails.push({
                        studentName: query.studentName,
                        assignedDate: query.assignedDate,
                        assignedsenthistory: query.assignedsenthistory.map(id => adminIdToName[id] || id),
                        assignedreceivedhistory: query.assignedreceivedhistory.map(id => adminIdToName[id] || id)
                    });
                }

                // RECEIVED HISTORY MATCH
                if (query.assignedreceivedhistory.includes(adminId)) {
                    sentReceivedCounts[adminId].received++;

                    sentReceivedCounts[adminId].receivedQueryDetails.push({
                        studentName: query.studentName,
                        assignedDate: query.assignedDate,
                        assignedsenthistory: query.assignedsenthistory.map(id => adminIdToName[id] || id),
                        assignedreceivedhistory: query.assignedreceivedhistory.map(id => adminIdToName[id] || id)
                    });
                }
            });
        });

        // FINAL REPORT
        const userActivityReport = admins.map(admin => {
            const id = admin._id.toString();
            return {
                userName: admin.name,
                branch: admin.branch,
                sentQueries: sentReceivedCounts[id].sent,
                receivedQueries: sentReceivedCounts[id].received,
                sentQueryDetails: sentReceivedCounts[id].sentQueryDetails,
                receivedQueryDetails: sentReceivedCounts[id].receivedQueryDetails
            };
        });

        return Response.json(
            {
                message: "Report fetched successfully!",
                success: true,
                data: { userActivityReport }
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error:", error);
        return Response.json(
            { message: "Error fetching report!", success: false },
            { status: 500 }
        );
    }
};
