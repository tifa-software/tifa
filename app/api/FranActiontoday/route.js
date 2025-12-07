export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import dbConnect from "@/lib/dbConnect";
import QueryUpdateModel from "@/model/AuditLog";
import AdminModel from "@/model/Admin";

export const GET = async () => {
    await dbConnect();

    try {
        // 🔹 Start & end of today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // 🔹 Fetch admins except franchisestaff = "1"
        const admins = await AdminModel.find(
            { franchisestaff: "1" },
            "_id name email branch franchisestaff"
        );

        // 🔹 Count history updates matched by actionBy admin name & today's date
        const actionCounts = await QueryUpdateModel.aggregate([
            { 
                $unwind: "$history"   // expand history array 
            },
            {
                $match: {
                    "history.actionDate": { $gte: startOfDay, $lte: endOfDay }
                }
            },
            {
                $group: {
                    _id: "$history.actionBy",
                    count: { $sum: 1 }
                }
            }
        ]);

        // 🔹 Convert aggregated results to map
        const countMap = new Map(
            actionCounts.map(item => [item._id, item.count])
        );

        // 🔹 Final response structure
        const data = admins.map(admin => ({
            adminId: admin._id,
            name: admin.name,
            email: admin.email,
            branch: admin.branch,
            todayActions: countMap.get(admin.name) || 0   // default 0
        }));

        return new Response(JSON.stringify({ success: true, data }), { status: 200 });

    } catch (error) {
        console.error("Error:", error);
        return new Response(JSON.stringify({ success: false, message: "Internal server error" }), { status: 500 });
    }
};
