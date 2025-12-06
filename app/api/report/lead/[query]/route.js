export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AdminModel from "@/model/Admin";

// Helper function to escape special characters in a regex
const escapeRegex = (string) => {
  return string.replace(/[.*+?^=!:${}()|\[\]\/\\]/g, "\\$&"); // Escape regex special characters
};

export const GET = async (request) => {
  await dbConnect();

  try {
    // Parse query parameters
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

    // Base filter
    const queryFilter = { defaultdata: "query" };

    if (referenceId) {
      const decodedReferenceId = decodeURIComponent(referenceId);
      const escapedReferenceId = escapeRegex(decodedReferenceId);
      queryFilter.referenceid = { $regex: escapedReferenceId, $options: "i" };
    }

    if (suboption) {
      queryFilter.suboption = { $regex: suboption, $options: "i" };
    }

    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);

      if (!isNaN(from) && !isNaN(to)) {
        queryFilter.createdAt = { $gte: from, $lte: to };
      } else {
        throw new Error("Invalid date format for fromDate or toDate");
      }
    }

    if (admission) {
      // admission=true / false from query string
      queryFilter.addmission = admission === "true";
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

    if (city) {
      if (city.toLowerCase() === "jaipur") {
        queryFilter["studentContact.city"] = { $regex: "^Jaipur$", $options: "i" };
      } else {
        queryFilter["studentContact.city"] = { $ne: "Jaipur" };
      }
    }

    if (assignedName) {
      if (assignedName === "Not-Assigned") {
        queryFilter.assignedTo = "Not-Assigned";
      } else {
        const admin = await AdminModel.findOne({
          name: { $regex: assignedName, $options: "i" },
        });
        if (admin) {
          queryFilter.assignedTo = admin._id;
        }
      }
    }

       if (userName) {
      const decodedUserName = decodeURIComponent(userName);

      const admin = await AdminModel.findOne({
        name: { $regex: escapeRegex(decodedUserName), $options: "i" },
      }).lean();

      if (admin) {
        // Support both ObjectId and string storage for userid
        queryFilter.userid = { $in: [admin._id, admin._id.toString()] };
      } else {
        // If no admin found by this userName, force ZERO results
        // so it doesn't look like the filter is "ignored"
        queryFilter.userid = { $exists: false, $eq: null };
      }
    }


    // ---- FAST COUNTS ONLY (NO FULL DATA) ----
    const [result] = await QueryModel.aggregate([
      { $match: queryFilter }, // apply all filters once
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
            { $match: { stage: 6 } }, // assumes QueryModel has "stage" field
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

    // helper to safely get count from facet arrays
    const getCount = (arr) => (arr && arr[0] ? arr[0].count || 0 : 0);

    const counts = {
      total: getCount(result.total), // allquery.length
      admitted: getCount(result.admitted), // addmission == true
      pendingOpen: getCount(result.pendingOpen), // addmission == false && autoclosed == "open"
      demo: getCount(result.demo), // demo == true
      stage6: getCount(result.stage6), // stage === 6
      jaipur: getCount(result.jaipur), // studentContact.city === "Jaipur"
      nonJaipur: getCount(result.nonJaipur), // studentContact.city !== "Jaipur"
      closedNonAdmit: getCount(result.closedNonAdmit), // autoclosed == "close" && addmission == false
    };

    return Response.json(
      {
        message: "Counts fetched!",
        success: true,
        counts,
      },
      { status: 200 }
    );
  } catch (error) {
    console.log("Error on getting counts:", error);
    return Response.json(
      {
        message: "Error on getting counts!",
        success: false,
      },
      { status: 500 }
    );
  }
};
