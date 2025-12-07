export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";

export const GET = async (request, { params }) => {
  await dbConnect();

  const { userid, branchname } = params;

  console.log("API /branchdash params =>", params);

  if (!userid || !branchname) {
    return Response.json(
      { message: "User ID or Branch name missing", success: false },
      { status: 400 }
    );
  }

  try {
    const pipeline = [
      // 👇 For DEMO & ENROLL we want:
      // $or: [ { assignedTo: userid }, { branch: branchname } ]
      {
        $match: {
          $or: [
            { assignedTo: userid },
            { branch: branchname }
          ]
        }
      },

      {
        $group: {
          _id: null,

          // ---------- TOTAL QUERIES ----------
          // Use OLD logic: assignedTo: userid OR (branch: branchname AND assignedTo: "Not-Assigned")
          totalQueries: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $or: [
                        { $eq: ["$assignedTo", userid] },
                        {
                          $and: [
                            { $eq: ["$branch", branchname] },
                            { $eq: ["$assignedTo", "Not-Assigned"] }
                          ]
                        }
                      ]
                    },
                    { $ne: ["$autoclosed", "close"] },
                    { $ne: ["$demo", true] },
                    { $ne: ["$addmission", true] }
                  ]
                },
                1,
                0
              ]
            }
          },

          // ---------- DEMO QUERIES ----------
          // Here we ONLY care about:
          // demo == true & autoclosed != "close"
          // And because of the $match above, we already have
          // (assignedTo: userid OR branch: branchname)
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

          // ---------- ENROLL / ADMISSION QUERIES ----------
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

          // ---------- IMPORTANT QUERIES (OLD LOGIC) ----------
          totalImportantQueries: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $or: [
                        { $eq: ["$assignedTo", userid] },
                        {
                          $and: [
                            { $eq: ["$branch", branchname] },
                            { $eq: ["$assignedTo", "Not-Assigned"] }
                          ]
                        }
                      ]
                    },
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

          // ---------- TRASH QUERIES (OLD LOGIC) ----------
          totalTrashQueries: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $or: [
                        { $eq: ["$assignedTo", userid] },
                        {
                          $and: [
                            { $eq: ["$branch", branchname] },
                            { $eq: ["$assignedTo", "Not-Assigned"] }
                          ]
                        }
                      ]
                    },
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
      { success: true, userid, branchname, ...result },
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
