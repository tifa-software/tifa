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

    const formatted = dailyTasks.map((task) => ({
      _id: task._id,
      date: task.date,
      dayStatus: task.dayStatus,
      dayOpenedAt: task.dayOpenedAt,
      dayClosedAt: task.dayClosedAt,
      user: {
        _id: task.userId?._id,
        name: task.userId?.name,
        email: task.userId?.email,
        branchName: task.userId?.branch?.branchName || "No Branch",
      },
      stats: {
        completed: task.completedCount,
        pending: task.pendingCount,
        totalAssigned: task.stats?.totalAssigned || 0,
        todayAssigned: task.stats?.todayQueries || 0,
        pastDueAssigned: task.stats?.pastDueQueries || 0,
      },
      todayQueries: task.todayQueries || [],
      pastDueQueries: task.pastDueQueries || [],
      completedQueries: task.completedQueries || [],
    }));

    return NextResponse.json({
      success: true,
      message: "Daily tasks retrieved successfully",
      data: formatted,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({
      success: false,
      message: "Error fetching daily tasks",
      error: error.message,
    }, { status: 500 });
  }
}
