export const runtime = "nodejs";
export const preferredRegion = ["bom1"];
import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";

export const GET = async (request) => {
  await dbConnect();

  try {
    // Extract year from query params (if provided)
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get("year")) || new Date().getFullYear();

    // Aggregate data for the given year only
    const fetch = await QueryModel.aggregate([
      {
        $match: {
          defaultdata: "query",
          createdAt: {
            $gte: new Date(`${year}-01-01T00:00:00Z`),
            $lte: new Date(`${year}-12-31T23:59:59Z`),
          },
        },
      },
      {
        $group: {
          _id: { month: { $month: "$createdAt" } },
          totalQueries: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          month: "$_id.month",
          totalQueries: 1,
        },
      },
      { $sort: { month: 1 } },
      { $limit: 12 },
    ]).option({ allowDiskUse: true });

    return Response.json(
      {
        success: true,
        year,
        data: fetch,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching data:", error);
    return Response.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
};
