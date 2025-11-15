"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
// import SkeletonTable from "@/components/SkeletonTable";
import { useRouter } from "next/navigation";

export default function Assigned() {
    const router = useRouter();

    const [queries, setQueries] = useState([]);
    const [branchStats, setBranchStats] = useState([]);
    const [cityStats, setCityStats] = useState([]);

    const [branches, setBranches] = useState([]);
    const [cities, setCities] = useState([]);

    const [loading, setLoading] = useState(true);

    // Filters
    const [branchFilter, setBranchFilter] = useState("All");
    const [cityFilter, setCityFilter] = useState("All");

    // Search fields
    const [searchTerm, setSearchTerm] = useState("");
    const [searchBy, setSearchBy] = useState("name"); // NEW

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const getData = async () => {
        setLoading(true);

        try {
            const res = await axios.get(
                `/api/queries/enrolledserver?` +
                `page=${page}&limit=6&` +
                `branch=${branchFilter}&` +
                `city=${cityFilter}&` +
                `search=${searchTerm}&` +
                `searchBy=${searchBy}`
            );

            setQueries(res.data.fetch);
            setBranchStats(res.data.branchStats);
            setCityStats(res.data.cityStats);
            setBranches(res.data.branches);
            setCities(res.data.cities);
            setTotalPages(res.data.totalPages);
        } catch (error) {
            console.log(error);
        }

        setLoading(false);
    };

    useEffect(() => {
        getData();
    }, [page, branchFilter, cityFilter, searchTerm, searchBy]);

    const handleRowClick = (id) => router.push(`/main/page/allquery/${id}`);

    return (
        <div className="container mx-auto p-5">

            <h1 className="text-3xl font-bold text-[#29234b] mb-2">Enrolled Students</h1>
            <p className="text-gray-600 mb-6">Search & filter enrolled students</p>

            {/* FILTER BOX */}
            <div className="bg-white rounded-xl shadow-md p-5 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                    {/* Branch */}
                    <select
                        onChange={(e) => setBranchFilter(e.target.value)}
                        className="border p-3 rounded-lg bg-gray-50"
                    >
                        <option value="All">All Branches</option>
                        {branches.map((b, i) => (
                            <option key={i} value={b}>{b}</option>
                        ))}
                    </select>

                    {/* City */}
                    <select
                        onChange={(e) => setCityFilter(e.target.value)}
                        className="border p-3 rounded-lg bg-gray-50"
                    >
                        <option value="All">All Cities</option>
                        {cities.map((c, i) => (
                            <option key={i} value={c}>{c}</option>
                        ))}
                    </select>

                    {/* Search By */}
                    <select
                        onChange={(e) => setSearchBy(e.target.value)}
                        className="border p-3 rounded-lg bg-gray-50"
                    >
                        <option value="name">Search by Name</option>
                        <option value="phone">Search by Number</option>
                        <option value="city">Search by City</option>
                    </select>

                    {/* Search Input */}
                    <input
                        className="border p-3 rounded-lg bg-gray-50"
                        placeholder="Enter search text..."
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">

                {/* TABLE */}
                <div className="lg:w-2/3 w-full">
                    <div className="bg-white p-5 rounded-xl shadow-lg">
                        <h2 className="text-xl font-semibold mb-3">Student List</h2>

                        <div className="border rounded-lg p-4 bg-gray-50">
                            {loading ? (
                                
                                <div>Loading...</div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-[#29234b] text-white">
                                            <th className="py-3 px-4">#</th>
                                            <th className="py-3 px-4">Name</th>
                                            <th className="py-3 px-4">City</th>
                                            <th className="py-3 px-4">Phone</th>
                                            <th className="py-3 px-4">Branch</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {queries.map((q, i) => (
                                            <tr
                                                key={q._id}
                                                onClick={() => handleRowClick(q._id)}
                                                className="border-b bg-white hover:bg-gray-100 cursor-pointer"
                                            >
                                                <td className="py-3 px-4">
                                                    {(page - 1) * 6 + i + 1}
                                                </td>

                                                <td className="py-3 px-4">{q.studentName}</td>
                                                <td className="py-3 px-4">{q.studentContact.city}</td>
                                                <td className="py-3 px-4">{q.studentContact.phoneNumber}</td>
                                                <td className="py-3 px-4">{q.branch}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Pagination */}
                        <div className="flex justify-between items-center mt-4">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                                className="px-4 py-2 bg-[#29234b] text-white rounded-lg disabled:opacity-40"
                            >
                                Prev
                            </button>

                            <span className="font-semibold text-gray-600">
                                Page {page} of {totalPages}
                            </span>

                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(page + 1)}
                                className="px-4 py-2 bg-[#29234b] text-white rounded-lg disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE STATS */}
                <div className="lg:w-1/3 w-full space-y-6">

                    {/* Branch Stats */}
                    <div className="bg-white p-5 rounded-xl shadow-lg">
                        <h2 className="text-xl font-semibold mb-3">Branch Stats</h2>
                        {branchStats.map((b, i) => (
                            <div key={i} className="flex justify-between py-2 border-b">
                                <span>{b._id}</span>
                                <span className="font-bold">{b.count}</span>
                            </div>
                        ))}
                    </div>

                    {/* City Stats */}
                    <div className="bg-white p-5 rounded-xl shadow-lg">
                        <h2 className="text-xl font-semibold mb-3">City Stats</h2>
                        {cityStats.map((c, i) => (
                            <div key={i} className="flex justify-between py-2 border-b">
                                <span>{c._id}</span>
                                <span className="font-bold">{c.count}</span>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
}
