export const GET = async (request, context) => {
  await dbConnect();

  const type = context.params.type;
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
  const limit = 20;
  const skip = (page - 1) * limit;

  const dateFilter = searchParams.get("deadline") || ""; // today, tomorrow, etc.
  const gradeFilter = searchParams.get("grade") || "";
  const branchFilter = searchParams.get("branch") || "";
  const searchTerm = searchParams.get("search") || "";

  // Build the base query with direct MongoDB syntax
  const baseQuery = {
    autoclosed: type,
    addmission: false,
    demo: false,
    ...(gradeFilter && { lastgrade: gradeFilter }),
    ...(branchFilter && { branch: branchFilter }),
  };

  // Handle search term efficiently
  if (searchTerm) {
    const searchRegex = new RegExp(searchTerm.trim(), "i");
    baseQuery.$or = [
      { studentName: searchRegex },
      { referenceid: searchRegex },
      { "studentContact.phoneNumber": searchRegex },
    ];
  }

  // Build advanced date filters for MongoDB
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let dateQuery = {};
  if (dateFilter) {
    let targetDate;
    if (dateFilter === "today") {
      targetDate = today;
      dateQuery = {
        deadline: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        }
      };
    } else if (dateFilter === "tomorrow" || dateFilter === "dayAfterTomorrow") {
      targetDate = new Date(today);
      const offset = dateFilter === "tomorrow" ? 1 : 2;
      targetDate.setDate(today.getDate() + offset);
      dateQuery = {
        deadline: {
          $gte: targetDate,
          $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
        }
      };
    } else if (dateFilter === "past") {
      dateQuery = {
        deadline: { $lt: today },
      };
    } else {
      // custom date
      const customDate = parseDeadlineToDate(dateFilter); // reuse your function
      if (customDate) {
        dateQuery = {
          deadline: {
            $gte: customDate,
            $lt: new Date(customDate.getTime() + 24 * 60 * 60 * 1000),
          }
        };
      }
    }
  }

  try {
    // Merge dateQuery into baseQuery if exists
    const mongoQuery = { ...baseQuery, ...(Object.keys(dateQuery).length > 0 ? dateQuery : {}) };

    // Fetch data with MongoDB pagination, only required fields
    const [data, total, branches, admins] = await Promise.all([
      QueryModel.find(mongoQuery)
        .skip(skip)
        .limit(limit)
        .lean(),
      QueryModel.countDocuments(mongoQuery),
      BranchModel.find({ defaultdata: "branch" }).select("branch_name").lean(),
      AdminModel.find({ defaultdata: "admin" }).select("name _id").lean()
    ]);

    return Response.json(
      {
        message: "Filtered data fetched successfully!",
        success: true,
        page,
        total,
        totalPages: Math.ceil(total / limit),
        data,
        branches: branches.map(b => b.branch_name),
        admins
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching data:", error);
    return Response.json(
      {
        message: "Error fetching data list!",
        success: false,
        error: String(error),
      },
      { status: 500 }
    );
  }
};
