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

    // === Only franchisestaff: "1" ===
    let allowedUserIds = [];

    if (userId) {
      // Check if this user is franchisestaff = "1"
      const staff = await AdminModel.findOne({
        _id: userId,
        franchisestaff: "1",
      }).select("_id");

      if (!staff) {
        // If user is not franchisestaff, return empty
        return NextResponse.json({
          success: true,
          message: "No tasks found for this user (not franchisestaff).",
          data: [],
        });
      }

      allowedUserIds = [staff._id];
    } else {
      // Get all franchisestaff = "1" (optionally within a branch)
      const adminFilter = { franchisestaff: "1" };

      if (branchId) {
        adminFilter.branch = branchId;
      }

      const staffList = await AdminModel.find(adminFilter).select("_id");
      allowedUserIds = staffList.map((u) => u._id);
    }

    // If no franchisestaff users found, return empty
    if (!allowedUserIds.length) {
      return NextResponse.json({
        success: true,
        message: "No franchisestaff users found",
        data: [],
      });
    }

    // Apply user filter
    query.userId = { $in: allowedUserIds };

    const dailyTasks = await DailyTaskModel.find(query)
      .populate({
        path: "userId",
        select: "name email branch franchisestaff",
        // if branch is not a ref, you can remove this populate
        // populate: { path: "branch", select: "branchName" },
      })
      .populate({
        path: "todayQueries pastDueQueries completedQueries pendingTodayQueries pendingPastDueQueries",
        model: QueryModel,
        select: "studentName studentContact qualification",
        options: { sort: { createdAt: -1 } },
      })
      .lean();

    if (!dailyTasks || dailyTasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No tasks found",
        data: [],
      });
    }

    // === Group by user ===
    const groupedData = {};

    dailyTasks.forEach((task) => {
      const uid = task.userId?._id.toString();

      if (!groupedData[uid]) {
        groupedData[uid] = {
          _id: uid,
          user: {
            _id: task.userId?._id,
            name: task.userId?.name,
            email: task.userId?.email,
            branchName: task.userId?.branch || "No Branch",
            franchisestaff: task.userId?.franchisestaff,
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
      groupedData[uid].stats.pastDueAssigned +=
        task.stats?.pastDueAssigned || 0;

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
