"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Loader from "@/components/Loader/Loader";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

export default function Visit() {
    const [queries, setQueries] = useState([]);
    const [filteredQueries, setFilteredQueries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [branchFilter, setBranchFilter] = useState("");
    const [enrollFilter, setEnrollFilter] = useState("");

    const router = useRouter();

    useEffect(() => {
        const fetchQueryData = async () => {
            try {
                setLoading(true);
                const { data } = await axios.get(`/api/report/allvisit/query`);
                setQueries(data.queries);
                setFilteredQueries(data.queries);
            } catch (error) {
                console.error("Error fetching query data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchQueryData();
    }, []);

    useEffect(() => {
        const filtered = queries.filter((query) => {
            const branchMatch = branchFilter
                ? query.branch.toLowerCase().includes(branchFilter.toLowerCase())
                : true;
            const enrollMatch = enrollFilter
                ? (enrollFilter === "Enroll" && query.addmission) ||
                (enrollFilter === "Not Enroll" && !query.addmission)
                : true;

            return branchMatch && enrollMatch;
        });
        setFilteredQueries(filtered);
    }, [branchFilter, enrollFilter, queries]);

    const handleRowClick = (id) => {
        router.push(`/main/page/allquery/${id}`);
    };

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredQueries);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Queries");
        XLSX.writeFile(workbook, "queries.xlsx");
    };

    return (
        <div className="container mx-auto p-5">
            <div className="flex flex-col lg:flex-row justify-between space-y-6 lg:space-y-0 lg:space-x-6">
                <div className="w-full">Total Queries: {filteredQueries.length}
                    <div className="shadow-lg rounded-lg bg-white mb-6">
                        <div className="p-4">
                            <div className="flex justify-between items-center gap-5 mb-4">
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Filter by Branch"
                                        className="border rounded px-3 py-2"
                                        value={branchFilter}
                                        onChange={(e) => setBranchFilter(e.target.value)}
                                    />
                                    <select
                                        className="border rounded px-3 py-2 ms-2"
                                        value={enrollFilter}
                                        onChange={(e) => setEnrollFilter(e.target.value)}
                                    >
                                        <option value="">All</option>
                                        <option value="Enroll">Enroll</option>
                                        <option value="Not Enroll">Not Enroll</option>
                                    </select>
                                </div>
                                <button
                                    onClick={exportToExcel}
                                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                >
                                    Export to Excel
                                </button>
                            </div>
                            <div className="relative overflow-y-auto">
                                <table className="min-w-full text-xs text-left text-gray-600 font-sans">
                                    <thead className="bg-[#29234b] text-white uppercase">
                                        <tr>
                                            <th className="px-6 py-4">Student Name</th>
                                            <th className="px-6 py-4">Branch</th>
                                            <th className="px-6 py-4">City</th>
                                            <th className="px-6 py-4">Grade</th>
                                            <th className="px-6 py-4">Deadline</th>
                                            <th className="px-6 py-4">Enroll</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center h-full">
                                                        <Loader />
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filteredQueries.length > 0 ? (
                                            filteredQueries.map((query) => {
                                                const deadline = new Date(query.deadline);
                                                return (
                                                    <tr
                                                        key={query._id}
                                                        className="border-b cursor-pointer transition-colors duration-200 hover:opacity-90"
                                                        onClick={() => handleRowClick(query._id)}
                                                    >
                                                        <td className="px-6 py-1 font-semibold">{query.studentName}</td>
                                                        <td className="px-6 py-1">{query.branch}</td>
                                                        <td className="px-6 py-1">{query.studentContact.city}</td>
                                                        <td className="px-6 py-1">{query.lastgrade}</td>
                                                        <td className="px-6 py-1">
                                                            {deadline.toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-1">
                                                            {query.addmission ? "Enroll" : "Not Enroll"}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                                                    No queries available
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
