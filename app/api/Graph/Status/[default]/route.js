export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";

export const GET = async (request) => {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get("year")) || new Date().getFullYear();
    const month = Number(searchParams.get("month")) || null;

    // Date range filter
    const startDate = new Date(`${year}-01-01T00:00:00Z`);
    const endDate = new Date(`${year}-12-31T23:59:59Z`);

    const matchStage = {
      defaultdata: "query",
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (month) {
      matchStage.createdAt = {
        $gte: new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00Z`),
        $lte: new Date(`${year}-${String(month).padStart(2, "0")}-31T23:59:59Z`),
      };
    }

    const [stats] = await QueryModel.aggregate([
      { $match: matchStage },
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
    ]).option({ allowDiskUse: true });

    const result = stats || { Pending: 0, Enrolled: 0, AutoClose: 0 };

    return Response.json(
      {
        success: true,
        year,
        month: month || "All Months",
        fetch: [
          { label: "Pending Queries", value: result.Pending },
          { label: "Enrolled Queries", value: result.Enrolled },
          { label: "Auto Closed Queries", value: result.AutoClose },
        ],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Stats Fetch Error:", error);
    return Response.json(
      {
        success: false,
        message: "Server Error",
      },
      { status: 500 }
    );
  }
};
