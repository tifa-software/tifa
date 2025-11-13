export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";

export const GET = async (request) => {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get("phoneNumber"); // Extract phone number from query param

    if (!phoneNumber) {
      return Response.json(
        { message: "Phone number is required", success: false },
        { status: 400 }
      );
    }

    // Fetch only one record with matching phone number
    const existingRecord = await QueryModel.findOne({
      defaultdata: "query",
      "studentContact.phoneNumber": phoneNumber,
    }).select("studentContact.phoneNumber branch");

    return Response.json(
      {
        message: "Query executed",
        success: true,
        exists: !!existingRecord,
        branch: existingRecord?.branch || null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching phone number:", error);
    return Response.json(
      {
        message: "Error fetching data",
        success: false,
      },
      { status: 500 }
    );
  }
};
