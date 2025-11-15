export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";

export async function GET(req) {
    await dbConnect();

    try {
        const { searchParams } = new URL(req.url);

        const page = parseInt(searchParams.get("page")) || 1;
        const limit = parseInt(searchParams.get("limit")) || 10;

        const reference = searchParams.get("reference") || "All";
        const deadline = searchParams.get("deadline") || "All";
        const status = searchParams.get("status") || "All";

        let filter = { defaultdata: "query" };

        // Reference filter
        if (reference !== "All") {
            filter.referenceid = reference;
        }

        // Status filter
        if (status === "Enroll") filter.addmission = true;
        if (status === "Pending") filter.addmission = false;

        // Deadline filter - correct handling using fresh Date objects
        // Build explicit start/end Date objects so we don't mutate the same Date
        const now = new Date();

        if (deadline === "Today") {
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            filter.deadline = { $gte: startOfToday, $lte: endOfToday };
        } else if (deadline === "Tomorrow") {
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            const startOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0, 0);
            const endOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59, 999);
            filter.deadline = { $gte: startOfTomorrow, $lte: endOfTomorrow };
        } else if (deadline === "Past") {
            // Past = any deadline strictly before start of today
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            filter.deadline = { $lt: startOfToday };
        }
        // if deadline === "All" -> no deadline filter

        // Count matching docs
        const total = await QueryModel.countDocuments(filter);

        // Fetch paginated + sorted by deadline
        const fetch = await QueryModel.find(filter)
            .sort({ deadline: 1 })
            .skip((page - 1) * limit)
            .limit(limit);

        // Provide full reference list (distinct) for filter UI
        const fullReferenceList = await QueryModel.distinct("referenceid", {
            defaultdata: "query"
        });
        const totalEnroll = await QueryModel.countDocuments({
            ...filter,
            addmission: true,
        });

        // 3️⃣ FILTERED PENDING COUNT
        const totalPending = await QueryModel.countDocuments({
            ...filter,
            addmission: false,
        });
        return Response.json(
            {
                success: true,
                fetch,
                total,
                referenceList: fullReferenceList,
                totalEnroll,
                totalPending,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("API Error:", error);
        return Response.json({ success: false, message: "Server error" }, { status: 500 });
    }
}
