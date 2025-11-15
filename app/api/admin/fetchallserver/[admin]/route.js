export const runtime = "nodejs";
export const preferredRegion = ["bom1"];
import dbConnect from "@/lib/dbConnect";
import AdminModel from "@/model/Admin";

export const GET = async (request) => {
    await dbConnect();

    try {
        const { search, branch, usertype, page = 1, limit = 10 } =
            Object.fromEntries(request.nextUrl.searchParams);

        const query = { defaultdata: "admin" };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                {
                    $expr: {
                        $regexMatch: {
                            input: { $toString: "$mobile" },
                            regex: search,
                            options: "i"
                        }
                    }
                }
            ];
        }


        if (branch && branch !== "All") query.branch = branch;
        if (usertype && usertype !== "All") query.usertype = usertype;

        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            AdminModel.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            AdminModel.countDocuments(query)
        ]);

        return Response.json(
            {
                success: true,
                message: "Fetched successfully!",
                users,
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: Number(page),
            },
            { status: 200 }
        );
    } catch (error) {
        console.log("API Error:", error);
        return Response.json(
            { success: false, message: "Server error!" },
            { status: 500 }
        );
    }
};
