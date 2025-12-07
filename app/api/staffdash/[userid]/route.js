export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";

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
            { assignedTo: userid }
          ]
        }
      },
      {
        $group: {
          _id: null,

          // ✅ totalQueries:
          // not trash, not demo, not enroll
          totalQueries: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$autoclosed", "close"] },   // not trash
                    { $ne: ["$demo", true] },            // not demo
                    { $ne: ["$addmission", true] }       // not enroll
                  ]
                },
                1,
                0
              ]
            }
          },

          // demo (not trash)
          totalDemoQueries: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$demo", true] },
                    { $ne: ["$autoclosed", "close"] }
                  ]
                },
                1,
                0
              ]
            }
          },

          // enroll (not trash)
          totalEnrollQueries: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$addmission", true] },
                    { $ne: ["$autoclosed", "close"] }
                  ]
                },
                1,
                0
              ]
            }
          },

          // important (not trash, grade H, not demo)
          totalImportantQueries: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$lastgrade", "H"] },
                    { $ne: ["$autoclosed", "close"] },
                    { $ne: ["$demo", true] }
                  ]
                },
                1,
                0
              ]
            }
          },

          // trash only, not demo
          totalTrashQueries: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$autoclosed", "close"] },
                    { $ne: ["$demo", true] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ];

    const result = (await QueryModel.aggregate(pipeline))[0] || {
      totalQueries: 0,
      totalDemoQueries: 0,
      totalEnrollQueries: 0,
      totalImportantQueries: 0,
      totalTrashQueries: 0
    };

    return Response.json(
      { success: true, userid, ...result },
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
