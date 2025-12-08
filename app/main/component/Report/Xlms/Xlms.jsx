"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

const MAX_RANGE_DAYS = 7; // 1 Dec → 8 Dec (7 days diff) allowed

export default function Admissionxlms() {
  const [allquery, setAllquery] = useState({});
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedData, setSelectedData] = useState(null);

  // ===== Helpers =====
  const formatDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const diffInDays = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = e.getTime() - s.getTime();
    return diffTime / (1000 * 60 * 60 * 24);
  };

  // ===== API Call (with validation on button press) =====
  const fetchFilteredData = async (customFromDate, customToDate) => {
    const fDate = customFromDate ?? fromDate;
    const tDate = customToDate ?? toDate;

    // Validation
    if (!fDate || !tDate) {
      alert("Please select both From and To dates.");
      return;
    }

    const fromObj = new Date(fDate);
    const toObj = new Date(tDate);

    if (toObj < fromObj) {
      alert("To date cannot be before From date.");
      return;
    }

    const diff = diffInDays(fDate, tDate);
    if (diff > MAX_RANGE_DAYS) {
      alert("Max 8 days report allowed. (Example: 1 Dec - 8 Dec)");
      return;
    }

    setLoading(true);
    try {
      const params = {};
      if (fDate) params.fromDate = fDate;
      if (tDate) params.toDate = tDate;

      const response = await axios.get(
        "/api/report/allvisit/course-stats/query",
        { params }
      );

      if (
        response.data?.success === true &&
        response.data?.message === "All data fetched!"
      ) {
        setAllquery(response.data.userBranchCounts || {});
      } else {
        console.warn("API responded but success is false");
      }
    } catch (error) {
      console.error("Error fetching filtered data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ===== Default dates: today & today - 7 days =====
  useEffect(() => {
    const today = new Date();
    const toStr = formatDate(today);

    const past = new Date();
    past.setDate(past.getDate() - 7); // last 7 days
    const fromStr = formatDate(past);

    setFromDate(fromStr);
    setToDate(toStr);

    // initial fetch with default valid range
    fetchFilteredData(fromStr, toStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Calculations for table =====
  const courseList = Array.from(
    new Set(
      Object.values(allquery).flatMap((course) => Object.keys(course || {}))
    )
  );

  const userTotals = {};
  Object.keys(allquery).forEach((user) => {
    userTotals[user] = Object.values(allquery[user] || {}).reduce(
      (sum, v) => sum + (v?.count || 0),
      0
    );
  });

  const getCourseTotal = (course) =>
    Object.keys(allquery).reduce(
      (sum, user) => sum + (allquery[user][course]?.count || 0),
      0
    );

  const grandTotal = Object.values(userTotals).reduce((a, b) => a + b, 0);

  // ===== Excel Export =====
  const exportExcel = () => {
    const sheetData = [
      ["Tifa Counsellor Admission Report"],
      [`${fromDate || "Start"} to ${toDate || "End"}`],
      [],
      ["Course", ...Object.keys(allquery), "Total"],
      ...courseList.map((course) => [
        course,
        ...Object.keys(allquery).map(
          (user) => allquery[user][course]?.count || 0
        ),
        getCourseTotal(course),
      ]),
      [
        "Total",
        ...Object.keys(allquery).map((user) => userTotals[user]),
        grandTotal,
      ],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, "Tifa_Admission_Report.xlsx");
  };

  // ===== Print styles =====
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
   @media print {

  body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    background: white !important;
  }

  .print-hide, .top-buttons, input {
    display: none !important;
  }

  .print-area {
    padding: 0 !important;
    margin: 0 !important;
  }

  table {
    width: 100% !important;
    font-size: 10px !important;
    border-collapse: collapse !important;
    page-break-inside: avoid !important;
  }

  th, td {
    padding: 4px !important;
  }

  td button {
    all: unset !important;
    color: black !important;
    font-size: 10px !important;
    text-decoration: none !important;
    cursor: default !important;
  }

  @page {
    size: A4 landscape;
    margin: 10mm;
  }

  .modal-print-hide {
    display: none !important;
  }
}
  `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const exportSelectedToExcel = () => {
    if (!selectedData) return;

    const headerTitle = `${selectedData.course} — ${selectedData.user}`;
    const period = `${fromDate || "Start"} to ${toDate || "End"}`;

    const sheetData = [
      ["Tifa Counsellor Visit Details"],
      [headerTitle],
      [period],
      [],
      ["S/N", "Date", "Staff", "Student", "Branch", "Phone"],
      ...selectedData.queries.map((q, index) => {
        const dateStr = q.stage6UpdatedDate
          ? new Date(q.stage6UpdatedDate)
            .toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
            .replace(",", "")
          : "-";

        return [
          index + 1,
          dateStr,
          selectedData.user,
          q.studentName || "",
          selectedData.course || "",
          q.studentContact?.phoneNumber || "",
        ];
      }),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Details");
    XLSX.writeFile(
      wb,
      `Tifa_${selectedData.user}_${selectedData.course}_Details.xlsx`
    );
  };
  return (
    <div className="p-4 bg-[#F3F7FB] min-h-screen text-sm print-area">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-extrabold text-[#2C4B8A]">
          Tifa Institute Counsellor Visit Record
        </h1>
        <p className="text-xs text-gray-600">
          {fromDate || "Start"} to {toDate || "End"}
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-4 mb-4 items-end">
        <div className="flex flex-col text-gray-600 text-xs">
          <label>From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <div className="flex flex-col text-gray-600 text-xs">
          <label>To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <button
          onClick={() => fetchFilteredData()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow text-xs"
        >
          Apply Filter
        </button>
        <button
          onClick={exportExcel}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow text-xs"
        >
          Export to Excel
        </button>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded shadow text-xs print:hidden"
        >
          Print Report
        </button>
      </div>

      {/* Table */}
      {!loading && (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border border-green-700 rounded-sm shadow-sm">
            <thead className="sticky top-0 z-10 bg-green-700 text-white">
              <tr>
                <th className="border border-green-800 p-2 font-semibold">
                  Staff
                </th>

                {courseList.map((course) => (
                  <th
                    key={course}
                    className="border border-green-800 p-2 text-center font-semibold"
                  >
                    {course}
                  </th>
                ))}

                <th className="border border-green-900 p-2 text-center font-bold bg-green-800">
                  Total
                </th>
              </tr>
            </thead>

            <tbody className="bg-white">
              {Object.keys(allquery).map((user, idx) => (
                <tr
                  key={user}
                  className={`hover:bg-green-50 transition ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                >
                  <td className="border border-gray-500 p-2 font-semibold text-gray-800">
                    {user}
                  </td>

                  {courseList.map((course) => {
                    const data = allquery[user]?.[course];

                    return (
                      <td
                        key={course}
                        className="border border-gray-500 p-2 text-center"
                      >
                        {data?.count > 0 ? (
                          <button
                            className="text-green-700 underline font-bold hover:text-green-600 ml-2"
                            onClick={() =>
                              setSelectedData({
                                user,
                                course,
                                queries: data.queries,
                              })
                            }
                          >
                            {data.count}
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                    );
                  })}

                  <td className="border border-green-300 p-2 text-center font-bold bg-green-100">
                    {userTotals[user]}
                  </td>
                </tr>
              ))}

              <tr className="bg-green-200 font-bold text-gray-900">
                <td className="border border-green-400 p-2 text-center">
                  TOTAL
                </td>

                {courseList.map((course) => (
                  <td
                    key={course}
                    className="border border-green-400 p-2 text-center font-bold"
                  >
                    {getCourseTotal(course)}
                  </td>
                ))}

                <td className="border border-green-500 p-2 text-center bg-green-300 font-extrabold">
                  {grandTotal}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {loading && (
        <div className="text-center font-semibold text-gray-500 mt-4">
          Loading…
        </div>
      )}

      {/* Modal Details */}
      {selectedData && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          {/* ⭐ NEW: added relative for sticky header to work nicely */}
          <div className="bg-white w-[95%] md:w-[70%] p-4 rounded-xl shadow-lg max-h-[85vh] overflow-y-auto relative">
            <div className="flex justify-between items-center border-b pb-2 mb-3">
              <h2 className="text-lg font-bold text-gray-800">
                {selectedData.course} — {selectedData.user}
              </h2>
              <div className=" flex gap-5">

                <button
                  onClick={exportSelectedToExcel}
                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                >
                  Export to Excel
                </button>
                <button
                  className="text-red-600 font-bold text-xl"
                  onClick={() => setSelectedData(null)}
                >
                  ✖
                </button>
              </div>
            </div>

            <table className="w-full border text-sm">
              <thead className="bg-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="border p-2">S/N</th>
                  <th className="border p-2">Date</th>
                  <th className="border p-2">Staff</th>
                  <th className="border p-2">Student</th>
                  <th className="border p-2">Branch</th>
                  <th className="border p-2">Phone</th>
                </tr>
              </thead>

              <tbody>
                {selectedData.queries.sort((b, a) => new Date(b.stage6UpdatedDate) - new Date(a.stage6UpdatedDate)).map((q, index) => (
                  <tr key={q._id} className="hover:bg-blue-50">
                    <td className="border p-2">{index + 1}</td>
                    <td className="border p-2"> {q.stage6UpdatedDate
                      ? new Date(q.stage6UpdatedDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }).replace(",", "")
                      : "-"}</td>
                    <td className="border p-2">{selectedData.user}</td>
                    <td className="border p-2">{q.studentName}</td>
                    <td className="border p-2">{selectedData.course}</td>
                    <td className="border p-2">
                      {q.studentContact?.phoneNumber}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
