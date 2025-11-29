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

    // Get all valid reference IDs from Reference collection
    const validReferences = await ReferenceModel.find({}, { _id: 1, referencename: 1 });
    const referenceMap = {}; // Map id => name
    validReferences.forEach(ref => {
      referenceMap[ref.referencename.toString()] = ref.referencename;
    });
    const validReferenceIds = Object.keys(referenceMap);

    // Aggregate queries for only valid references
    const fetch = await QueryModel.aggregate([
      {
        $match: {
          defaultdata: "query",
          referenceid: { $in: validReferenceIds },
          createdAt: {
            $gte: new Date(`${year}-01-01T00:00:00Z`),
            $lte: new Date(`${year}-12-31T23:59:59Z`),
          },
        },
      },
      {
        $group: {
          _id: { month: { $month: "$createdAt" }, referenceid: "$referenceid" },
          totalQueries: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          month: "$_id.month",
          referenceid: "$_id.referenceid",
          referencename: { $arrayElemAt: [ [referenceMap["$_id.referenceid"]], 0 ] },
          totalQueries: 1,
        },
      },
      { $sort: { month: 1 } },
    ]).option({ allowDiskUse: true });

    return Response.json(
      { success: true, year, data: fetch },
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
