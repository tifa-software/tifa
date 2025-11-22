"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Loader from "@/components/Loader/Loader";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function UserPendingReport() {
    const today = new Date().toISOString().split("T")[0];

    const [tasks, setTasks] = useState([]);
    const [branches, setBranches] = useState([]);
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [branchId, setBranchId] = useState("");
    const [userId, setUserId] = useState("");
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [loading, setLoading] = useState(false);
    const [expandedRow, setExpandedRow] = useState(null);

    const fetchBranches = async () => {
        const res = await axios.get("/api/branch/fetchall/branch");
        setBranches(res.data.fetch || res.data.data || []);
    };

    const fetchUsers = async () => {
        const res = await axios.get("/api/admin/fetchall/admin");
        const allUsers = res.data.fetch || res.data.data || [];
        setUsers(allUsers);
        setFilteredUsers(allUsers);
    };

    const fetchData = async () => {
        setLoading(true);
        const params = {
            branchId,
            userId,
            startDate,
            endDate
        };

        const res = await axios.get("/api/dailytaskget", { params });
        setTasks(res.data.data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchBranches();
        fetchUsers();
    }, []);

    useEffect(() => {
        if (!branchId) setFilteredUsers(users);
        else setFilteredUsers(users.filter((u) => u.branch === branchId));
        setUserId("");
    }, [branchId, users]);

    useEffect(() => {
        fetchData();
    }, [branchId, userId, startDate, endDate]);

    return (
        <div className="p-4 w-full">
            <h1 className="text-2xl font-bold mb-5 text-gray-800">
                📋 User Pending Report
            </h1>

            {/* Filter Box */}
            <div className="bg-white p-4 rounded-lg shadow-sm border mb-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <select
                        className="border p-2 rounded-md"
                        value={branchId}
                        onChange={(e) => setBranchId(e.target.value)}
                    >
                        <option value="">All Branches</option>
                        {branches.map((b) => (
                            <option key={b._id} value={b.branch_name}>
                                {b.branch_name}
                            </option>
                        ))}
                    </select>

                    <select
                        className="border p-2 rounded-md"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                    >
                        <option value="">All Users</option>
                        {filteredUsers.map((u) => (
                            <option key={u._id} value={u._id}>
                                {u.name} ({u.email})
                            </option>
                        ))}
                    </select>

                    <input
                        type="date"
                        className="border p-2 rounded-md"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />

                    <input
                        type="date"
                        className="border p-2 rounded-md"
                        min={startDate}
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="h-48 flex justify-center items-center">
                    <Loader />
                </div>
            ) : tasks.length === 0 ? (
                <p className="text-center text-gray-500">No data found</p>
            ) : (
                <div className="overflow-auto bg-white rounded-xl shadow-md border">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-800 sticky top-0 text-white z-10">
                            <tr>
                                <th className="px-4 py-3 text-left">User</th>
                                <th className="px-4 py-3 text-center">Branch</th>
                                <th className="px-4 py-3 text-center">Date</th>
                                <th className="px-4 py-3 text-center text-blue-300">
                                    Today Pending
                                </th>
                                <th className="px-4 py-3 text-center text-yellow-300">
                                    Past Due Pending
                                </th>
                                <th></th>
                            </tr>
                        </thead>

                        <tbody>
                            {tasks.map((t) => {
                                const expanded = expandedRow === t._id;
                                return (
                                    <React.Fragment key={t._id}>
                                        {/* Main Row */}
                                        <tr
                                            className="border-b hover:bg-gray-100 cursor-pointer"
                                            onClick={() =>
                                                setExpandedRow(expanded ? null : t._id)
                                            }
                                        >
                                            <td className="px-4 py-3">
                                                <p className="font-semibold">{t.user?.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {t.user?.email}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {t.user?.branchName}
                                            </td>
                                            <td className="px-4 py-3 text-center">{t.date}</td>

                                            <td className="px-4 py-3 text-blue-600 font-bold text-center">
                                                {t.stats.todayAssigned}
                                            </td>
                                            <td className="px-4 py-3 text-yellow-600 font-bold text-center">
                                                {t.stats.pastDueAssigned}
                                            </td>

                                            <td className="px-4 py-3 text-center">
                                                {expanded ? <ChevronUp /> : <ChevronDown />}
                                            </td>
                                        </tr>

                                        {/* Expandable Content */}
                                        {expanded && (
    <tr>
        <td colSpan={6} className="bg-gray-50 p-4">

            {/* Today Query Section */}
            <h3 className="text-blue-700 font-semibold mb-2">
                Today Queries ({t.todayQueries?.length || 0})
            </h3>

            {t.todayQueries?.length > 0 ? (
                <table className="w-full text-xs border bg-white mb-5 rounded-md overflow-hidden">
                    <thead className="bg-blue-100 text-gray-700">
                        <tr>
                            <th className="border px-3 py-2">Name</th>
                            <th className="border px-3 py-2">Phone</th>
                            <th className="border px-3 py-2">City</th>
                            <th className="border px-3 py-2">Link</th>
                        </tr>
                    </thead>
                    <tbody>
                        {t.todayQueries.map((q) => (
                            <tr key={q._id} className="hover:bg-gray-100">
                                <td className="border px-3 py-2 font-semibold">{q.studentName}</td>
                                <td className="border px-3 py-2 text-center">{q.studentContact.phoneNumber}</td>
                                <td className="border px-3 py-2 text-center">{q.studentContact.city}</td>
                                <td className="border px-3 py-2 text-center text-blue-600">
                                    <Link href={`/main/page/allquery/${q._id}`}>View</Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className="text-gray-500 text-sm mb-3">No Today Queries</p>
            )}

            {/* Past Due Query Section */}
            <h3 className="text-red-700 font-semibold mb-2">
                Past Due Queries ({t.pastDueQueries?.length || 0})
            </h3>

            {t.pastDueQueries?.length > 0 ? (
                <table className="w-full text-xs border bg-white rounded-md overflow-hidden">
                    <thead className="bg-red-100 text-gray-700">
                        <tr>
                            <th className="border px-3 py-2">Name</th>
                            <th className="border px-3 py-2">Phone</th>
                            <th className="border px-3 py-2">City</th>
                            <th className="border px-3 py-2">Link</th>
                        </tr>
                    </thead>
                    <tbody>
                        {t.pastDueQueries.map((q) => (
                            <tr key={q._id} className="hover:bg-gray-100">
                                <td className="border px-3 py-2 font-semibold">{q.studentName}</td>
                                <td className="border px-3 py-2 text-center">{q.studentContact.phoneNumber}</td>
                                <td className="border px-3 py-2 text-center">{q.studentContact.city}</td>
                                <td className="border px-3 py-2 text-center text-blue-600">
                                    <Link href={`/main/page/allquery/${q._id}`}>View</Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p className="text-gray-500 text-sm">No Past Due Queries</p>
            )}

        </td>
    </tr>
)}

                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function QueryGrid({ queries }) {
    if (!queries?.length) {
        return <p className="text-gray-500 text-sm mb-3">None</p>;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {queries.map((q) => (
                <div key={q._id} className="bg-white shadow-sm border p-3 rounded-md">
                    <p className="font-semibold text-gray-700">{q.studentName}</p>
                    <p className="text-sm text-gray-500">{q.studentContact.phoneNumber}</p>
                    <p className="text-sm text-gray-500">{q.studentContact.city}</p>

                    <Link
                        href={`/main/page/allquery/${q._id}`}
                        className="text-blue-600 mt-2 block text-sm font-semibold"
                    >
                        View Details →
                    </Link>
                </div>
            ))}
        </div>
    );
}
