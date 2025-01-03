import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AdminModel from "@/model/Admin";
import AuditLog from "@/model/AuditLog";
export const GET = async () => {
    await dbConnect();

    try {
        // Fetch all queries and admins
        const queries = await QueryModel.find({});
        const admins = await AdminModel.find({}, { _id: 1, name: 1, branch: 1 });
        const adminMap = admins.reduce((map, admin) => {
            map[admin._id.toString()] = { name: admin.name, branch: admin.branch };
            map[admin.name] = { name: admin.name, branch: admin.branch }; // Map names too
            return map;
        }, {});

        // Fetch audit logs for queries
        const auditLogs = await AuditLog.find({ queryId: { $in: queries.map(q => q._id) } });

        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

        const analytics = auditLogs.reduce((acc, log) => {
            log.history.forEach(entry => {
                const actionDate = new Date(entry.actionDate);
                const actionDay = actionDate.toISOString().split("T")[0];
                const actionMonth = actionDate.toISOString().slice(0, 7);
                const userId = entry.actionBy;
                const actionType = entry.action || "UNKNOWN";
            
                // Initialize data structures for the user
                acc.dailyActivity[userId] = acc.dailyActivity[userId] || {};
                acc.dailyActivity[userId][actionDay] = acc.dailyActivity[userId][actionDay] || [0, 0];
            
                // Increment action count
                acc.dailyActivity[userId][actionDay][0]++;
            
                // Check for enrollment-related actions in the changes map and count admissions
                let admissionsCount = 0;
                if (
                    entry.changes.get("oflinesubStatus")?.newValue === "admission" ||
                    entry.changes.get("onlinesubStatus")?.newValue === "admission"
                ) {
                    admissionsCount = 1; // This entry is an admission
                    acc.dailyActivity[userId][actionDay][1]++; // Increment the daily admission count
                }
            
                // Increment the total activity and admissions counts for the month
                acc.monthlyActivity[userId] = acc.monthlyActivity[userId] || {};
                const currentMonthData = acc.monthlyActivity[userId][actionMonth] || [0, 0];
                
                // Increment the activity count (first element) and admissions count (second element)
                currentMonthData[0]++;  // Increment total activity
                currentMonthData[1] += admissionsCount;  // Increment admissions count if it's an admission
                acc.monthlyActivity[userId][actionMonth] = currentMonthData;
        
                // Track weekly, trend, and other breakdowns as before
                acc.weeklyActivity[userId] = acc.weeklyActivity[userId] || 0;
                if (actionDate >= startOfWeek) acc.weeklyActivity[userId]++;
            
                acc.trendAnalysis[userId] = acc.trendAnalysis[userId] || { currentWeek: 0, lastWeek: 0 };
                if (actionDate >= startOfWeek) {
                    acc.trendAnalysis[userId].currentWeek++;
                } else if (actionDate >= startOfLastWeek) {
                    acc.trendAnalysis[userId].lastWeek++;
                }
            
                acc.actionBreakdown[userId] = acc.actionBreakdown[userId] || {};
                acc.actionBreakdown[userId][actionType] = (acc.actionBreakdown[userId][actionType] || 0) + 1;
            });
        
            return acc;
        }, {
            dailyActivity: {},
            weeklyActivity: {},
            monthlyActivity: {},
            actionBreakdown: {},
            trendAnalysis: {}
        });
        

        // Grouping the user activity reports by userId to prevent duplicates
        const userActivityReport = Object.entries(analytics.dailyActivity).map(([userId, days]) => {
            let adminData;

            if (userId === "system") {
                adminData = { name: "System", branch: "System" };
            } else {
                adminData = adminMap[userId] || { name: "Unknown", branch: "Unknown" };
            }

            if (!adminMap[userId] && userId !== "system") {
                console.warn(`No admin found for userId: ${userId}`);
            }

            return {
                userName: adminData.name,
                branch: adminData.branch,
                dailyActivity: days,
                weeklyActivity: analytics.weeklyActivity[userId] || 0,
                monthlyActivity: analytics.monthlyActivity[userId] || {},
                actionBreakdown: analytics.actionBreakdown[userId] || {},
                trendAnalysis: analytics.trendAnalysis[userId]
                    ? {
                        currentWeek: analytics.trendAnalysis[userId].currentWeek,
                        lastWeek: analytics.trendAnalysis[userId].lastWeek,
                        change: analytics.trendAnalysis[userId].currentWeek - analytics.trendAnalysis[userId].lastWeek,
                    }
                    : null,
            };
        });

        // Remove duplicate user entries by aggregating daily activity for each user
        const finalUserActivityReport = [];
        const userIdsProcessed = new Set();

        userActivityReport.forEach(item => {
            if (item.userName !== "System" && item.branch !== "System" && !userIdsProcessed.has(item.userName)) {
                finalUserActivityReport.push(item);
                userIdsProcessed.add(item.userName);
            }
        });

        return Response.json({
            message: "Enhanced audit log analysis fetched successfully!",
            success: true,
            data: { userActivityReport: finalUserActivityReport },
        }, { status: 200 });

    } catch (error) {
        console.error("Error fetching data:", error);
        return Response.json({
            message: "Error fetching report!",
            success: false,
        }, { status: 500 });
    }
};
