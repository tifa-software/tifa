"use client";
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Loader from '@/components/Loader/Loader';
import { ArrowLeft, ArrowRight, Search, CirclePlus, Filter, X } from "lucide-react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function User() {
    const [user, setUser] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [searchTerm, setSearchTerm] = useState("");
    const [filterBranch, setFilterBranch] = useState("");
    const [filterStatus, setFilterStatus] = useState("");

    useEffect(() => {
        fetchUsers();
    }, [currentPage, searchTerm, filterBranch, filterStatus]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get("/api/admin/fetchallserver/admin?franchisestaff=true", {
                params: {
                    page: currentPage,
                    limit: 88,
                    search: searchTerm,
                    branch: filterBranch || "All",
                    usertype: filterStatus || "All"
                }
            });

            setUser(res.data.users);
            setTotalPages(res.data.totalPages);
        } catch (err) {
            console.log("Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleRowClick = (email) => {
        router.push(`/main/page/franuser/${email}`);
    };

    return (
        <div className="container lg:w-[95%] mx-auto py-5">
            {/* Search */}
            <div className="flex justify-between items-center mb-4">
                <div className="relative w-1/3">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search size={14} />
                    </span>
                    <input
                        type="text"
                        placeholder="Search By Name or Phone"
                        className="border px-3 py-2 pl-10 text-sm w-full"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>

                {/* Filters */}
                <div className="hidden lg:flex space-x-3">
                    <select
                        className="border px-3 py-2 text-sm"
                        value={filterBranch}
                        onChange={(e) => {
                            setFilterBranch(e.target.value);
                            setCurrentPage(1);
                        }}
                    >
                        <option value="">All Branch</option>
                        {[...new Set(user.map((u) => u.branch))].map((branch, index) => (
                            <option key={index} value={branch}>{branch}</option>
                        ))}
                    </select>

                    <select
                        className="border px-3 py-2 text-sm"
                        value={filterStatus}
                        onChange={(e) => {
                            setFilterStatus(e.target.value);
                            setCurrentPage(1);
                        }}
                    >
                        <option value="">All Staff</option>
                        <option value="0">Staff</option>
                        <option value="1">Branch Admin</option>
                    </select>

                    <Link href={'/main/page/registerfranchiesstaff'}>
                        <button className="bg-[#29234b] text-white text-sm px-4 py-2 rounded-md flex items-center">
                            <CirclePlus size={16} className="me-1" /> Add User
                        </button>
                    </Link>
                </div>
            </div>

            {/* Table */}
            <div className="relative overflow-x-auto shadow-md bg-white border border-gray-200">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="bg-[#29234b] text-white uppercase">
                        <tr>
                            <th className="px-4 py-2">Staff Name</th>
                            <th className="px-4 py-2">Email</th>
                            <th className="px-4 py-2">Mobile</th>
                            <th className="px-4 py-2">Branch</th>
                            <th className="px-4 py-2">Role</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="5" className="h-[250px] text-center">
                                    <Loader />
                                </td>
                            </tr>
                        ) : user.length > 0 ? (
                            user.map((u) => (
                                <tr
                                    key={u._id}
                                    onClick={() => handleRowClick(u.email)}
                                    className="border-b cursor-pointer hover:bg-gray-100 odd:bg-gray-50"
                                >
                                    <td className="px-4 py-2">{u.name}</td>
                                    <td className="px-4 py-2">{u.email}</td>
                                    <td className="px-4 py-2">{u.mobile}</td>
                                    <td className="px-4 py-2">{u.branch}</td>
                                    <td className="px-4 py-2">
                                        {u.usertype === "0" && (
                                            <span className="px-3 py-1 rounded-full text-white text-xs bg-yellow-500">
                                                Staff
                                            </span>
                                        )}

                                        {u.usertype === "1" && (
                                            <span className="px-3 py-1 rounded-full text-white text-xs bg-green-600">
                                                Branch Admin
                                            </span>
                                        )}

                                        {u.usertype !== "0" && u.usertype !== "1" && (
                                            <span className="px-3 py-1 rounded-full bg-gray-300 text-gray-700 text-xs font-semibold">
                                                Unknown
                                            </span>
                                        )}
                                    </td>

                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="text-center py-4">
                                    No data found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    paginate={setCurrentPage}
                />
            </div>
        </div>
    );
}

const Pagination = ({ currentPage, totalPages, paginate }) => (
    <div className="flex justify-center my-4">
        <button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 mx-1 text-sm border rounded bg-[#29234b] text-white disabled:bg-gray-300"
        >
            <ArrowLeft size={18} />
        </button>

        <span className="px-3 py-1 mx-1 text-sm border rounded bg-gray-200">
            Page {currentPage} of {totalPages}
        </span>

        <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 mx-1 text-sm border rounded bg-[#29234b] text-white disabled:bg-gray-300"
        >
            <ArrowRight size={18} />
        </button>
    </div>
);
