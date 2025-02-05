import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AdminModel from "@/model/Admin";
import AuditLog from "@/model/AuditLog";

export const GET = async (request, context) => {
    await dbConnect();
    const adminId = context.params.userid;

    try {
        if (!adminId) {
            return Response.json({
                message: "Admin ID is required.",
                success: false,
            }, { status: 400 });
        }

        // Fetch the specific admin
        const admin = await AdminModel.findById(adminId, { _id: 1, name: 1, branch: 1 });
        if (!admin) {
            return Response.json({
                message: "Admin not found.",
                success: false,
            }, { status: 404 });
        }

        // Fetch queries assigned to the admin
        const queries = await QueryModel.find({
            $or: [
                { userid: admin._id, assignedTo: "Not-Assigned" },
                { assignedTo: admin._id }
            ],
        });
        const queryIds = queries.map(q => q._id.toString());

        // Fetch audit logs for these queries
        const auditLogs = await AuditLog.find({ queryId: { $in: queryIds } });

        const now = new Date();
        const todayDate = now.toISOString().split("T")[0]; // Format: YYYY-MM-DD
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

        let dailyConnectionStatus = {}; // Object to store daily connection status

        const analytics = auditLogs.reduce((acc, log) => {
            const queryId = log.queryId.toString();
            const logDate = new Date(log.createdAt).toISOString().split("T")[0];

            // Initialize the date entry if it doesn't exist
            if (!dailyConnectionStatus[logDate]) {
                dailyConnectionStatus[logDate] = { no_connected: 0, not_lifting: 0, connected: 0 };
            }

            // Count connection statuses for each day
            if (log.connectionStatus === "no_connected") {
                dailyConnectionStatus[logDate].no_connected++;
            } else if (log.connectionStatus === "not_lifting") {
                dailyConnectionStatus[logDate].not_lifting++;
            } else if (log.connectionStatus === "connected") {
                dailyConnectionStatus[logDate].connected++;
            }

            log.history.forEach(entry => {
                const actionDate = new Date(entry.actionDate).toISOString().split("T")[0];
                const actionMonth = actionDate.slice(0, 7);
                const actionType = entry.action || "UNKNOWN";

                acc.dailyActivity[actionDate] = acc.dailyActivity[actionDate] || { count: [0, 0], queries: [] };
                acc.dailyActivity[actionDate].count[0]++;
                let admissionsCount = 0;

                if (
                    entry.changes.oflinesubStatus?.newValue === "admission" ||
                    entry.changes.onlinesubStatus?.newValue === "admission"
                ) {
                    admissionsCount = 1;
                    acc.dailyActivity[actionDate].count[1]++;
                }

                const queryData = queries.find(q => q._id.toString() === queryId);
                if (queryData && !acc.dailyActivity[actionDate].queries.some(q => q._id.toString() === queryId)) {
                    acc.dailyActivity[actionDate].queries.push(queryData);
                }

                acc.monthlyActivity[actionMonth] = acc.monthlyActivity[actionMonth] || [0, 0];
                acc.monthlyActivity[actionMonth][0]++;
                acc.monthlyActivity[actionMonth][1] += admissionsCount;

                acc.weeklyActivity = acc.weeklyActivity || 0;
                if (actionDate >= startOfWeek) acc.weeklyActivity++;

                acc.trendAnalysis = acc.trendAnalysis || { currentWeek: 0, lastWeek: 0 };
                if (actionDate >= startOfWeek) {
                    acc.trendAnalysis.currentWeek++;
                } else if (actionDate >= startOfLastWeek) {
                    acc.trendAnalysis.lastWeek++;
                }

                acc.actionBreakdown[actionType] = (acc.actionBreakdown[actionType] || 0) + 1;

                // Store connection status for each day
                if (!dailyConnectionStatus[actionDate]) {
                    dailyConnectionStatus[actionDate] = { no_connected: 0, not_lifting: 0, connected: 0 };
                }

                const status = entry.changes?.connectionStatus?.newValue || log.connectionStatus;
                if (status === "no_connected") {
                    dailyConnectionStatus[actionDate].no_connected++;
                } else if (status === "not_lifting") {
                    dailyConnectionStatus[actionDate].not_lifting++;
                } else if (status === "connected") {
                    dailyConnectionStatus[actionDate].connected++;
                }
            });

            return acc;
        }, {
            dailyActivity: {},
            weeklyActivity: 0,
            monthlyActivity: {},
            actionBreakdown: {},
            trendAnalysis: { currentWeek: 0, lastWeek: 0 },
        });

        const userActivityReport = {
            userName: admin.name,
            branch: admin.branch,
            dailyActivity: analytics.dailyActivity,
            weeklyActivity: analytics.weeklyActivity,
            monthlyActivity: analytics.monthlyActivity,
            actionBreakdown: analytics.actionBreakdown,
            trendAnalysis: {
                currentWeek: analytics.trendAnalysis.currentWeek,
                lastWeek: analytics.trendAnalysis.lastWeek,
                change: analytics.trendAnalysis.currentWeek - analytics.trendAnalysis.lastWeek,
            },
            dailyConnectionStatus, // Send connection status for each day
        };

        return Response.json({
            message: "Admin-specific audit log analysis fetched successfully!",
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
