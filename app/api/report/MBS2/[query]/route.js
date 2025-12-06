export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AdminModel from "@/model/Admin";

export const GET = async (request) => {
    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);
        const adminId = searchParams.get("adminId");

        if (!adminId) {
            return Response.json(
                {
                    message: "adminId is required in query params",
                    success: false,
                    data: { userActivityReport: [] },
                },
                { status: 400 }
            );
        }

        // FIND SELECTED ADMIN
        const admin = await AdminModel.findById(adminId, {
            _id: 1,
            name: 1,
            branch: 1,
        });

        if (!admin) {
            return Response.json(
                {
                    message: "Admin not found!",
                    success: false,
                    data: { userActivityReport: [] },
                },
                { status: 404 }
            );
        }

        // FETCH ALL ADMINS JUST FOR NAME MAPPING IN HISTORY
        const allAdmins = await AdminModel.find({}, { _id: 1, name: 1 });
        const adminIdToName = allAdmins.reduce((map, a) => {
            map[a._id.toString()] = a.name;
            return map;
        }, {});

        // FIND ONLY QUERIES WHERE THIS ADMIN IS IN SENT OR RECEIVED HISTORY
        const queries = await QueryModel.find(
            {
                $or: [
                    { assignedsenthistory: adminId },
                    { assignedreceivedhistory: adminId },
                ],
            },
            {
                studentName: 1,
                assignedDate: 1,
                assignedsenthistory: 1,
                assignedreceivedhistory: 1,
            }
        );

        let sentQueries = 0;
        let receivedQueries = 0;
        const sentQueryDetails = [];
        const receivedQueryDetails = [];

        const adminIdStr = adminId.toString();

        queries.forEach((query) => {
            const sentIds = (query.assignedsenthistory || []).map((id) =>
                id.toString()
            );
            const receivedIds = (query.assignedreceivedhistory || []).map(
                (id) => id.toString()
            );

            const detail = {
                studentName: query.studentName,
                assignedDate: query.assignedDate,
                assignedsenthistory: sentIds.map(
                    (id) => adminIdToName[id] || id
                ),
                assignedreceivedhistory: receivedIds.map(
                    (id) => adminIdToName[id] || id
                ),
            };

            // SENT
            if (sentIds.includes(adminIdStr)) {
                sentQueries++;
                sentQueryDetails.push(detail);
            }

            // RECEIVED
            if (receivedIds.includes(adminIdStr)) {
                receivedQueries++;
                receivedQueryDetails.push(detail);
            }
        });

        const userActivityReport = [
            {
                userName: admin.name,
                branch: admin.branch,
                sentQueries,
                receivedQueries,
                sentQueryDetails,
                receivedQueryDetails,
            },
        ];

        return Response.json(
            {
                message: "Report fetched successfully!",
                success: true,
                data: { userActivityReport },
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
