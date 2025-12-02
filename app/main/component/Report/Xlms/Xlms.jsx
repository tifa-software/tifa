"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";


export default function Xlms() {
  const [allquery, setAllquery] = useState({});
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchFilteredData = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/report/allvisit/query", {
        params: { fromDate, toDate },
      });
      setAllquery(response.data.userCourseCounts || {});
    } catch (error) {
      console.error("Error fetching filtered data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredData();
  }, [fromDate, toDate]);

  const courseList = Array.from(
    new Set(
      Object.values(allquery).flatMap((course) => Object.keys(course || {}))
    )
  );

  const userTotals = {};
  Object.keys(allquery).forEach((user) => {
    userTotals[user] = Object.values(allquery[user] || {}).reduce(
      (sum, v) => sum + (v || 0),
      0
    );
  });

  const getCourseTotal = (course) =>
    Object.keys(allquery).reduce(
      (sum, user) => sum + (allquery[user][course] || 0),
      0
    );

  const grandTotal = Object.values(userTotals).reduce((a, b) => a + b, 0);

  const exportExcel = () => {
    const sheetData = [
      ["Tifa Institute Counsellor Admission Record"],
      [`${fromDate || "Start"} to ${toDate || "End"}`],
      [],
      ["Course", ...Object.keys(allquery), "Total"],
      ...courseList.map((course) => [
        course,
        ...Object.keys(allquery).map((user) => allquery[user][course] || 0),
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

    // Download directly — no file-saver
    XLSX.writeFile(wb, "Tifa_Report.xlsx");
  };


  return (
    <div className="p-4 bg-[#F3F7FB] min-h-screen text-sm">

      {/* TITLE */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-extrabold text-[#2C4B8A]">
          Tifa Institute Counsellor Visit Record
        </h1>
        <p className="text-xs text-gray-600">
          {fromDate || "Start"} to {toDate || "End"}
        </p>
      </div>

      {/* Filter + Export */}
      <div className="flex gap-4 mb-4 items-end">
        <div className="flex flex-col text-gray-600">
          <label className="text-xs">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <div className="flex flex-col text-gray-600">
          <label className="text-xs">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <button
          onClick={exportExcel}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow text-xs"
        >
          Export to Excel
        </button>
      </div>

      {/* Table */}
      {!loading && (
  <div className="overflow-x-auto mt-4">
    {/* Top Heading */}
    <h2 className="text-center text-lg font-bold mb-3 text-gray-800 tracking-wide">
      📘 Tifa Student Visit Record
    </h2>

    <table className="w-full border border-gray-300 rounded-lg text-xs shadow-sm">
      
      {/* HEADER */}
      <thead className="sticky top-0 z-10">
        <tr className="bg-green-700 text-white">
          <th className="border p-2 text-left font-semibold w-40">Courses</th>

          {Object.keys(allquery).map((user) => (
            <th
              key={user}
              className="border p-2 text-center font-medium whitespace-nowrap"
            >
              {user}
            </th>
          ))}

          <th className="border p-2 text-center bg-yellow-400 text-black font-bold">
            Total
          </th>
        </tr>
      </thead>

      {/* BODY */}
      <tbody>
        {courseList.map((course, idx) => (
          <tr
            key={course}
            className={`transition-all ${
              idx % 2 === 0 ? "bg-white" : "bg-gray-50"
            } hover:bg-blue-50`}
          >
            <td className="border p-2 font-medium">{course}</td>

            {Object.keys(allquery).map((user) => (
              <td key={user} className="border p-2 text-center">
                {allquery[user][course] || "-"}
              </td>
            ))}

            {/* Course Row Total */}
            <td className="border p-2 text-center font-bold bg-blue-100">
              {getCourseTotal(course)}
            </td>
          </tr>
        ))}

        {/* FINAL TOTAL */}
        <tr className="bg-orange-200 font-bold">
          <td className="border p-2 text-center">TOTAL</td>

          {Object.keys(allquery).map((user) => (
            <td key={user} className="border p-2 text-center">
              {userTotals[user]}
            </td>
          ))}

          <td className="border p-2 text-center bg-yellow-300 text-black">
            {grandTotal}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
)}

      {/* Loading State */}
      {loading && (
        <div className="text-center font-semibold text-gray-500 mt-4">
          Loading…
        </div>
      )}
    </div>
  );
}
