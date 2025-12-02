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

    const exportExcel = () => {
        const sheetData = [
            ["Tifa Counsellor Admission Report"],
            [`${fromDate || "Start"} to ${toDate || "End"}`],
            [],
            ["Course", ...Object.keys(allquery), "Total"],
            ...courseList.map((course) => [
                course,
                ...Object.keys(allquery).map((user) => allquery[user][course]?.count || 0),
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
                    onClick={exportExcel}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow text-xs"
                >
                    Export to Excel
                </button>
            </div>

            {/* Table */}
            {!loading && (
                <div className="overflow-x-auto">
                    <table className="w-full border border-gray-300 rounded-lg text-xs shadow-sm">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-green-700 text-white">
                                <th className="border p-2 w-40">Courses</th>
                                {Object.keys(allquery).map((user) => (
                                    <th key={user} className="border p-2 text-center">
                                        {user}
                                    </th>
                                ))}
                                <th className="border p-2 text-center bg-yellow-400 text-black font-bold">
                                    Total
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {courseList.map((course, idx) => (
                                <tr key={course} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50`}>
                                    <td className="border p-2 font-medium">{course}</td>

                                    {Object.keys(allquery).map((user) => {
                                        const data = allquery[user][course];

                                        return (
                                            <td key={user} className="border p-2 text-center">
                                                {data?.count > 0 ? (
                                                    <button
                                                        className=" underline font-semibold"
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

                                    <td className="border p-2 text-center font-bold bg-blue-100">
                                        {getCourseTotal(course)}
                                    </td>
                                </tr>
                            ))}

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

            {loading && (
                <div className="text-center font-semibold text-gray-500 mt-4">Loading…</div>
            )}

            {/* Modal Details */}
            {selectedData && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white w-[95%] md:w-[70%] p-4 rounded-xl shadow-lg max-h-[85vh] overflow-y-auto">

                        <div className="flex justify-between items-center border-b pb-2 mb-3">
                            <h2 className="text-lg font-bold text-gray-800">
                                {selectedData.course} — {selectedData.user}
                            </h2>
                            <button className="text-red-600 font-bold text-xl"
                                onClick={() => setSelectedData(null)}>
                                ✖
                            </button>
                        </div>

                        <table className="w-full border text-sm">
                            <thead className="bg-gray-200">
                                <tr>
                                    <th className="border p-2">Student</th>
                                    <th className="border p-2">Phone</th>
                                    <th className="border p-2">City</th>
                                    <th className="border p-2">Reference</th>
                                    {/* <th className="border p-2">Sub Option</th> */}
                                </tr>
                            </thead>

                            <tbody>
                                {selectedData.queries.map((q) => (
                                    <tr key={q._id} className="hover:bg-blue-50">
                                        <td className="border p-2">{q.studentName}</td>
                                        <td className="border p-2">{q.studentContact?.phoneNumber}</td>
                                        <td className="border p-2">{q.studentContact?.city}</td>
                                        <td className="border p-2">{q.referenceid}</td>
                                        {/* <td className="border p-2">{q.suboption}</td> */}
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
