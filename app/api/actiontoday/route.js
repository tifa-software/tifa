export const runtime = "nodejs";
export const preferredRegion = ["bom1"];
export const dynamic = "force-dynamic";  // ← IMPORTANT

import dbConnect from "@/lib/dbConnect";
import QueryUpdateModel from "@/model/AuditLog";
import AdminModel from "@/model/Admin";

export const GET = async () => {
    await dbConnect();

    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const admins = await AdminModel.find(
            { franchisestaff: { $ne: "1" } },
            "_id name email branch franchisestaff"
        ).lean();

        const actionCounts = await QueryUpdateModel.aggregate([
            { $unwind: "$history" },
            {
                $match: {
                    "history.actionDate": { $gte: startOfDay, $lte: endOfDay }
                }
            },
            {
                $group: {
                    _id: "$history.actionByid", 
                    count: { $sum: 1 }
                }
            }
        ]);

        const countMap = new Map(
            actionCounts.map(item => [item._id?.toString(), item.count])
        );

        const data = admins.map(admin => ({
            adminId: admin._id.toString(),
            name: admin.name,
            email: admin.email,
            branch: admin.branch,
            todayActions: countMap.get(admin._id.toString()) || 0
        }));

        return new Response(JSON.stringify({ success: true, data }), {
            status: 200,
            headers: {
                "Cache-Control": "no-store"  // ← FIX CACHE ISSUE
            }
        });

    } catch (error) {
        console.error("Error:", error);
        return new Response(JSON.stringify({ success: false, message: "Internal server error" }), { 
            status: 500,
            headers: {
                "Cache-Control": "no-store"
            }
        });
    }
};
