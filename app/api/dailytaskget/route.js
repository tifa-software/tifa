import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import dbConnect from "@/lib/dbConnect";
import DailyTaskModel from "@/model/DailyTaskModel";
import AdminModel from "@/model/Admin";
import QueryModel from "@/model/Query";

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query = {};

    // Date Range filter
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = { $gte: startDate };
    } else if (endDate) {
      query.date = { $lte: endDate };
    }

    // User / Branch filter
    if (userId) {
      query.userId = userId;
    } else if (branchId) {
      const usersInBranch = await AdminModel.find({ branch: branchId }).select("_id");
      query.userId = { $in: usersInBranch.map((u) => u._id) };
    }

    const dailyTasks = await DailyTaskModel.find(query)
      .populate({
        path: "userId",
        select: "name email branch",
        populate: { path: "branch", select: "branchName" }
      })
      .populate({
        path: "todayQueries pastDueQueries completedQueries pendingTodayQueries pendingPastDueQueries",
        model: QueryModel,
        select: "studentName studentContact qualification",
        options: { sort: { createdAt: -1 } }
      })
      .lean();

    if (!dailyTasks || dailyTasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No tasks found",
        data: []
      });
    }

    // === Group by user ===
    const groupedData = {};

    dailyTasks.forEach(task => {
      const uid = task.userId?._id.toString();

      if (!groupedData[uid]) {
        groupedData[uid] = {
          _id: uid,
          user: {
            _id: task.userId?._id,
            name: task.userId?.name,
            email: task.userId?.email,
            branchName: task.userId?.branch?.branchName || "No Branch",
          },
          stats: {
            totalAssigned: 0,
            todayAssigned: 0,
            pastDueAssigned: 0,
          },
          todayQueries: [],
          pastDueQueries: [],
        };
      }

      // Merge Stats
      groupedData[uid].stats.totalAssigned += task.stats?.totalAssigned || 0;
      groupedData[uid].stats.todayAssigned += task.stats?.todayAssigned || 0;
      groupedData[uid].stats.pastDueAssigned += task.stats?.pastDueAssigned || 0;

      // Merge Queries
      if (Array.isArray(task.todayQueries)) {
        groupedData[uid].todayQueries.push(...task.todayQueries);
      }
      if (Array.isArray(task.pastDueQueries)) {
        groupedData[uid].pastDueQueries.push(...task.pastDueQueries);
      }
    });

    const formatted = Object.values(groupedData);

    return NextResponse.json({
      success: true,
      message: "Daily tasks retrieved successfully",
      data: formatted,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        success: false,
        message: "Error fetching daily tasks",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
