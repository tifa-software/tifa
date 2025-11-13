export const runtime = "nodejs";
export const preferredRegion = ["bom1"];
import dbConnect from "@/lib/dbConnect";
import AdminModel from "@/model/Admin";

export async function GET(req, context) {
  await dbConnect();

  try {
    const { emailid } = context.params || {};
    if (!emailid) {
      return new Response(JSON.stringify({ success: false, message: "Email ID required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await AdminModel.findOne({ email: emailid })
      .select("-password -__v")
      .lean();

    if (!user) {
      return new Response(JSON.stringify({ success: false, message: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(user), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Error on getting user:", error);
    return new Response(JSON.stringify({ success: false, message: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
