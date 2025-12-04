"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

export default function AdmissionBranchxlms() {
    const [allquery, setAllquery] = useState({});
    const [loading, setLoading] = useState(true);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [selectedData, setSelectedData] = useState(null);

    const fetchFilteredData = async () => {
        setLoading(true);
        try {
            const response = await axios.get("/api/report/enroll/5", {
                params: { fromDate, toDate },
            });
            setAllquery(response.data.courseBranchCounts || {});
        } catch (error) {
            console.error("Error fetching filtered data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFilteredData();
    }, []);

    // ===== Derived lists & totals =====
    const courseList = Array.from(
        new Set(
            Object.values(allquery).flatMap((course) => Object.keys(course || {}))
        )
    );

    const userTotals = {};
    Object.keys(allquery).forEach((branch) => {
        userTotals[branch] = Object.values(allquery[branch] || {}).reduce(
            (sum, v) => sum + (v?.count || 0),
            0
        );
    });

    const getCourseTotal = (course) =>
        Object.keys(allquery).reduce(
            (sum, branch) => sum + (allquery[branch]?.[course]?.count || 0),
            0
        );

    const grandTotal = Object.values(userTotals).reduce((a, b) => a + b, 0);

    // ===== Excel Export (main table) =====
    const exportExcel = () => {
        const branches = Object.keys(allquery);

        const sheetData = [
            ["Tifa Counsellor Admission Report (Branch-wise)"],
            [`${fromDate || "Start"} to ${toDate || "End"}`],
            [],
            ["Branch", ...courseList, "Total"],
            ...branches.map((branch) => [
                branch,
                ...courseList.map(
                    (course) => allquery[branch]?.[course]?.count || 0
                ),
                userTotals[branch] || 0,
            ]),
            [
                "Total",
                ...courseList.map((course) => getCourseTotal(course)),
                grandTotal,
            ],
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        XLSX.writeFile(wb, "Tifa_Branch_Admission_Report.xlsx");
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

    // ✅ Excel Export for Modal (selectedData)
    const exportSelectedToExcel = () => {
        if (!selectedData) return;

        const headerTitle = `${selectedData.courseName} — ${selectedData.branchName}`;
        const period = `${fromDate || "Start"} to ${toDate || "End"}`;

        const sheetData = [
            ["Tifa Branch Admission Details"],
            [headerTitle],
            [period],
            [],
            ["S/N", "Date", "Staff", "Student", "Branch"],
            ...selectedData.queries.map((q, index) => {
                const dateStr = q.firstFeeDate
                    ? new Date(q.firstFeeDate)
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
                    q.staffName || "",
                    q.studentName || "",
                    q.branch || selectedData.branchName || "",
                ];
            }),
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, ws, "Details");
        XLSX.writeFile(
            wb,
            `Tifa_${selectedData.branchName}_${selectedData.courseName}_Details.xlsx`
        );
    };

    return (
        <div className="p-4 bg-[#F3F7FB] min-h-screen text-sm">
            <div className="text-center mb-4">
                <h1 className="text-2xl font-extrabold text-[#2C4B8A]">
                    Tifa Institute Branch Admission Record
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
                    onClick={fetchFilteredData}
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
                            <tr className="text-[11px]">
                                <th className="border border-green-800 p-2 text-left font-semibold w-32">
                                    Branch
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
                            {Object.keys(allquery).map((branch, idx) => (
                                <tr
                                    key={branch}
                                    className={`hover:bg-green-50 transition ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                                        }`}
                                >
                                    <td className="border border-gray-500 p-2 font-semibold text-gray-800">
                                        {branch}
                                    </td>

                                    {courseList.map((course) => {
                                        const data = allquery[branch]?.[course];

                                        return (
                                            <td
                                                key={branch + course}
                                                className="border border-gray-500 p-2 text-center"
                                            >
                                                {data?.count > 0 ? (
                                                    <button
                                                        className="text-green-700 underline font-bold hover:text-green-600 ml-2"
                                                        onClick={() =>
                                                            setSelectedData({
                                                                branchName: branch,
                                                                courseName: course,
                                                                queries: data.queries || [],
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

                                    <td className="border border-green-300 p-2 text-center font-bold bg-green-100 text-gray-900">
                                        {userTotals[branch]}
                                    </td>
                                </tr>
                            ))}

                            {/* Total Row */}
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
                    <div className="bg-white w-[95%] md:w-[70%] p-4 rounded-xl shadow-lg max-h-[85vh] overflow-y-auto relative">
                        <div className="flex justify-between items-center border-b pb-2 mb-3">
                            <h2 className="text-lg font-bold text-gray-800">
                                {selectedData.courseName} — {selectedData.branchName}
                            </h2>

                            <div className="flex gap-4">
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

                        {/** ✅ sort by firstFeeDate before mapping */}
                        {(() => {
                            const sortedQueries = [...selectedData.queries].sort((a, b) => {
                                const da = a.firstFeeDate ? new Date(a.firstFeeDate).getTime() : 0;
                                const db = b.firstFeeDate ? new Date(b.firstFeeDate).getTime() : 0;
                                return da - db; // ascending; use db - da for descending
                            });

                            return (
                                <table className="w-full border text-sm">
                                    <thead className="bg-gray-200 sticky top-0 z-10">
                                        <tr>
                                            <th className="border p-2">S/N</th>
                                            <th className="border p-2">Date</th>
                                            <th className="border p-2">Staff</th>
                                            <th className="border p-2">Student</th>
                                            <th className="border p-2">Branch</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {sortedQueries.sort((b, a) => new Date(b.firstFeeDate) - new Date(a.firstFeeDate)).map((q, index) => (
                                            <tr key={q._id || index} className="hover:bg-blue-50">
                                                <td className="border p-2">{index + 1}</td>
                                                <td className="border p-2">
                                                    {q.firstFeeDate
                                                        ? new Date(q.firstFeeDate)
                                                            .toLocaleDateString("en-GB", {
                                                                day: "numeric",
                                                                month: "short",
                                                                year: "numeric",
                                                            })
                                                            .replace(",", "")
                                                        : "-"}
                                                </td>
                                                <td className="border p-2">{q.staffName}</td>
                                                <td className="border p-2">{q.studentName}</td>
                                                <td className="border p-2">
                                                    {q.branch || selectedData.branchName}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            );
                        })()}
                    </div>
                </div>
            )}

        </div>
    );
}
