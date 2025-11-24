export const runtime = "nodejs";
export const preferredRegion = ["bom1"];
import dbConnect from "@/lib/dbConnect";
import BranchModel from "@/model/Branch";

export const GET = async (request) => {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const franchiseParam = searchParams.get("franchise");

    let filter = { defaultdata: "branch" };

    if (franchiseParam === "true") {
      // Franchise only
      filter.franchise = "1";
    } else {
      // Default + false → Main only (exclude franchise)
      filter.franchise = { $ne: "1" };
    }

    const fetch = await BranchModel.find(filter);

    return Response.json(
      {
        message: "Filtered branch list",
        success: true,
        fetch,
      },
      { status: 200 }
    );

  } catch (error) {
    console.log("Error on getting data list:", error);
    return Response.json(
      {
        message: "Error on getting data list!",
        success: false,
      },
      { status: 500 }
    );
  }
};
