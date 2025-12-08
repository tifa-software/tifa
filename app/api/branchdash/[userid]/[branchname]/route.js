export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import DailyTaskModel from "@/model/DailyTaskModel";
import { NextResponse } from "next/server";

export const GET = async (request, { params }) => {
  await dbConnect();

  const { userid, branchname } = params;

  console.log("API /branchdash params =>", params);

  if (!userid || !branchname) {
    return NextResponse.json(
      { message: "User ID or Branch name missing", success: false },
      { status: 400 }
    );
  }

  try {
    // ---------------- BRANCH DASH COUNTS ----------------
    const pipeline = [
      {
        $match: {
          $or: [{ assignedTo: userid }, { branch: branchname }],
        },
      },
      {
        $group: {
          _id: null,

          // ---------- TOTAL QUERIES ----------
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
                            { $eq: ["$assignedTo", "Not-Assigned"] },
                          ],
                        },
                      ],
                    },
                    { $ne: ["$autoclosed", "close"] },
                    { $ne: ["$demo", true] },
                    { $ne: ["$addmission", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },

          // ---------- DEMO QUERIES ----------
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

          // ---------- ENROLL / ADMISSION QUERIES ----------
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

          // ---------- IMPORTANT QUERIES ----------
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
                            { $eq: ["$assignedTo", "Not-Assigned"] },
                          ],
                        },
                      ],
                    },
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

          // ---------- TRASH QUERIES ----------
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
                            { $eq: ["$assignedTo", "Not-Assigned"] },
                          ],
                        },
                      ],
                    },
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

    const aggregateResult = await QueryModel.aggregate(pipeline);
    const result =
      aggregateResult[0] || {
        totalQueries: 0,
        totalDemoQueries: 0,
        totalEnrollQueries: 0,
        totalImportantQueries: 0,
        totalTrashQueries: 0,
      };

    //// ---------------- YESTERDAY pendingCount (DailyTaskModel) ----------------
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1); // move to YESTERDAY

    const yyyy = yesterday.getFullYear();
    const mm = String(yesterday.getMonth() + 1).padStart(2, "0");
    const dd = String(yesterday.getDate()).padStart(2, "0");

    const yesterdayStr = `${yyyy}-${mm}-${dd}`;

    console.log("📅 BranchDash yesterdayStr:", yesterdayStr);

    // DailyTaskModel: userId (ObjectId), branch, date ("YYYY-MM-DD"), todayQueries
    const lastDayTask = await DailyTaskModel.findOne({
      userId: userid,        // Mongoose will cast this string to ObjectId
      branch: branchname,
      date: yesterdayStr,
    }).select("todayQueries date");



    const lastDayPendingCount = lastDayTask?.todayQueries.length || 0;

    // -------------------------------------------------------------------------
    return NextResponse.json(
      {
        success: true,
        userid,
        branchname,
        lastDayPendingCount, // 👈 new field in response
        ...result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Count Fetch Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Server Error",
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
};
