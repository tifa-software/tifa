import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import DailyTaskModel from "@/model/DailyTaskModel";
import AdminModel from "@/model/Admin";
import QueryModel from "@/model/Query";
import AuditLog from "@/model/AuditLog";
import mongoose from "mongoose";

export const runtime = "nodejs";

// Cache for admin data to reduce database calls
const adminCache = new Map();

// Batch size for processing queries
const BATCH_SIZE = 100;

/**
 * Parse a deadline string into a Date object
 * @param {string} deadlineStr - The deadline string to parse
 * @returns {Date|null} - Parsed date or null if invalid
 */
function parseDeadlineToDate(deadlineStr) {
  if (!deadlineStr || deadlineStr === "Not_Provided") return null;

  // Try ISO format first
  const tryIso = new Date(deadlineStr);
  if (!isNaN(tryIso.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(deadlineStr)) {
    return new Date(tryIso.getFullYear(), tryIso.getMonth(), tryIso.getDate());
  }

  // Try DD-MM-YYYY format
  const ddmmyyyy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
  // Try DD-MM-YY format
  const ddmmyy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/;
  
  let m;
  if ((m = deadlineStr.match(ddmmyyyy))) {
    const [_, dd, mm, yyyy] = m;
    return new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
  }
  if ((m = deadlineStr.match(ddmmyy))) {
    const [_, dd, mm, yy] = m;
    const yyyy = 2000 + parseInt(yy, 10);
    return new Date(yyyy, parseInt(mm, 10) - 1, parseInt(dd, 10));
  }

  // Try any other date format
  const alt = new Date(deadlineStr);
  if (!isNaN(alt.getTime())) {
    return new Date(alt.getFullYear(), alt.getMonth(), alt.getDate());
  }

  return null;
}

/**
 * Get the start and end of the current day in IST
 * @returns {Object} - Contains start, end, and dateString in IST
 */
function getCurrentDayRange() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  
  // Convert current time to IST
  const istDate = new Date(now.getTime() + (istOffset + now.getTimezoneOffset() * 60 * 1000));
  
  // Start of day in IST (00:00:00.000)
  const startOfDay = new Date(istDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  // End of day in IST (23:59:59.999)
  const endOfDay = new Date(istDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  // Convert back to UTC for MongoDB queries
  const utcStart = new Date(startOfDay.getTime() - (istOffset + startOfDay.getTimezoneOffset() * 60 * 1000));
  const utcEnd = new Date(endOfDay.getTime() - (istOffset + endOfDay.getTimezoneOffset() * 60 * 1000));
  
  return {
    start: utcStart,
    end: utcEnd,
    dateString: istDate.toISOString().split('T')[0] // YYYY-MM-DD format
  };
}

/**
 * Process a batch of queries for an admin
 * @param {Object} admin - Admin object
 * @param {Date} todayIST - Today's date in IST
 * @param {Date} start - Start of day in UTC
 * @param {Date} end - End of day in UTC
 * @returns {Promise<Object>} - Processed task data
 */
async function processAdminTasks(admin, todayIST, start, end) {
  try {
    // Get all active queries assigned to this admin
    const assignedQueries = await QueryModel.find({
      $or: [
        { userid: admin._id.toString(), assignedTo: "Not-Assigned" },
        { assignedTo: admin._id.toString() }
      ],
      autoclosed: 'open',
      addmission: false,
      demo: false
    }).select('_id deadline').lean();

    // Categorize queries
    const todayQueries = [];
    const pastDueQueries = [];
    
    for (const query of assignedQueries) {
      const deadline = parseDeadlineToDate(query.deadline);
      
      if (deadline) {
        // Compare dates without time
        const queryDate = new Date(deadline);
        queryDate.setHours(0, 0, 0, 0);
        
        if (queryDate.getTime() === todayIST.getTime()) {
          todayQueries.push(query._id);
        } else if (queryDate < todayIST) {
          pastDueQueries.push(query._id);
        }
      }
    }
    
    // Get completed queries for today (regardless of deadline)
    const completedQueryIds = await AuditLog.distinct('queryId', {
      actionby: admin._id.toString(),
      createdAt: { $gte: start, $lte: end }
    });
    
    // Calculate pending queries
    const pendingTodayQueries = todayQueries.filter(id => !completedQueryIds.includes(id));
    const pendingPastDueQueries = pastDueQueries.filter(id => !completedQueryIds.includes(id));
    
    return {
      adminId: admin._id,
      adminName: admin.name,
      branch: admin.branch,
      todayQueries,
      pastDueQueries,
      completedQueryIds,
      pendingTodayQueries,
      pendingPastDueQueries
    };
  } catch (error) {
    console.error(`Error processing tasks for admin ${admin._id}:`, error);
    throw error;
  }
}

/**
 * Update or create daily task for an admin
 * @param {Object} taskData - Task data to update
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Promise<Object>} - Updated/created task
 */
async function updateDailyTask(taskData, dateString) {
  const {
    adminId,
    adminName,
    branch,
    todayQueries,
    pastDueQueries,
    completedQueryIds,
    pendingTodayQueries,
    pendingPastDueQueries
  } = taskData;

  const completedCount = completedQueryIds.length;
  const totalPending = pendingTodayQueries.length + pendingPastDueQueries.length;

  return await DailyTaskModel.findOneAndUpdate(
    { userId: adminId, date: dateString },
    {
      $set: {
        completedCount,
        pendingCount: totalPending,
        todayQueries,
        pastDueQueries,
        completedQueries: completedQueryIds,
        pendingTodayQueries,
        pendingPastDueQueries,
        branch,
        notes: `Auto-generated daily task for ${adminName}`,
        stats: {
          totalAssigned: todayQueries.length + pastDueQueries.length,
          todayQueries: todayQueries.length,
          pastDueQueries: pastDueQueries.length,
          completedToday: completedCount,
          pendingToday: pendingTodayQueries.length,
          pendingPastDue: pendingPastDueQueries.length
        }
      }
    },
    { upsert: true, new: true }
  );
}

export async function GET(request) {
  const authHeader = request.headers.get("authorization");

  // Validate authorization
  if (authHeader !== process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { start, end, dateString } = getCurrentDayRange();
    
    // Get all active admins with pagination
    const totalAdmins = await AdminModel.countDocuments({ status: true });
    const results = [];
    
    // Process admins in batches
    for (let i = 0; i < totalAdmins; i += BATCH_SIZE) {
      const admins = await AdminModel.find(
        { status: true },
        '_id name branch',
        { skip: i, limit: BATCH_SIZE, session }
      );

      // Process each admin in parallel
      const adminPromises = admins.map(admin => 
        processAdminTasks(admin, new Date(start), start, end)
      );
      
      const tasks = await Promise.all(adminPromises);
      
      // Update tasks in parallel
      const updatePromises = tasks.map(taskData => 
        updateDailyTask(taskData, dateString).then(task => ({
          adminId: taskData.adminId,
          adminName: taskData.adminName,
          completedCount: task.completedCount,
          pendingCount: task.pendingCount,
          todayQueriesCount: task.todayQueries.length,
          pastDueQueriesCount: task.pastDueQueries.length,
          dailyTaskId: task._id
        }))
      );
      
      const batchResults = await Promise.all(updatePromises);
      results.push(...batchResults);
    }
    
    await session.commitTransaction();
    session.endSession();
    
    console.log("CRON JOB COMPLETED SUCCESSFULLY", { 
      date: dateString, 
      totalAdmins: results.length,
      summary: {
        totalCompleted: results.reduce((sum, r) => sum + r.completedCount, 0),
        totalPending: results.reduce((sum, r) => sum + r.pendingCount, 0)
      }
    });

    return NextResponse.json({
      success: true,
      message: "Daily admin task statistics updated successfully",
      date: dateString,
      stats: results,
      summary: {
        totalAdmins: results.length,
        totalCompleted: results.reduce((sum, r) => sum + r.completedCount, 0),
        totalPending: results.reduce((sum, r) => sum + r.pendingCount, 0)
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error("CRON JOB FAILED:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Cron job failed", 
        error: error.message || String(error),
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
