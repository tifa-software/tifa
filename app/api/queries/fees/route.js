import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";

export const PATCH = async (request) => {
    await dbConnect();
    try {
        const data = await request.json();

        // Check if the query exists
        const querie = await QueryModel.findOne({ _id: data.id });

        if (!querie) {
            return new Response(
                JSON.stringify({
                    message: "Received invalid query id!",
                    success: false,
                }),
                { status: 404 }
            );
        }

        // Only update the fees array
        if (data.fees) {
            const newFee = {
                feesType: data.fees.feesType || "Not_Provided",
                feesAmount: data.fees.feesAmount || 0,
                transactionDate: data.fees.transactionDate || new Date(),
            };

            // Add the new fee entry to the fees array
            await QueryModel.updateOne(
                { _id: data.id },
                { $push: { fees: newFee } }
            );

            // Calculate the updated total amount
            const totalAmount =
                querie.fees.reduce((sum, fee) => sum + fee.feesAmount, 0) +
                newFee.feesAmount;

            // Determine addmission and demo status based on the total amount
            let addmissionStatus = false;
            let demoStatus = false;

            if (totalAmount >= 5000) {
                addmissionStatus = true; // Set addmission to true if total is >= 5000
            } else if (totalAmount > 1 && totalAmount < 5000) {
                demoStatus = true; // Set demo to true if total is > 1 and < 5000
            }

            // Create an object to store all updated fields
            const updatedFields = {
                total: totalAmount,
                addmission: addmissionStatus,
                demo: demoStatus,
            };

            // Update the fields in the database
            await QueryModel.updateOne(
                { _id: data.id },
                { $set: updatedFields }
            );

            // Log the history of this update
            const historyEntry = {
                action: "Update",
                stage: "query-updated", // Define the stage as "query-updated"
                actionBy: data.actionBy, // Assuming actionBy is part of the request data (Admin ID)
                actionDate: new Date(),
                changes: {
                    fees: newFee,
                    ...updatedFields,
                },
            };

            // Save the changes in the history array
            await QueryModel.updateOne(
                { _id: data.id },
                { $push: { history: historyEntry } }
            );

            return new Response(
                JSON.stringify({
                    message: "Fees updated, total calculated, and history saved!",
                    success: true,
                    queryId: data.id,
                }),
                { status: 200 }
            );
        } else {
            return new Response(
                JSON.stringify({
                    message: "No fees data provided!",
                    success: false,
                }),
                { status: 400 }
            );
        }
    } catch (error) {
        console.log("Error on updating fees:", error);
        return new Response(
            JSON.stringify({
                message: "Error on updating fees!",
                success: false,
            }),
            { status: 500 }
        );
    }
};
