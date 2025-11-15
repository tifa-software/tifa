"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Loader from "@/components/Loader/Loader";
import { useRouter } from "next/navigation";

export default function Assigned() {
    const [queries, setQueries] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [selectedReference, setSelectedReference] = useState("All");
    const [selectedDeadline, setSelectedDeadline] = useState("All");
    const [selectedEnrollStatus, setSelectedEnrollStatus] = useState("All");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const itemsPerPage = 10;

    // Reference list from server
    const [referenceList, setReferenceList] = useState([]);

    const router = useRouter();

    const fetchData = async () => {
        try {
            setLoading(true);

            const { data } = await axios.get(
                `/api/queries/fetchall/query?page=${currentPage}&limit=${itemsPerPage}&reference=${selectedReference}&deadline=${selectedDeadline}&status=${selectedEnrollStatus}`
            );

            setQueries(data.fetch);
            setTotalItems(data.total);
            setReferenceList(data.referenceList);
            setTotalEnroll(data.totalEnroll);
            setTotalPending(data.totalPending);
        } catch (error) {
            console.log("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch when filter or page changes
    useEffect(() => { fetchData(); }, [
        selectedReference,
        selectedDeadline,
        selectedEnrollStatus,
        currentPage
    ]);

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const handleRowClick = (id) => router.push(`/main/page/allquery/${id}`);

    const [totalEnroll, setTotalEnroll] = useState(0);
    const [totalPending, setTotalPending] = useState(0);

    return (
        <div className="container mx-auto p-5">
            <div className="flex flex-col lg:flex-row justify-between space-y-6 lg:space-y-0 lg:space-x-6">

                {/* MAIN TABLE */}
                <div className="w-full lg:w-2/3">
                    <div className="shadow-lg rounded-lg bg-white mb-6">
                        <div className="p-4">
                            <h2 className="text-xl font-semibold mb-4 text-gray-800">Reference Count</h2>

                            <div className="flex gap-4 text-sm text-gray-600 mb-4">
                                <p>Total: <b>{totalItems}</b></p>
                                <span>Enrolled: <b className="text-green-600">{totalEnroll}</b></span>
                                <span>Pending: <b className="text-red-600">{totalPending}</b></span>
                            </div>

                            <div className="relative overflow-y-auto" style={{ height: "400px" }}>
                                <table className="min-w-full text-xs text-left text-gray-600">
                                    <thead className="bg-[#29234b] text-white uppercase">
                                        <tr>
                                            <th className="px-6 py-4">Sr</th>
                                            <th className="px-6 py-4">Name</th>
                                            <th className="px-6 py-4">Reference</th>
                                            <th className="px-6 py-4">Deadline</th>
                                            <th className="px-6 py-4">Status</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan={5} className="py-10 text-center"><Loader /></td></tr>
                                        ) : queries.length > 0 ? (
                                            queries.map((query, index) => {
                                                const d = new Date(query.deadline);
                                                const isToday = d.toDateString() === new Date().toDateString();
                                                const isPast = d < new Date();

                                                const rowColor = query.addmission
                                                    ? "bg-[#6cb049] text-white"
                                                    : isToday
                                                        ? "bg-red-500 text-white"
                                                        : isPast
                                                            ? "bg-red-700 text-white"
                                                            : "";

                                                return (
                                                    <tr key={query._id}
                                                        onClick={() => handleRowClick(query._id)}
                                                        className={`cursor-pointer ${rowColor}`}>
                                                        <td className="px-6 py-1">{(currentPage - 1) * 10 + index + 1}</td>
                                                        <td className="px-6 py-1">{query.studentName}</td>
                                                        <td className="px-6 py-1">{query.referenceid}</td>
                                                        <td className="px-6 py-1">{d.toLocaleDateString()}</td>
                                                        <td className="px-6 py-1">{query.addmission ? "Enroll" : "Pending"}</td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr><td colSpan={5} className="text-center py-4">No Data</td></tr>
                                        )}
                                    </tbody>

                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="bg-gray-100 py-2 px-4 flex justify-between mt-2">
                                <button disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(currentPage - 1)}
                                    className="px-4 py-1 bg-gray-300 rounded">Prev</button>

                                <span>Page {currentPage} / {totalPages}</span>

                                <button disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(currentPage + 1)}
                                    className="px-4 py-1 bg-gray-300 rounded">Next</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FILTERS */}
                <div className="w-full lg:w-1/3 space-y-6">

                    {/* Reference Filter */}
                    <div className="shadow-lg p-4 bg-white rounded">
                        <h3 className="text-lg font-semibold mb-4">Filter by Reference</h3>

                        <button
                            onClick={() => setSelectedReference("All")}
                            className={`w-full py-2 px-4 rounded text-left ${selectedReference === "All" ? "bg-gray-200 font-bold" : ""}`}>
                            All
                        </button>

                        {referenceList.map((ref) => (
                            <button
                                key={ref}
                                onClick={() => setSelectedReference(ref)}
                                className={`w-full py-2 px-4 rounded text-left mt-2 ${selectedReference === ref ? "bg-gray-200 font-bold" : ""}`}>
                                {ref}
                            </button>
                        ))}
                    </div>




                    {/* Status */}
                    <div className="shadow-lg p-4 bg-white rounded">
                        <h3 className="text-lg font-semibold mb-2">Filter by Status</h3>
                        <select value={selectedEnrollStatus}
                            onChange={(e) => setSelectedEnrollStatus(e.target.value)}
                            className="w-full py-2 px-3 bg-gray-100 rounded">
                            <option>All</option>
                            <option>Enroll</option>
                            <option>Pending</option>
                        </select>
                    </div>

                </div>
            </div>
        </div>
    );
}
