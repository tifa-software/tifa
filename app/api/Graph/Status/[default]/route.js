export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";

export const GET = async () => {
  await dbConnect();

  try {
    const [stats] = await QueryModel.aggregate([
      {
        $match: { defaultdata: "query" },
      },
      {
        $group: {
          _id: null,
          Pending: {
            $sum: { $cond: [{ $eq: ["$addmission", false] }, 1, 0] },
          },
          Enrolled: {
            $sum: { $cond: [{ $eq: ["$addmission", true] }, 1, 0] },
          },
          AutoClose: {
            $sum: { $cond: [{ $eq: ["$autoclosed", "close"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          Pending: 1,
          Enrolled: 1,
          AutoClose: 1,
        },
      },
    ]);

    const result = stats || { Pending: 0, Enrolled: 0, AutoClose: 0 };

    return Response.json(
      {
        success: true,
        message: "Query stats fetched successfully!",
        fetch: [
          { label: "Pending Queries", value: result.Pending },
          { label: "Enrolled Queries", value: result.Enrolled },
          { label: "Auto Closed Queries", value: result.AutoClose },
        ],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching stats:", error);
    return Response.json(
      {
        success: false,
        message: "Error fetching query stats",
      },
      { status: 500 }
    );
  }
};
