"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Loader from "@/components/Loader/Loader";
import { useRouter } from "next/navigation";

export default function UnderVisit() {

    const [queries, setQueries] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [selectedGrade, setSelectedGrade] = useState("Null");
    const [selectedDeadline, setSelectedDeadline] = useState("All");
    const [selectedEnrollStatus, setSelectedEnrollStatus] = useState("All");
    const [searchTerm, setSearchTerm] = useState("");

    // Pagination
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 10;

    const router = useRouter();

    // Fetch server-side filtered data
    const fetchQueryData = async () => {
        try {
            setLoading(true);

            const { data } = await axios.get(
                `/api/queries/fetchgradeserver/query`,
                {
                    params: {
                        grade: selectedGrade,
                        deadline: selectedDeadline,
                        enroll: selectedEnrollStatus,
                        search: searchTerm,
                        page,
                        limit
                    }
                }
            );

            setQueries(data.queries);
            setTotal(data.total);

        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    // Re-fetch whenever filters change
    useEffect(() => {
        fetchQueryData();
    }, [selectedGrade, selectedDeadline, selectedEnrollStatus, searchTerm, page]);

    const handleRowClick = (id) => {
        router.push(`/main/page/allquery/${id}`);
    };

    const totalPages = Math.ceil(total / limit);
    const gradeOptions = ["Null", "A", "B", "C"];

    return (
        <div className="container mx-auto p-5">
            <div className="flex flex-col lg:flex-row justify-between space-y-6 lg:space-y-0 lg:space-x-6">

                {/* TABLE */}
                <div className="w-full lg:w-2/3">
                    <div className="shadow-lg rounded-lg bg-white mb-6 relative">

                        <div className="p-4">
                            <h2 className="text-xl font-semibold mb-4">Grade Data</h2>

                            <p className="text-sm mb-3">
                                Total Records: <b>{total}</b>
                            </p>

                            <div className="relative overflow-y-auto" style={{ height: "400px" }}>
                                <table className="min-w-full text-xs text-left text-gray-600">
                                    <thead className="bg-[#29234b] text-white uppercase">
                                        <tr>
                                            <th className="px-6 py-4">Sr. No.</th>
                                            <th className="px-6 py-4">Student Name</th>
                                            <th className="px-6 py-4">Contact Number</th>
                                            <th className="px-6 py-4">Grade</th>
                                            <th className="px-6 py-4">Deadline</th>
                                            <th className="px-6 py-4">Status</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan="5" className="p-6 text-center">
                                                    <Loader />
                                                </td>
                                            </tr>
                                        ) : queries.length > 0 ? (
                                            queries.map((query, index) => (
                                                <tr
                                                    key={query._id}
                                                    className="border-b cursor-pointer hover:bg-gray-100"
                                                    onClick={() => handleRowClick(query._id)}
                                                >
                                                    <td className="px-6 py-2">{(page - 1) * limit + index + 1}</td>
                                                    <td className="px-6 py-2">{query.studentName}</td>
                                                    <td className="px-6 py-2">{query.studentContact.phoneNumber}</td>
                                                    <td className="px-6 py-2">{query.grade}</td>
                                                    <td className="px-6 py-2">
                                                        {new Date(query.deadline).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-2">
                                                        {query.addmission ? "Enroll" : "Pending"}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="p-6 text-center text-gray-500">
                                                    No records found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="py-3 flex justify-between items-center">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(page - 1)}
                                    className="bg-gray-300 px-3 py-1 rounded disabled:opacity-50"
                                >
                                    Previous
                                </button>

                                <span>Page {page} of {totalPages}</span>

                                <button
                                    disabled={page === totalPages}
                                    onClick={() => setPage(page + 1)}
                                    className="bg-gray-300 px-3 py-1 rounded disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FILTERS */}
                <div className="w-full lg:w-1/3 space-y-6">

                    {/* Grade filter */}
                    <div className="shadow-lg rounded-lg bg-white p-4">
                        <h3 className="text-lg font-semibold mb-4">Search</h3>
                        <input
                            type="text"
                            placeholder="Search name, mobile or city"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 border rounded"
                        />
                    </div>
                    <div className="shadow-lg rounded-lg bg-white p-4">
                        <h3 className="text-lg font-semibold mb-4">Filter by Grade</h3>
                        {gradeOptions.map(g => (
                            <button
                                key={g}
                                onClick={() => { setPage(1); setSelectedGrade(g); }}
                                className={`w-full py-2 px-4 my-1 rounded ${selectedGrade === g ? "bg-gray-300" : "bg-gray-100"}`}
                            >
                                {g === "Null" ? "All" : `Grade ${g}`}
                            </button>
                        ))}
                    </div>

                    {/* Deadline Filter */}
                    {/* <div className="shadow-lg rounded-lg bg-white p-4">
                        <h3 className="text-lg font-semibold mb-4">Filter by Deadline</h3>
                        <select
                            className="w-full py-2 px-3 bg-gray-100 rounded"
                            value={selectedDeadline}
                            onChange={(e) => { setPage(1); setSelectedDeadline(e.target.value); }}
                        >
                            <option value="All">All</option>
                            <option value="Today">Today</option>
                            <option value="Tomorrow">Tomorrow</option>
                            <option value="Past">Past</option>
                        </select>
                    </div> */}

                    {/* Search Filter */}
                    

                </div>
            </div>
        </div>
    );
}
