export const runtime = "nodejs";
export const preferredRegion = ["bom1"];
import dbConnect from "@/lib/dbConnect";
import QueryUpdateModel from "@/model/AuditLog";

export const GET = async () => {
  await dbConnect();

  try {
    const dateWiseUpdates = await QueryUpdateModel.aggregate([
      {
        $match: { defaultdata: { $ne: "query" } },
      },
      { $unwind: "$history" },
      {
        $addFields: {
          year: { $year: "$history.actionDate" },
          month: { $month: "$history.actionDate" },
          day: { $dayOfMonth: "$history.actionDate" },
        },
      },
      {
        $addFields: {
          weekOfMonth: {
            $ceil: {
              $divide: [
                { $add: [{ $subtract: ["$day", 1] }, 1] },
                7,
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: {
            year: "$year",
            month: "$month",
            week: "$weekOfMonth",
          },
          updatedCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          week: "$_id.week",
          updatedCount: 1,
        },
      },
      { $sort: { year: 1, month: 1, week: 1 } },
    ]);

    const totalQueries = await QueryUpdateModel.countDocuments({
      message: { $ne: "query" },
    });

    return Response.json(
      {
        success: true,
        data: { totalQueries, dateWiseUpdates },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching data:", error);
    return Response.json({ success: false, message: "Server error" }, { status: 500 });
  }
};
