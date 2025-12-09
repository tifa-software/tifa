export const runtime = "nodejs";
export const preferredRegion = ["bom1"];
import dbConnect from "@/lib/dbConnect";
import QueryUpdateModel from "@/model/AuditLog";
import QueryModel from "@/model/Query";
import AdminModel from "@/model/Admin";

export const PATCH = async (request) => {
    await dbConnect();

    try {
        const data = await request.json();

        if (!data.queryId) {
            return new Response(
                JSON.stringify({
                    message: "queryId is required",
                    success: false,
                }),
                { status: 400 }
            );
        }

        const audit = await QueryUpdateModel.findOne({ queryId: data.queryId });

        if (!audit) {
            return new Response(
                JSON.stringify({
                    message: "Received invalid audit id!",
                    success: false,
                }),
                { status: 404 }
            );
        }

        // Find Admin User ID
        let adminUser = null;
        if (data.actionbyemail) {
            adminUser = await AdminModel.findOne({
                email: data.actionbyemail,
            }).select("_id name email");
        }

        const actionById = adminUser?._id?.toString() || "system";
        console.log("ActionByID => ", actionById);

        // Track changes
        const changes = {};
        for (const key in data) {
            if (JSON.stringify(audit[key]) !== JSON.stringify(data[key])) {
                changes[key] = {
                    oldValue: audit[key],
                    newValue: data[key],
                };
            }
        }

        // Ensure actionByid change is always logged
        changes["actionByid"] = {
            oldValue: audit?.history?.length
                ? audit.history[audit.history.length - 1]?.actionByid || ""
                : "",
            newValue: actionById,
        };

        // Create History Entry
        const historyEntry = {
            action: "update",
            stage: data.stage || audit.stage || "unknown",
            actionBy: data.actionby || "system",
            actionByid: actionById,
            actionDate: new Date(),
            changes: changes,
        };

        // Update Audit & Push History
        await QueryUpdateModel.updateOne(
            { queryId: data.queryId },
            {
                $set: data,
                $push: { history: historyEntry },
            }
        );

        // Update deadline & Query info
        const deadline = data.deadline ? new Date(data.deadline) : new Date();
        if (!data.deadline) {
            deadline.setDate(deadline.getDate() + 1);
        }

        const lastMessage = changes.message
            ? changes.message.newValue
            : audit.message || "N/A";

        await QueryModel.updateOne(
            { _id: data.queryId },
            {
                $set: {
                    deadline: deadline.toISOString(),
                    lastDeadline: new Date().toISOString(),
                    lastgrade: data.grade || audit.grade,
                    lastmessage: lastMessage,
                    lastactionby: data.actionby || "system",
                },
            }
        );

        return new Response(
            JSON.stringify({
                message: "Audit updated successfully!",
                success: true,
                auditid: data.queryId,
            }),
            { status: 200 }
        );
    } catch (error) {
        console.error("Error updating audit or deadline:", error);
        return new Response(
            JSON.stringify({
                message: "Error updating audit or deadline!",
                success: false,
                error: error.message,
            }),
            { status: 500 }
        );
    }
};
