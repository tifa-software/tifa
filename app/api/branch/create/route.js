export const runtime = "nodejs";
export const preferredRegion = ["bom1"];
import dbConnect from "@/lib/dbConnect";
import BranchModel from "@/model/Branch";

export async function POST(req) {
    await dbConnect();

    try {
        let branch = await req.json();

        // If branch is franchise → enforce suffix
        if (branch.franchise === "1") {
            branch.branch_name = branch.branch_name.replace("-(Franchise)", "").trim();
            branch.branch_name += "-(Franchise)";
        } else {
            // Clean main branch names if suffix present accidentally
            branch.branch_name = branch.branch_name.replace("-(Franchise)", "").trim();
        }

        const newbranch = new BranchModel(branch);
        await newbranch.save();

        return Response.json(
            {
                message: "Branch Registered Successfully",
                success: true,
                data: { id: newbranch._id }
            },
            { status: 200 }
        );
    } catch (error) {
        console.log(error);
        return Response.json(
            {
                message: "Error in Branch Registration",
                success: false
            },
            { status: 500 }
        );
    }
}
