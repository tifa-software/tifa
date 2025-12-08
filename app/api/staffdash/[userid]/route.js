export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import DailyTaskModel from "@/model/DailyTaskModel"; // 👈 add this

export const GET = async (request, { params }) => {
  await dbConnect();

  const { userid } = params;

  if (!userid) {
    return Response.json(
      { message: "User ID missing", success: false },
      { status: 400 }
    );
  }

  try {
    const pipeline = [
      {
        $match: {
          $or: [
            { userid: userid, assignedTo: "Not-Assigned" },
            { assignedTo: userid },
          ],
        },
      },
      {
        $group: {
          _id: null,

          // ✅ totalQueries: not trash, not demo, not enroll
          totalQueries: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$autoclosed", "close"] }, // not trash
                    { $ne: ["$demo", true] }, // not demo
                    { $ne: ["$addmission", true] }, // not enroll
                  ],
                },
                1,
                0,
              ],
            },
          },

          // demo (not trash)
          totalDemoQueries: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$demo", true] },
                    { $ne: ["$autoclosed", "close"] },
                  ],
                },
                1,
                0,
              ],
            },
          },

          // enroll (not trash)
          totalEnrollQueries: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$addmission", true] },
                    { $ne: ["$autoclosed", "close"] },
                  ],
                },
                1,
                0,
              ],
            },
          },

          // important (not trash, grade H, not demo)
          totalImportantQueries: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$lastgrade", "H"] },
                    { $ne: ["$autoclosed", "close"] },
                    { $ne: ["$demo", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },

          // trash only, not demo
          totalTrashQueries: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$autoclosed", "close"] },
                    { $ne: ["$demo", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ];

    const result =
      (await QueryModel.aggregate(pipeline))[0] || {
        totalQueries: 0,
        totalDemoQueries: 0,
        totalEnrollQueries: 0,
        totalImportantQueries: 0,
        totalTrashQueries: 0,
      };

    // ---------------- YESTERDAY todayQueries (DailyTaskModel) ----------------
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1); // move to YESTERDAY

    const yyyy = yesterday.getFullYear();
    const mm = String(yesterday.getMonth() + 1).padStart(2, "0");
    const dd = String(yesterday.getDate()).padStart(2, "0");

    const yesterdayStr = `${yyyy}-${mm}-${dd}`;

    console.log("📅 UserDash yesterdayStr:", yesterdayStr);

    // DailyTaskModel: userId (ObjectId), date ("YYYY-MM-DD"), todayQueries
    const lastDayTask = await DailyTaskModel.findOne({
      userId: userid, // string -> ObjectId cast handled by Mongoose
      date: yesterdayStr,
    }).select("todayQueries date");

    

    const lastDayPendingCount = lastDayTask?.todayQueries.length || 0;

    return Response.json(
      {
        success: true,
        userid,
        lastDayPendingCount, // 👈 added here
        ...result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Count Fetch Error:", error);
    return Response.json(
      { success: false, message: "Server Error", error: String(error) },
      { status: 500 }
    );
  }
};
