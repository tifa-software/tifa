import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AdminModel from "@/model/Admin";
import AuditLog from "@/model/AuditLog"

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
    const suboption = searchParams.get("suboption")
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const admission = searchParams.get("admission");
    const grade = searchParams.get("grade");
    const location = searchParams.get("location");
    const city = searchParams.get("city");
    const assignedName = searchParams.get("assignedName");


    // Build MongoDB query
    const queryFilter = { defaultdata: "query" };

    if (referenceId) {
      // Decode and escape referenceId for regex
      const decodedReferenceId = decodeURIComponent(referenceId);  // Decode URL-encoded referenceId
      const escapedReferenceId = escapeRegex(decodedReferenceId);  // Escape special characters
      queryFilter.referenceid = { $regex: escapedReferenceId, $options: "i" };  // Case-insensitive match
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
      queryFilter.addmission = admission === "true"; // Convert to boolean
    }
    if (grade) {
      queryFilter.lastgrade = { $regex: grade, $options: "i" };
    }
    if (location) {
      queryFilter.branch = { $regex: location, $options: "i" };
    }
    if (city) {
      if (city.toLowerCase() === "jaipur") {
        // If city is Jaipur, show only records with Jaipur
        queryFilter["studentContact.city"] = { $regex: "^Jaipur$", $options: "i" }; // Exact match for Jaipur, case-insensitive
      } else {
        // If city is not Jaipur, exclude records with Jaipur
        queryFilter["studentContact.city"] = { $ne: "Jaipur" }; // Exclude Jaipur
      }
    }
    
    

    if (assignedName) {
      // Fetch admin ID for assignedName
      const admin = await AdminModel.findOne({ name: { $regex: assignedName, $options: "i" } });
      if (admin) {
        queryFilter.assignedTo = admin._id;
      }
    }

    // Fetch queries based on the filter
    const queries = await QueryModel.find(queryFilter);

    // Fetch admin data for mapping
    const admins = await AdminModel.find({}, { _id: 1, name: 1 });
    const adminMap = admins.reduce((map, admin) => {
      map[admin._id.toString()] = admin.name;
      return map;
    }, {});


    const auditLogs = await AuditLog.find({ queryId: { $in: queries.map(query => query._id) } });

    // Create a map of history counts for each queryId
    const historyCountMap = auditLogs.reduce((map, log) => {
      const queryId = log.queryId.toString();
      if (!map[queryId]) {
        map[queryId] = 0;
      }
      map[queryId] += log.history.length; // Count the number of history entries (actions)
      return map;
    }, {});
    // Format the queries for response
    const formattedQueries = queries.map((query) => {
      return {
        ...query._doc,
        userid: adminMap[query.userid] || query.userid,
        assignedTo: adminMap[query.assignedTo] || query.assignedTo,
        assignedsenthistory: query.assignedsenthistory.map((id) => adminMap[id] || id),
        assignedreceivedhistory: query.assignedreceivedhistory.map((id) => adminMap[id] || id),
        assignedToreq: adminMap[query.assignedToreq] || query.assignedToreq,
        historyCount: historyCountMap[query._id.toString()] || 0,
      };
    });

    // Return filtered and formatted queries
    return Response.json(
      {
        message: "All data fetched!",
        success: true,
        fetch: formattedQueries,
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
