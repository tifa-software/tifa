import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";

export const PATCH = async (request) => {
    await dbConnect();
    try {
        const data = await request.json();

        const Query = await QueryModel.findOne({ _id: data.id });

        if (!Query) {
            return new Response(
                JSON.stringify({
                    message: "Received invalid Query id!",
                    success: false,
                }),
                { status: 404 }
            );
        }

        await QueryModel.updateOne(
            { _id: data.id },
            { $set: data }   
        );

        return new Response(
            JSON.stringify({
                message: "Query updated!",
                success: true,
                Queryid: data.id,
            }),
            { status: 200 }
        );
    } catch (error) {
        console.log("Error on updating Query:", error);
        return new Response(
            JSON.stringify({
                message: "Error on updating Query!",
                success: false,
            }),
            { status: 500 }
        );
    }
};
