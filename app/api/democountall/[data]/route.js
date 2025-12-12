export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AuditModel from "@/model/AuditLog";
import BranchModel from "@/model/Branch";
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
    const branchParam = searchParams.get("branch"); // new: branch filter

    const fromDateObj = parseDate(fromDateRaw);
    const toDateObj = parseDate(toDateRaw);

    // Base filter: demo records
    const baseFilter = { demo: true };

    // If branch param provided, try to use it to filter
    if (branchParam) {
      // If branchParam looks like a Mongo ObjectId (24 hex chars) we assume it's _id
      if (/^[0-9a-fA-F]{24}$/.test(branchParam)) {
        baseFilter.branch = branchParam; // match by ObjectId reference
      } else {
        // otherwise try to match by branch name (if your QueryModel stores branch_name directly)
        // or by branch field if it stores string name
        baseFilter.branch = branchParam;
      }
    }

    // Build date range (normalize to day boundaries when both present)
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

    // If a date range is provided, find Query IDs that contain a demo entry in AuditModel within that range
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

            const actionDateOk = (() => {
              if (!h.actionDate) return false;
              const dt = new Date(h.actionDate);
              if (Number.isNaN(dt.valueOf())) return false;
              if (fromIso && toIso) return dt >= new Date(fromIso) && dt <= new Date(toIso);
              if (fromIso) return dt >= new Date(fromIso);
              if (toIso) return dt <= new Date(toIso);
              return true;
            })();

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

    // Build $or clauses that include createdAt/fees transactionDate OR the audit matched IDs
    const orClauses = [];
    if (fromIso || toIso) {
      if (fromIso && toIso) {
        orClauses.push({ createdAt: { $gte: new Date(fromIso), $lte: new Date(toIso) } });
        orClauses.push({ "fees.transactionDate": { $gte: fromIso, $lte: toIso } });
      } else if (fromIso) {
        orClauses.push({ createdAt: { $gte: new Date(fromIso) } });
        orClauses.push({ "fees.transactionDate": { $gte: fromIso } });
      } else if (toIso) {
        orClauses.push({ createdAt: { $lte: new Date(toIso) } });
        orClauses.push({ "fees.transactionDate": { $lte: toIso } });
      }

      if (auditMatchedIds.length > 0) {
        // auditMatchedIds are strings; Mongoose will handle them when matching _id
        orClauses.push({ _id: { $in: auditMatchedIds } });
      }

      if (orClauses.length > 0) baseFilter.$or = orClauses;
    }

    // Fetch branches to send to frontend (select minimal fields)
    const branches = await BranchModel.find({}).select("_id branch_name").lean();

    // Total (open autoclosed)
    const total = await QueryModel.countDocuments({ ...baseFilter });

    // TotalTrash (closed autoclosed) - still respecting date + demo flag + branch if provided
    const totalTrash = await QueryModel.countDocuments({ ...baseFilter, autoclosed: "close" });

    // TotalEnroll: records where 'total' (field) > 0 — keep same logic you had
    const totalEnroll = await QueryModel.countDocuments({ ...baseFilter, total: { $gt: 0 } });

    return Response.json(
      {
        message: "Counts fetched successfully",
        success: true,
        total,
        totalTrash,
        totalEnroll,
        branches, // <-- new: list of branches
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
