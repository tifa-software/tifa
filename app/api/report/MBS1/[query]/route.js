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
                const actionType = entry.actionType || "UNKNOWN";

                acc.dailyActivity[userId] = acc.dailyActivity[userId] || {};
                acc.dailyActivity[userId][actionDay] = (acc.dailyActivity[userId][actionDay] || 0) + 1;

                acc.weeklyActivity[userId] = acc.weeklyActivity[userId] || 0;
                if (actionDate >= startOfWeek) acc.weeklyActivity[userId]++;

                acc.trendAnalysis[userId] = acc.trendAnalysis[userId] || { currentWeek: 0, lastWeek: 0 };
                if (actionDate >= startOfWeek) {
                    acc.trendAnalysis[userId].currentWeek++;
                } else if (actionDate >= startOfLastWeek) {
                    acc.trendAnalysis[userId].lastWeek++;
                }

                acc.monthlyActivity[userId] = acc.monthlyActivity[userId] || {};
                acc.monthlyActivity[userId][actionMonth] = (acc.monthlyActivity[userId][actionMonth] || 0) + 1;

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


        // Calculate sent and received counts
        const sentReceivedCounts = admins.reduce((counts, admin) => {
            const adminId = admin._id.toString();
            counts[adminId] = { sent: 0, received: 0 };

            queries.forEach(query => {
                if (query.assignedsenthistory.includes(adminId)) counts[adminId].sent++;
                if (query.assignedreceivedhistory.includes(adminId)) counts[adminId].received++;
            });

            return counts;
        }, {});

       

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


        return Response.json({
            message: "Enhanced audit log analysis fetched successfully!",
            success: true,
            data: { userActivityReport },
        }, { status: 200 });

    } catch (error) {
        console.error("Error fetching data:", error);
        return Response.json({
            message: "Error fetching report!",
            success: false,
        }, { status: 500 });
    }
};
