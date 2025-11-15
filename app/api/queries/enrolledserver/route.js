export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";

export const GET = async (request) => {
    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);

        // Pagination
        const page = Number(searchParams.get("page")) || 1;
        const limit = Number(searchParams.get("limit")) || 6;
        const skip = (page - 1) * limit;

        // Filters
        const branch = searchParams.get("branch") || "All";
        const city = searchParams.get("city") || "All";
        const search = searchParams.get("search") || "";
        const searchBy = searchParams.get("searchBy") || "name"; // NEW

        const filterQuery = { addmission: true };

        if (branch !== "All") filterQuery.branch = branch;
        if (city !== "All") filterQuery["studentContact.city"] = city;

        // 🔍 SEARCH FILTERING
        if (search.trim() !== "") {
            if (searchBy === "name") {
                filterQuery.studentName = { $regex: search, $options: "i" };

            } else if (searchBy === "phone") {
                filterQuery["studentContact.phoneNumber"] = { $regex: search, $options: "i" };

            } else if (searchBy === "city") {
                filterQuery["studentContact.city"] = { $regex: search, $options: "i" };
            }
        }

        // Paginated data
        const fetch = await QueryModel.find(filterQuery)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const totalFiltered = await QueryModel.countDocuments(filterQuery);

        // Stats for ALL DATA
        const branchStats = await QueryModel.aggregate([
            { $match: { addmission: true } },
            { $group: { _id: "$branch", count: { $sum: 1 } } }
        ]);

        const cityStats = await QueryModel.aggregate([
            { $match: { addmission: true } },
            { $group: { _id: "$studentContact.city", count: { $sum: 1 } } }
        ]);

        // Unique dropdown values
        const branches = await QueryModel.distinct("branch", { addmission: true });
        const cities = await QueryModel.distinct("studentContact.city", { addmission: true });

        return Response.json(
            {
                success: true,
                fetch,
                totalFiltered,
                totalPages: Math.ceil(totalFiltered / limit),
                branchStats,
                cityStats,
                branches,
                cities
            },
            { status: 200 }
        );

    } catch (error) {
        console.log(error);
        return Response.json({ success: false }, { status: 500 });
    }
};
