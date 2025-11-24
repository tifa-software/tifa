export const runtime = "nodejs";
export const preferredRegion = ["bom1"];
import dbConnect from "@/lib/dbConnect";
import BranchModel from "@/model/Branch";

export const GET = async (request) => {
    await dbConnect();

    try {
        const { search, course, sort = "newest", page = 1, limit = 8, franchise } =
            Object.fromEntries(request.nextUrl.searchParams);

        const query = { defaultdata: "branch" };
        if (franchise === "true") {
            query.franchise = "1"; // franchise only
        } else {
            query.franchise = { $ne: "1" }; // default & false → main only
        }

        // 🔍 Search by branch_name
        if (search) {
            query.branch_name = { $regex: search, $options: "i" };
        }

        // 🎓 Filter by course
        if (course && course !== "All") {
            query.courses = course; // because courses is array of IDs
        }

        // Pagination
        const skip = (page - 1) * limit;

        // Sorting
        const sortQuery = sort === "newest"
            ? { createdAt: -1 }
            : { createdAt: 1 };

        // Fetch data
        const [branches, total] = await Promise.all([
            BranchModel.find(query)
                .sort(sortQuery)
                .skip(skip)
                .limit(Number(limit)),
            BranchModel.countDocuments(query)
        ]);

        return Response.json(
            {
                success: true,
                message: "Branches fetched successfully!",
                branches,
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: Number(page),
            },
            { status: 200 }
        );
    } catch (error) {
        console.log("Error fetching branches:", error);
        return Response.json(
            { success: false, message: "Server error!" },
            { status: 500 }
        );
    }
};
