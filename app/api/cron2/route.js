import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AdminModel from "@/model/Admin";
import PerformanceModel from "@/model/Performace";
import AuditLog from "@/model/AuditLog";
import mongoose from "mongoose";
export const runtime = "nodejs";

/**
 * SAFE deadline normalization
 * Handles: null, "", Not_Provided
 */
const parsedDeadlineExpression = {
  $let: {
    vars: { d: "$deadline" },
    in: {
      $cond: [
        {
          $or: [
            { $eq: ["$$d", null] },
            { $eq: ["$$d", ""] },
            { $eq: ["$$d", "Not_Provided"] }
          ]
        },
        null,
        {
          $dateTrunc: {
            date: {
              $dateFromString: {
                dateString: "$$d",
                onError: null,
                onNull: null
              }
            },
            unit: "day"
          }
        }
      ]
    }
  }
};

export async function GET(request) {
  const authHeader = request.headers.get("authorization");

  if (
    authHeader !== process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ success: false }, { status: 401 });
  }


  await dbConnect();

  // 🔑 Day boundaries (DAY-LEVEL)
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);

  try {
    const admins = await AdminModel.find({ defaultdata: "admin" })
      .select("_id mobile")
      .lean();

    for (const admin of admins) {
      const userid = String(admin._id);

      /* ======================================================
         1️⃣ TOTAL + PENDING (PAST + TODAY)
      ====================================================== */
      const [queryCounts] = await QueryModel.aggregate([
        {
          $match: {
            autoclosed: "open",
            addmission: false,
            demo: false,
            $or: [
              { userid, assignedTo: "Not-Assigned" },
              { assignedTo: userid }
            ]
          }
        },
        { $addFields: { parsedDeadline: parsedDeadlineExpression } },
        {
          $facet: {
            total: [{ $count: "count" }],
            pending: [
              {
                $match: {
                  parsedDeadline: {
                    $ne: null,
                    $lt: tomorrowStart
                  }
                }
              },
              { $count: "count" }
            ]
          }
        }
      ]);

      const totalcount = queryCounts?.total?.[0]?.count || 0;
      const pendingcount = queryCounts?.pending?.[0]?.count || 0;

      /* ======================================================
         2️⃣ WORK COUNT
         DISTINCT QUERY PER ADMIN PER DAY
      ====================================================== */
      const workedQueries = await AuditLog.aggregate([
        { $unwind: "$history" },
        {
          $match: {
            "history.actionByid": userid,
            "history.actionDate": {
              $gte: todayStart,
              $lt: tomorrowStart
            }
          }
        },
        {
          $group: {
            _id: "$queryId" // STRING queryId
          }
        }
      ]);

      const workedQueryIds = workedQueries.map(q => q._id);
      const workcount = workedQueryIds.length;
      const workedObjectIds = workedQueryIds
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));
      /* ======================================================
         3️⃣ ENROLL COUNT (FINAL & CORRECT)
         RULE:
         - Admin must have worked query today
         - Query must have fees
         - OLDEST fees.transactionDate == TODAY
         - Count only once per query
      ====================================================== */
      let enrollcount = 0;

      if (workedObjectIds.length > 0) {
        const enrollAgg = await QueryModel.aggregate([
          {
            $match: {
              _id: { $in: workedObjectIds },
              fees: { $exists: true, $ne: [] }
            }
          },

          // explode fees
          { $unwind: "$fees" },

          // normalize transactionDate (string OR Date)
          {
            $addFields: {
              feeDate: {
                $cond: [
                  { $eq: [{ $type: "$fees.transactionDate" }, "string"] },
                  {
                    $dateFromString: {
                      dateString: "$fees.transactionDate",
                      onError: null,
                      onNull: null
                    }
                  },
                  "$fees.transactionDate"
                ]
              }
            }
          },

          // get OLDEST fee per query
          {
            $group: {
              _id: "$_id",
              firstFeeDate: { $min: "$feeDate" }
            }
          },

          // ✅ TODAY RANGE CHECK (timezone safe)
          {
            $match: {
              firstFeeDate: {
                $gte: todayStart,
                $lt: tomorrowStart
              }
            }
          },

          // final count
          { $count: "count" }
        ]);

        enrollcount = enrollAgg?.[0]?.count || 0;
      }


      /* ======================================================
         4️⃣ SAVE PERFORMANCE (UPSERT)
      ====================================================== */
      await PerformanceModel.findOneAndUpdate(
        {
          userid,
          actiondate: todayStart
        },
        {
          userid,
          mobile: admin.mobile || "NA",
          totalcount: String(totalcount),
          pendingcount: String(pendingcount),
          workcount: String(workcount),
          enrollcount: String(enrollcount),
          actiondate: todayStart,
          defaultdata: "performance"
        },
        { upsert: true, new: true }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Performance cron executed successfully (ALL COUNTS FIXED)"
    });
  } catch (error) {
    console.error("CRON ERROR:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
