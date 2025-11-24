export const runtime = "nodejs";
export const preferredRegion = ["bom1"];
import dbConnect from "@/lib/dbConnect";
import AdminModel from "@/model/Admin";

export const GET = async (request) => {
    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);
        const franchiseParam = searchParams.get("franchisestaff");

        let filter = { defaultdata: "admin" };

        if (franchiseParam === "true") {
            // Franchise only
            filter.franchisestaff = "1";
        } else {
            // Default + false → Main only (exclude franchise)
            filter.franchisestaff = { $ne: "1" };
        }

        const fetch = await AdminModel.find(filter);

        
        return Response.json(
            {
                message: "All data fetched!",
                success: true,
                fetch,
            },
            { status: 200 }
        );
    } catch (error) {
        console.log("Error on getting data list:", error);
        return Response.json(
            {
                message: "Error on getting data list!",
                success: false,
            },
            { status: 500 }
        );
    }
};
