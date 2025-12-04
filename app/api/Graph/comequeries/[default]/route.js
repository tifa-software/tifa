export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import ReferenceModel from "@/model/Reference";

export const GET = async (request) => {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);

    const year = Number(searchParams.get("year")) || new Date().getFullYear();
    const month = Number(searchParams.get("month")); // Optional month filter

    // Valid reference list
    const validReferences = await ReferenceModel.find({}, { referencename: 1 });
    const validReferenceIds = validReferences.map(ref => ref.referencename);

    // Date filter
    let dateFilter = {
      $gte: new Date(`${year}-01-01T00:00:00Z`),
      $lte: new Date(`${year}-12-31T23:59:59Z`),
    };

    // Apply specific month if selected
    if (month && month >= 1 && month <= 12) {
      const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
      const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));
      dateFilter = { $gte: start, $lte: end };
    }

    const data = await QueryModel.aggregate([
      {
        $match: {
          defaultdata: "query",
          referenceid: { $in: validReferenceIds },
          createdAt: dateFilter,
        },
      },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            referenceid: "$referenceid",
          },
          totalQueries: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          month: "$_id.month",
          referenceid: "$_id.referenceid",
          totalQueries: 1,
        },
      },
      { $sort: { month: 1 } },
    ])
      .allowDiskUse(true);

    return Response.json({ success: true, year, month, data }, { status: 200 });
  } catch (error) {
    console.error("Error fetching data:", error);
    return Response.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
};
