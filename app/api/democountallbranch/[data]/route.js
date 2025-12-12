export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AuditModel from "@/model/AuditLog";
import AdminModel from "@/model/Admin";

// Minimal helper: parse ISO date or return null
const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.valueOf()) ? null : d;
};

export const GET = async (request) => {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const fromDateRaw = searchParams.get("fromDate");
    const toDateRaw = searchParams.get("toDate");
    // prefer 'userid' for selecting a specific admin; accept 'branch' or 'adminbranch' for branch-level filtering
    const useridParam = searchParams.get("userid") || null;
    const adminbranchParam = searchParams.get("adminbranch") || searchParams.get("branch") || null;

    const fromDateObj = parseDate(fromDateRaw);
    const toDateObj = parseDate(toDateRaw);

    // Base filter: demo records
    const baseFilter = { demo: true };

    // If userid param provided, filter by QueryModel.userid (this takes precedence)
    if (useridParam) {
      if (useridParam) {
        const userOr = [
          { userid: useridParam, assignedTo: "Not-Assigned" },
          { assignedTo: useridParam }
        ];

        // merge with existing OR clauses (date or audit filters)
        if (!baseFilter.$or) baseFilter.$or = [];

        baseFilter.$or.push(...userOr);
      }

    } else if (adminbranchParam) {
      // If no specific userid provided but adminbranch is, restrict queries to that branch.
      // NOTE: Change 'branch' below if QueryModel stores branch under a different field name.
      baseFilter.branch = adminbranchParam;
    }

    // Normalize date bounds to day edges when provided
    let fromIso = null;
    let toIso = null;
    if (fromDateObj) {
      fromDateObj.setHours(0, 0, 0, 0);
      fromIso = fromDateObj.toISOString();
    }
    if (toDateObj) {
      toDateObj.setHours(23, 59, 59, 999);
      toIso = toDateObj.toISOString();
    }

    // Find audit-matched query IDs if date range provided
    let auditMatchedIds = [];
    if (fromIso || toIso) {
      const historyDateFilter = {};
      if (fromIso && toIso) {
        historyDateFilter["history.actionDate"] = { $gte: fromIso, $lte: toIso };
      } else if (fromIso) {
        historyDateFilter["history.actionDate"] = { $gte: fromIso };
      } else if (toIso) {
        historyDateFilter["history.actionDate"] = { $lte: toIso };
      }

      const auditDocs = await AuditModel.find(historyDateFilter).select("queryId history").lean();

      const idsSet = new Set();
      for (const doc of auditDocs) {
        if (!Array.isArray(doc.history)) continue;
        for (const h of doc.history) {
          try {
            const offline = h.oflinesubStatus && String(h.oflinesubStatus).toLowerCase() === "demo";
            const changesDemo =
              h.changes &&
              (h.changes.demo === true ||
                String(h.changes.demo).toLowerCase() === "true" ||
                h.changes.demo === "1");

            if (!h.actionDate) continue;
            const ad = new Date(h.actionDate);
            if (Number.isNaN(ad.valueOf())) continue;

            let actionDateOk = true;
            if (fromIso && toIso) {
              actionDateOk = ad >= new Date(fromIso) && ad <= new Date(toIso);
            } else if (fromIso) {
              actionDateOk = ad >= new Date(fromIso);
            } else if (toIso) {
              actionDateOk = ad <= new Date(toIso);
            }

            if (actionDateOk && (offline || changesDemo)) {
              if (doc.queryId) idsSet.add(String(doc.queryId));
              break;
            }
          } catch (e) {
            // ignore malformed history entries
          }
        }
      }

      auditMatchedIds = Array.from(idsSet);
    }

    // Build $or clauses that include createdAt/fees.transactionDate OR the audit matched IDs
    const orClauses = [];
    if (fromIso || toIso) {
      if (fromIso && toIso) {
        orClauses.push({ createdAt: { $gte: new Date(fromIso), $lte: new Date(toIso) } });
        orClauses.push({ "fees.transactionDate": { $gte: new Date(fromIso), $lte: new Date(toIso) } });
      } else if (fromIso) {
        orClauses.push({ createdAt: { $gte: new Date(fromIso) } });
        orClauses.push({ "fees.transactionDate": { $gte: new Date(fromIso) } });
      } else if (toIso) {
        orClauses.push({ createdAt: { $lte: new Date(toIso) } });
        orClauses.push({ "fees.transactionDate": { $lte: new Date(toIso) } });
      }

      if (auditMatchedIds.length > 0) {
        orClauses.push({ _id: { $in: auditMatchedIds } });
      }

      if (orClauses.length > 0) baseFilter.$or = orClauses;
    }

    // Fetch branches (admins) to send to frontend.
    // If adminbranchParam provided, only return admins from that branch.
    const adminQuery = { franchisestaff: { $ne: "1" } };
    if (adminbranchParam) {
      // adjust field name if your Admin model stores branch under a different key
      adminQuery.branch = adminbranchParam;
    }

    const branches = await AdminModel.find(adminQuery).select("_id name branch").lean();

    // Total (open/auto-closed logic kept as before) — all counts respect baseFilter which now may include branch
    const total = await QueryModel.countDocuments({ ...baseFilter });

    // TotalTrash (autoclosed: "close")
    const totalTrash = await QueryModel.countDocuments({ ...baseFilter, autoclosed: "close" });

    // TotalEnroll: records where 'total' field > 0
    const totalEnroll = await QueryModel.countDocuments({ ...baseFilter, total: { $gt: 0 } });

    return Response.json(
      {
        message: "Counts fetched successfully",
        success: true,
        total,
        totalTrash,
        totalEnroll,
        branches,       // admins from the requested branch (or all admins when no branch filter)
        adminbranch: adminbranchParam ?? null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching counts:", error);
    return Response.json(
      {
        message: "Error fetching counts",
        success: false,
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
};
