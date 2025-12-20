export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AdminModel from "@/model/Admin";

/* Escape regex helper */
const escapeRegex = (string) =>
  string.replace(/[.*+?^=!:${}()|\[\]\/\\]/g, "\\$&");

export const GET = async (request) => {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);

    const referenceId = searchParams.get("referenceId");
    const suboption = searchParams.get("suboption");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const admission = searchParams.get("admission");
    const grade = searchParams.get("grade");
    const location = searchParams.get("location");
    const city = searchParams.get("city");
    const assignedName = searchParams.get("assignedName");
    const userName = searchParams.get("userName");
    const branch = searchParams.get("branch");
    const cours = searchParams.get("cours");

    /* ================= BASE FILTER (ONLY FRANCHISE) ================= */
    const queryFilter = {
      defaultdata: "query",
      branch: { $regex: /\(Franchise\)$/i }, // ✅ ONLY Franchise branch
    };

    /* ================= TEXT FILTERS ================= */
    if (referenceId) {
      const decoded = decodeURIComponent(referenceId);
      queryFilter.referenceid = {
        $regex: escapeRegex(decoded),
        $options: "i",
      };
    }

    if (suboption) {
      queryFilter.suboption = { $regex: suboption, $options: "i" };
    }

    if (grade) {
      queryFilter.lastgrade = { $regex: grade, $options: "i" };
    }

    if (location) {
      queryFilter.branch = { $regex: location, $options: "i" };
    }

    if (branch) {
      queryFilter.branch = { $regex: branch, $options: "i" };
    }

    if (cours) {
      queryFilter.courseInterest = { $regex: cours, $options: "i" };
    }

    /* ================= DATE FILTER ================= */
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);

      if (isNaN(from) || isNaN(to)) {
        throw new Error("Invalid date format");
      }

      queryFilter.createdAt = { $gte: from, $lte: to };
    }

    /* ================= BOOLEAN FILTER ================= */
    if (admission) {
      queryFilter.addmission = admission === "true";
    }

    /* ================= CITY FILTER ================= */
    if (city) {
      if (city.toLowerCase() === "jaipur") {
        queryFilter["studentContact.city"] = {
          $regex: "^Jaipur$",
          $options: "i",
        };
      } else {
        queryFilter["studentContact.city"] = { $ne: "Jaipur" };
      }
    }

    /* ================= ASSIGNED ADMIN (ONLY FRANCHISE STAFF) ================= */
    if (assignedName) {
      if (assignedName === "Not-Assigned") {
        queryFilter.assignedTo = "Not-Assigned";
      } else {
        const admin = await AdminModel.findOne({
          name: { $regex: assignedName, $options: "i" },
          franchisestaff: "1", // ✅ ONLY Franchise staff
        }).lean();

        if (admin) {
          queryFilter.assignedTo = admin._id;
        } else {
          queryFilter.assignedTo = { $exists: false };
        }
      }
    }

    /* ================= USER NAME FILTER (ONLY FRANCHISE STAFF) ================= */
    if (userName) {
      const decodedUserName = decodeURIComponent(userName);

      const admin = await AdminModel.findOne({
        name: { $regex: escapeRegex(decodedUserName), $options: "i" },
        franchisestaff: "1", // ✅ ONLY Franchise staff
      }).lean();

      if (admin) {
        queryFilter.userid = {
          $in: [admin._id, admin._id.toString()],
        };
      } else {
        queryFilter.userid = { $exists: false };
      }
    }

    /* ================= AGGREGATION COUNTS ================= */
    const [result] = await QueryModel.aggregate([
      { $match: queryFilter },
      {
        $facet: {
          total: [{ $count: "count" }],

          admitted: [
            { $match: { addmission: true } },
            { $count: "count" },
          ],

          pendingOpen: [
            { $match: { addmission: false, autoclosed: "open" } },
            { $count: "count" },
          ],

          demo: [
            { $match: { demo: true } },
            { $count: "count" },
          ],

          stage6: [
            { $match: { stage: 6 } },
            { $count: "count" },
          ],

          jaipur: [
            { $match: { "studentContact.city": "Jaipur" } },
            { $count: "count" },
          ],

          nonJaipur: [
            { $match: { "studentContact.city": { $ne: "Jaipur" } } },
            { $count: "count" },
          ],

          closedNonAdmit: [
            { $match: { addmission: false, autoclosed: "close" } },
            { $count: "count" },
          ],
        },
      },
    ]);

    const getCount = (arr) => (arr?.[0]?.count ?? 0);

    const counts = {
      total: getCount(result.total),
      admitted: getCount(result.admitted),
      pendingOpen: getCount(result.pendingOpen),
      demo: getCount(result.demo),
      stage6: getCount(result.stage6),
      jaipur: getCount(result.jaipur),
      nonJaipur: getCount(result.nonJaipur),
      closedNonAdmit: getCount(result.closedNonAdmit),
    };

    return Response.json(
      {
        success: true,
        message: "Franchise counts fetched successfully",
        counts,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Franchise count error:", error);
    return Response.json(
      {
        success: false,
        message: "Error fetching franchise counts",
      },
      { status: 500 }
    );
  }
};
