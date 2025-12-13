import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import PerformanceModel from "@/model/Performace";
import AdminModel from "@/model/Admin";

export const runtime = "nodejs";

export async function GET(request) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");
    const branchFilter = searchParams.get("branch");
    const adminFilter = searchParams.get("adminName");

    let startDate, endDate;

    /* 1️⃣ DATE LOGIC */
    if (startParam && endParam) {
      const s = new Date(startParam);
      const e = new Date(endParam);
      startDate = new Date(s.getFullYear(), s.getMonth(), s.getDate());
      endDate = new Date(e.getFullYear(), e.getMonth(), e.getDate() + 1);
    } else {
      const lastDoc = await PerformanceModel.findOne({ defaultdata: "performance" })
        .sort({ createdAt: -1 })
        .select("createdAt")
        .lean();

      if (!lastDoc) {
        return NextResponse.json({
          success: true,
          data: [],
          meta: { branches: [], admins: [] }
        });
      }

      const d = new Date(lastDoc.createdAt);
      startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);
    }

    /* 2️⃣ FETCH ADMINS (❌ EXCLUDE franchise staff) */
    const allAdmins = await AdminModel.find(
      { franchisestaff: { $ne: "1" } }, // ✅ IMPORTANT
      { name: 1, branch: 1 }
    ).lean();

    const allowedAdminIds = allAdmins.map(a => a._id.toString());

    const branches = [...new Set(allAdmins.map(a => a.branch))].filter(Boolean);

    /* 3️⃣ FETCH PERFORMANCE DATA (only allowed admins) */
    const performanceEntries = await PerformanceModel.find({
      defaultdata: "performance",
      userid: { $in: allowedAdminIds }, // ✅ FILTER HERE
      createdAt: { $gte: startDate, $lt: endDate }
    }).lean();

    /* 4️⃣ GROUPING LOGIC */
    const groupedData = {};

    performanceEntries.forEach((item) => {
      const uid = item.userid.toString();

      if (!groupedData[uid]) {
        groupedData[uid] = {
          userid: uid,
          totalcount: 0,
          workcount: 0,
          pendingcount: 0,
          enrollcount: 0
        };
      }

      groupedData[uid].totalcount += Number(item.totalcount || 0);
      groupedData[uid].workcount += Number(item.workcount || 0);
      groupedData[uid].pendingcount += Number(item.pendingcount || 0);
      groupedData[uid].enrollcount += Number(item.enrollcount || 0);
    });

    /* 5️⃣ ATTACH ADMIN DETAILS */
    const adminMap = {};
    allAdmins.forEach(a => {
      adminMap[a._id.toString()] = a;
    });

    let finalData = Object.values(groupedData).map(item => {
      const admin = adminMap[item.userid] || {};
      return {
        ...item,
        adminName: admin.name || "Unknown",
        adminBranch: admin.branch || "N/A"
      };
    });

    /* 6️⃣ SERVER SIDE FILTERS */
    if (branchFilter && branchFilter !== "all") {
      finalData = finalData.filter(i => i.adminBranch === branchFilter);
    }

    if (adminFilter && adminFilter !== "all") {
      finalData = finalData.filter(i => i.adminName === adminFilter);
    }

    return NextResponse.json({
      success: true,
      meta: { branches, admins: allAdmins },
      data: finalData
    });

  } catch (error) {
    console.error("API ERROR:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
