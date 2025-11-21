import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import DailyTaskModel from "@/model/DailyTaskModel";
import AdminModel from "@/model/Admin";
import QueryModel from "@/model/Query";
import AuditLog from "@/model/AuditLog";

export const runtime = "nodejs";

// Helper function to get start and end of current day in IST
function getCurrentDayRange() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const istDate = new Date(now.getTime() + (istOffset + now.getTimezoneOffset() * 60 * 1000));
  
  // Start of day in IST
  const startOfDay = new Date(istDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  // End of day in IST
  const endOfDay = new Date(istDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  // Convert back to UTC for MongoDB query
  return {
    start: new Date(startOfDay.getTime() - istOffset + (startOfDay.getTimezoneOffset() * 60 * 1000)),
    end: new Date(endOfDay.getTime() - istOffset + (endOfDay.getTimezoneOffset() * 60 * 1000)),
    dateString: istDate.toISOString().split('T')[0] // YYYY-MM-DD format
  };
}

export async function GET(request) {
  const authHeader = request.headers.get("authorization");

  if (
    authHeader !== process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const { start, end, dateString } = getCurrentDayRange();
    
    // Get all active admins
    const admins = await AdminModel.find({ status: true }, '_id name branch');
    
    const results = [];
    
    for (const admin of admins) {
      // Find queries worked on by this admin today
      const completedQueries = await AuditLog.aggregate([
        {
          $match: {
            actionby: admin._id.toString(),
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: "$queryId"
          }
        },
        {
          $count: "count"
        }
      ]);
      
      const completedCount = completedQueries.length > 0 ? completedQueries[0].count : 0;
      
      // Find pending queries assigned to this admin but not worked on today
      const pendingQueries = await QueryModel.find({
        assignedTo: admin._id,
        status: { $ne: 'completed' },
        $or: [
          { lastWorkedOn: { $exists: false } },
          { lastWorkedOn: { $lt: start } }
        ]
      }).countDocuments();
      
      // Get query IDs for completed and pending queries
      const completedQueryIds = await AuditLog.distinct('queryId', {
        actionby: admin._id.toString(),
        createdAt: { $gte: start, $lte: end }
      });
      
      const pendingQueryIds = await QueryModel.find({
        assignedTo: admin._id,
        status: { $ne: 'completed' },
        $or: [
          { lastWorkedOn: { $exists: false } },
          { lastWorkedOn: { $lt: start } }
        ]
      }).select('_id').lean();
      
      // Update or create DailyTaskModel entry
      const dailyTask = await DailyTaskModel.findOneAndUpdate(
        { 
          userId: admin._id, 
          date: dateString 
        },
        {
          $set: {
            completedCount,
            pendingCount: pendingQueries,
            completedQueries: completedQueryIds,
            pendingQueries: pendingQueryIds.map(q => q._id),
            branch: admin.branch,
            notes: `Auto-generated daily task for ${admin.name}`
          }
        },
        { 
          upsert: true, 
          new: true 
        }
      );
      
      results.push({
        adminId: admin._id,
        adminName: admin.name,
        completedCount,
        pendingCount: pendingQueries,
        dailyTaskId: dailyTask._id
      });
    }
    
    console.log("CRON JOB RUN SUCCESSFULLY", { date: dateString, results });

    return NextResponse.json({
      success: true,
      message: "Daily admin task statistics updated successfully",
      date: dateString,
      stats: results
    });
    
  } catch (error) {
    console.error("CRON ERROR:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Cron job failed", 
        error: error.message || String(error) 
      },
      { status: 500 }
    );
  }
}
