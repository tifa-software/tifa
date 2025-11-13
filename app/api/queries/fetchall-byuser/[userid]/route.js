export const runtime = "nodejs";
export const preferredRegion = ["bom1"];
import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AdminModel from "@/model/Admin";

const parseDeadlineToDate = (deadlineStr) => {
  if (!deadlineStr || deadlineStr === "Not_Provided") return null;

  const tryIso = new Date(deadlineStr);
  if (!isNaN(tryIso.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(deadlineStr)) {
    return new Date(tryIso.getFullYear(), tryIso.getMonth(), tryIso.getDate());
  }

  const ddmmyyyy = /^(\d{2})-(\d{2})-(\d{4})$/;
  const ddmmyy = /^(\d{2})-(\d{2})-(\d{2})$/;
  let m;
  if ((m = deadlineStr.match(ddmmyyyy))) {
    const [_, dd, mm, yyyy] = m;
    return new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
  }
  if ((m = deadlineStr.match(ddmmyy))) {
    const [_, dd, mm, yy] = m;
    const yyyy = 2000 + parseInt(yy, 10);
    return new Date(yyyy, parseInt(mm, 10) - 1, parseInt(dd, 10));
  }

  const alt = new Date(deadlineStr);
  if (!isNaN(alt.getTime())) {
    return new Date(alt.getFullYear(), alt.getMonth(), alt.getDate());
  }

  return null;
};

export const GET = async (request, context) => {
  await dbConnect();

  const { userid } = context.params;
  const { searchParams } = new URL(request.url);
  const autoclosedStatus = searchParams.get("autoclosed") || "open";

  if (!userid) {
    return Response.json(
      {
        message: "User ID is missing!",
        success: false,
      },
      { status: 400 }
    );
  }

  const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
  const limit = 20;
  const skip = (page - 1) * limit;

  const deadlineFilterParam = searchParams.get("deadlineFilter");
  const legacyDeadline = searchParams.get("deadline");
  const supportedFilters = new Set(["today", "tomorrow", "dayAfterTomorrow", "past", "custom", "dateRange"]);

  let dateFilter = deadlineFilterParam ?? "";
  let deadlineDate = searchParams.get("deadlineDate") || "";
  let deadlineFrom = searchParams.get("deadlineFrom") || "";
  let deadlineTo = searchParams.get("deadlineTo") || "";

  if (!dateFilter && legacyDeadline) {
    if (supportedFilters.has(legacyDeadline)) {
      dateFilter = legacyDeadline;
    } else {
      dateFilter = "custom";
      deadlineDate = legacyDeadline;
    }
  }

  if (dateFilter !== "custom") {
    deadlineDate = "";
  }

  if (dateFilter !== "dateRange") {
    deadlineFrom = "";
    deadlineTo = "";
  }

  const gradeFilter = searchParams.get("grade") || "";
  const searchTerm = searchParams.get("search") || "";
  const assignedFromFilter = searchParams.get("assignedFrom") || "";

  try {
    // Build base query for staff - only their queries and assigned queries
    const baseQuery = {
      autoclosed: autoclosedStatus,
      addmission: false,
      demo: false,
      $or: [
        { userid: userid, assignedTo: "Not-Assigned" },
        { assignedTo: userid },
      ],
      ...(gradeFilter ? { lastgrade: gradeFilter } : {}),
    };

    // Add assignedFrom filter if provided
    // assignedreceivedhistory can be a string or an array
    if (assignedFromFilter) {
      baseQuery.$and = baseQuery.$and || [];
      baseQuery.$and.push({
        $or: [
          { assignedreceivedhistory: assignedFromFilter }, // for string
          { assignedreceivedhistory: { $in: [assignedFromFilter] } }, // for array
        ],
      });
    }

    // Add search conditions if search term exists
    if (searchTerm) {
      const searchRegex = new RegExp(searchTerm.trim(), "i");
      // Restructure to maintain user/assignment filter with search
      const existingOr = baseQuery.$or;
      baseQuery.$and = baseQuery.$and || [];
      baseQuery.$and.push({
        $or: [
          { studentName: searchRegex },
          { referenceid: searchRegex },
          { "studentContact.phoneNumber": searchRegex },
        ],
      });
      // Keep the original $or at the top level
      baseQuery.$or = existingOr;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);
    const dayAfterTomorrowStart = new Date(todayStart);
    dayAfterTomorrowStart.setDate(todayStart.getDate() + 2);
    const threeDaysOutStart = new Date(todayStart);
    threeDaysOutStart.setDate(todayStart.getDate() + 3);

    let customDateStart = null;
    let customDateEnd = null;
    if (dateFilter === "custom" && deadlineDate) {
      const parsed = parseDeadlineToDate(deadlineDate);
      if (parsed) {
        customDateStart = parsed;
        customDateEnd = new Date(parsed);
        customDateEnd.setDate(customDateEnd.getDate() + 1);
      } else {
        dateFilter = "";
      }
    }

    let rangeStart = null;
    let rangeEndExclusive = null;
    if (dateFilter === "dateRange" && deadlineFrom && deadlineTo) {
      const startParsed = parseDeadlineToDate(deadlineFrom);
      const endParsed = parseDeadlineToDate(deadlineTo);
      if (startParsed && endParsed) {
        rangeStart = startParsed;
        rangeEndExclusive = new Date(endParsed);
        rangeEndExclusive.setDate(rangeEndExclusive.getDate() + 1);
      } else {
        dateFilter = "";
      }
    }

    const parsedDeadlineExpression = {
      $let: {
        vars: {
          deadlineStr: { $ifNull: ["$deadline", ""] },
        },
        in: {
          $switch: {
            branches: [
              {
                case: {
                  $or: [
                    { $eq: ["$$deadlineStr", ""] },
                    { $eq: ["$$deadlineStr", "Not_Provided"] },
                  ],
                },
                then: null,
              },
              {
                case: {
                  $regexMatch: {
                    input: "$$deadlineStr",
                    regex: "^\\d{4}-\\d{2}-\\d{2}",
                  },
                },
                then: {
                  $dateTrunc: {
                    date: {
                      $dateFromString: {
                        dateString: { $substr: ["$$deadlineStr", 0, 10] },
                        format: "%Y-%m-%d",
                        onError: null,
                        onNull: null,
                      },
                    },
                    unit: "day",
                  },
                },
              },
              {
                case: {
                  $regexMatch: {
                    input: "$$deadlineStr",
                    regex: "^\\d{2}-\\d{2}-\\d{4}$",
                  },
                },
                then: {
                  $dateTrunc: {
                    date: {
                      $dateFromString: {
                        dateString: {
                          $concat: [
                            { $substr: ["$$deadlineStr", 6, 4] },
                            "-",
                            { $substr: ["$$deadlineStr", 3, 2] },
                            "-",
                            { $substr: ["$$deadlineStr", 0, 2] },
                          ],
                        },
                        format: "%Y-%m-%d",
                        onError: null,
                        onNull: null,
                      },
                    },
                    unit: "day",
                  },
                },
              },
              {
                case: {
                  $regexMatch: {
                    input: "$$deadlineStr",
                    regex: "^\\d{2}-\\d{2}-\\d{2}$",
                  },
                },
                then: {
                  $dateTrunc: {
                    date: {
                      $dateFromString: {
                        dateString: {
                          $concat: [
                            "20",
                            { $substr: ["$$deadlineStr", 6, 2] },
                            "-",
                            { $substr: ["$$deadlineStr", 3, 2] },
                            "-",
                            { $substr: ["$$deadlineStr", 0, 2] },
                          ],
                        },
                        format: "%Y-%m-%d",
                        onError: null,
                        onNull: null,
                      },
                    },
                    unit: "day",
                  },
                },
              },
            ],
            default: {
              $dateTrunc: {
                date: {
                  $dateFromString: {
                    dateString: "$$deadlineStr",
                    onError: null,
                    onNull: null,
                  },
                },
                unit: "day",
              },
            },
          },
        },
      },
    };

    const pipeline = [
      { $match: baseQuery },
      { $addFields: { parsedDeadline: parsedDeadlineExpression } },
    ];

    if (dateFilter === "today") {
      pipeline.push({
        $match: {
          parsedDeadline: { $gte: todayStart, $lt: tomorrowStart },
        },
      });
    } else if (dateFilter === "tomorrow") {
      pipeline.push({
        $match: {
          parsedDeadline: { $gte: tomorrowStart, $lt: dayAfterTomorrowStart },
        },
      });
    } else if (dateFilter === "dayAfterTomorrow") {
      pipeline.push({
        $match: {
          parsedDeadline: { $gte: dayAfterTomorrowStart, $lt: threeDaysOutStart },
        },
      });
    } else if (dateFilter === "past") {
      pipeline.push({
        $match: {
          parsedDeadline: { $lt: todayStart },
        },
      });
    } else if (dateFilter === "custom" && customDateStart && customDateEnd) {
      pipeline.push({
        $match: {
          parsedDeadline: { $gte: customDateStart, $lt: customDateEnd },
        },
      });
    } else if (dateFilter === "dateRange" && rangeStart && rangeEndExclusive) {
      pipeline.push({
        $match: {
          parsedDeadline: { $gte: rangeStart, $lt: rangeEndExclusive },
        },
      });
    }

    const priorityExpression = {
      $switch: {
        branches: [
          {
            case: {
              $and: [
                { $ne: ["$parsedDeadline", null] },
                { $gte: ["$parsedDeadline", todayStart] },
                { $lt: ["$parsedDeadline", tomorrowStart] },
              ],
            },
            then: 0,
          },
          {
            case: {
              $and: [
                { $ne: ["$parsedDeadline", null] },
                { $lt: ["$parsedDeadline", todayStart] },
              ],
            },
            then: 1,
          },
          {
            case: {
              $and: [
                { $ne: ["$parsedDeadline", null] },
                { $gte: ["$parsedDeadline", tomorrowStart] },
              ],
            },
            then: 2,
          },
        ],
        default: 3,
      },
    };

    const sortKeyExpression = {
      $switch: {
        branches: [
          {
            case: {
              $and: [
                { $eq: ["$priority", 1] },
                { $ne: ["$parsedDeadline", null] },
              ],
            },
            then: {
              $multiply: [-1, { $toLong: "$parsedDeadline" }],
            },
          },
          {
            case: {
              $and: [
                { $in: ["$priority", [0, 2]] },
                { $ne: ["$parsedDeadline", null] },
              ],
            },
            then: { $toLong: "$parsedDeadline" },
          },
        ],
        default: Number.MAX_SAFE_INTEGER,
      },
    };

    pipeline.push({
      $facet: {
        data: [
          { $addFields: { priority: priorityExpression } },
          { $addFields: { sortKey: sortKeyExpression } },
          { $sort: { priority: 1, sortKey: 1, _id: 1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              priority: 0,
              sortKey: 0,
              parsedDeadline: 0,
              autoclosed: 0,
              demo: 0,
              addhistory: 0,
            },
          },
          {
            $project: {
              _id: 1,
              userid: 1,
              assignedreceivedhistory: 1,
              assignedsenthistory: 1,
              studentName: 1,
              referenceid: 1,
              branch: 1,
              lastgrade: 1,
              deadline: 1,
              addmission: 1,
              lastDeadline: 1,
              lastactionby: 1,
              lastmessage: 1,
              notes: 1,
              "studentContact.phoneNumber": 1,
              "studentContact.address": 1,
            },
          },
        ],
        totalCount: [{ $count: "count" }],
      },
    });

    pipeline.push({
      $project: {
        data: "$data",
        total: {
          $ifNull: [{ $arrayElemAt: ["$totalCount.count", 0] }, 0],
        },
      },
    });

    const [aggregationResult, admins] = await Promise.all([
      QueryModel.aggregate(pipeline),
      AdminModel.find({ defaultdata: "admin" }).select("name _id").lean(),
    ]);

    const { data = [], total = 0 } = aggregationResult?.[0] || {};

    return Response.json(
      {
        message: "Filtered data fetched successfully!",
        success: true,
        page,
        total,
        totalPages: Math.ceil(total / limit),
        data,
        admins,
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
