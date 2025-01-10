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
    const [studentNameFilter, setStudentNameFilter] = useState("");
    const [contactFilter, setContactFilter] = useState(""); // New state for contact filter

    const router = useRouter();

    useEffect(() => {
        const fetchQueryData = async () => {
            try {
                setLoading(true);
                const response = await axios.get("/api/queries/enrolled/5");
                setQueries(response.data.fetch);
                setFilteredQueries(response.data.fetch);
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
            const studentNameMatch = studentNameFilter
                ? query.studentName.toLowerCase().includes(studentNameFilter.toLowerCase())
                : true;
            const contactMatch = contactFilter
                ? query.studentContact.phoneNumber
                      .toLowerCase()
                      .includes(contactFilter.toLowerCase())
                : true;

            return branchMatch && studentNameMatch && contactMatch;
        });
        setFilteredQueries(filtered);
    }, [branchFilter, studentNameFilter, contactFilter, queries]);

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
                <div className="w-full">
                    <h1 className="text-lg font-semibold mb-4">Total Queries: {filteredQueries.length}</h1>
                    <div className="shadow-lg rounded-lg bg-white mb-6">
                        <div className="p-4">
                            <div className="flex flex-col lg:flex-row justify-between items-center gap-5 mb-4">
                                <input
                                    type="text"
                                    placeholder="Filter by Branch"
                                    className="border rounded px-3 py-2 w-full lg:w-1/4"
                                    value={branchFilter}
                                    onChange={(e) => setBranchFilter(e.target.value)}
                                />
                                <input
                                    type="text"
                                    placeholder="Filter by Student Name"
                                    className="border rounded px-3 py-2 w-full lg:w-1/4"
                                    value={studentNameFilter}
                                    onChange={(e) => setStudentNameFilter(e.target.value)}
                                />
                                <input
                                    type="text"
                                    placeholder="Filter by Contact Number"
                                    className="border rounded px-3 py-2 w-full lg:w-1/4"
                                    value={contactFilter}
                                    onChange={(e) => setContactFilter(e.target.value)}
                                />
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
                                            <th className="px-6 py-4">Contact No</th>
                                            <th className="px-6 py-4">Branch</th>
                                            <th className="px-6 py-4">City</th>
                                            <th className="px-6 py-4">Deadline</th>
                                            <th className="px-6 py-4">Fees</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-4 text-center">
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
                                                        <td className="px-6 py-1 font-semibold">{query.studentContact.phoneNumber}</td>
                                                        <td className="px-6 py-1">{query.branch}</td>
                                                        <td className="px-6 py-1">{query.studentContact.city}</td>
                                                        <td className="px-6 py-1">
                                                            {deadline.toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-1">₹ {query.total}</td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
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
