export const runtime = "nodejs";
export const preferredRegion = ["bom1"]; 
import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AdminModel from "@/model/Admin";
import AuditLog from "@/model/AuditLog";

export const GET = async (request, context) => {
    await dbConnect();
    const adminId = context.params.userid;
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const now = new Date();
    const todayISO = now.toISOString().split("T")[0];

    // Determine filter date range (default to today)
    const startDateStr = startDateParam || todayISO;
    const endDateStr = endDateParam || startDateStr;

    const filterStart = new Date(`${startDateStr}T00:00:00.000Z`);
    const filterEnd = new Date(`${endDateStr}T23:59:59.999Z`);

    try {
        if (!adminId) {
            return Response.json({
                message: "Admin ID is required.",
                success: false,
            }, { status: 400 });
        }

        const admin = await AdminModel.findById(adminId, { _id: 1, name: 1, branch: 1 });
        if (!admin) {
            return Response.json({
                message: "Admin not found.",
                success: false,
            }, { status: 404 });
        }

        const queries = await QueryModel.find({
            $or: [
                { userid: admin._id, assignedTo: "Not-Assigned" },
                { assignedTo: admin._id }
            ],
        });
        const queryIds = queries.map(q => q._id.toString());

        // Fetch only logs within the requested date range for better performance
        const auditLogs = await AuditLog.find({
            queryId: { $in: queryIds },
            createdAt: { $gte: filterStart, $lte: filterEnd },
        });

        const todayDate = todayISO;
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

        let dailyConnectionStatus = {};

        const analytics = auditLogs.reduce((acc, log) => {
            const queryId = log.queryId.toString();
            const logCreatedAt = new Date(log.createdAt);
            const logDate = logCreatedAt.toISOString().split("T")[0];

            // Extra safety: ensure log itself is in range (in case createdAt filter changes later)
            if (logCreatedAt < filterStart || logCreatedAt > filterEnd) {
                return acc;
            }
            
            if (!dailyConnectionStatus[logDate]) {
                dailyConnectionStatus[logDate] = {
                    no_connected: 0,
                    not_lifting: 0,
                    connected: 0,
                    no_connectedsubStatus: {},
                    not_liftingsubStatus: {},
                    connectedsubStatus: {}
                };
            }
            
            const connectionStatus = log.connectionStatus;
            const connectionSubStatus = log[`${connectionStatus}subStatus`];
            
            if (connectionStatus === "no_connected") {
                dailyConnectionStatus[logDate].no_connected++;
                dailyConnectionStatus[logDate].no_connectedsubStatus[connectionSubStatus] =
                    (dailyConnectionStatus[logDate].no_connectedsubStatus[connectionSubStatus] || 0) + 1;
            } else if (connectionStatus === "not_lifting") {
                dailyConnectionStatus[logDate].not_lifting++;
                dailyConnectionStatus[logDate].not_liftingsubStatus[connectionSubStatus] =
                    (dailyConnectionStatus[logDate].not_liftingsubStatus[connectionSubStatus] || 0) + 1;
            } else if (connectionStatus === "connected") {
                dailyConnectionStatus[logDate].connected++;
                dailyConnectionStatus[logDate].connectedsubStatus[connectionSubStatus] =
                    (dailyConnectionStatus[logDate].connectedsubStatus[connectionSubStatus] || 0) + 1;
            }

            log.history.forEach(entry => {
                const actionDateObj = new Date(entry.actionDate);

                // Skip actions outside the requested date range
                if (actionDateObj < filterStart || actionDateObj > filterEnd) {
                    return;
                }

                const actionDate = actionDateObj.toISOString().split("T")[0];
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
                if (queryData) {
                    let existingQuery = acc.dailyActivity[actionDate].queries.find(q => q._id.toString() === queryId);
                    
                    if (!existingQuery) {
                        existingQuery = { ...queryData.toObject(), connectionStatus: [] };
                        acc.dailyActivity[actionDate].queries.push(existingQuery);
                    }
                    
                    const status = entry.changes?.connectionStatus?.newValue || log.connectionStatus;
                    const subStatus = entry.changes?.[`${status}subStatus`]?.newValue || log[`${status}subStatus`];
                    existingQuery.connectionStatus.push({ status, subStatus, time: entry.actionDate });
                }

                acc.monthlyActivity[actionMonth] = acc.monthlyActivity[actionMonth] || [0, 0];
                acc.monthlyActivity[actionMonth][0]++;
                acc.monthlyActivity[actionMonth][1] += admissionsCount;

                if (actionDate >= startOfWeek) acc.weeklyActivity++;

                if (actionDate >= startOfWeek) {
                    acc.trendAnalysis.currentWeek++;
                } else if (actionDate >= startOfLastWeek) {
                    acc.trendAnalysis.lastWeek++;
                }

                acc.actionBreakdown[actionType] = (acc.actionBreakdown[actionType] || 0) + 1;
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
            dailyConnectionStatus,
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