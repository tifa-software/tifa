export const runtime = "nodejs";
export const preferredRegion = ["bom1"];

import dbConnect from "@/lib/dbConnect";
import QueryModel from "@/model/Query";
import AuditModel from "@/model/AuditLog";

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

    const fromDateObj = parseDate(fromDateRaw);
    const toDateObj = parseDate(toDateRaw);

    // Base filter: demo records
    const baseFilter = { demo: true };

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
    // --- Replace the prior audit matching block with this ---
let auditMatchedIds = [];
if (fromIso || toIso) {
  // Build date-only filter for history.actionDate (do not try to match changes.demo in the DB)
  const historyDateFilter = {};
  if (fromIso && toIso) {
    historyDateFilter["history.actionDate"] = { $gte: fromIso, $lte: toIso };
  } else if (fromIso) {
    historyDateFilter["history.actionDate"] = { $gte: fromIso };
  } else if (toIso) {
    historyDateFilter["history.actionDate"] = { $lte: toIso };
  }

  // Query audit docs in the date window; fetch history so we can inspect entries in JS
  const auditDocs = await AuditModel.find(historyDateFilter).select("queryId history").lean();

  // Post-filter in JS: keep queryIds where any history entry indicates a demo
  const idsSet = new Set();
  for (const doc of auditDocs) {
    if (!Array.isArray(doc.history)) continue;
    for (const h of doc.history) {
      try {
        // tolerate different shapes: oflinesubStatus string 'demo', changes.demo boolean or string 'true'
        const offline = h.oflinesubStatus && String(h.oflinesubStatus).toLowerCase() === "demo";
        const changesDemo =
          h.changes &&
          (h.changes.demo === true ||
           String(h.changes.demo).toLowerCase() === "true" ||
           h.changes.demo === "1");

        // ensure actionDate falls in our range (because historyDateFilter matched any history entry date,
        // but if your schema stores different formats check this again)
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
          break; // this audit doc already qualifies, move to next doc
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
        orClauses.push({ _id: { $in: auditMatchedIds } });
      }

      if (orClauses.length > 0) baseFilter.$or = orClauses;
    }

    // Total (open autoclosed)
    const total = await QueryModel.countDocuments({ ...baseFilter,  });

    // TotalTrash (closed autoclosed) - still respecting date + demo flag
    const totalTrash = await QueryModel.countDocuments({ ...baseFilter, autoclosed: "close" });

    // TotalEnroll: total > 0 and autoclosed open
    const totalEnroll = await QueryModel.countDocuments({ ...baseFilter,  total: { $gt: 0 } });

    return Response.json(
      {
        message: "Counts fetched successfully",
        success: true,
        total,
        totalTrash,
        totalEnroll,
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
