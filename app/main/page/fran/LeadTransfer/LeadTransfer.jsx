"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";

export default function LeadTransfer() {
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(true);

    const [selectedAdminId, setSelectedAdminId] = useState("");
    const [selectedAdminName, setSelectedAdminName] = useState("");
    const [report, setReport] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState({ type: "", queryIds: [] });

    // 1) FETCH ALL USERS FIRST
    useEffect(() => {
        const fetchuserData = async () => {
            try {
                 const res1 = await axios.get("/api/admin/fetchallserver/admin?franchisestaff=true", {
                    params: {
                        limit: 888
                    }
                });

                setUsers(res1.data.users);
            } catch (error) {
                console.error("Error fetching user data:", error);
                alert("Failed to load users");
            } finally {
                setUsersLoading(false);
            }
        };

        fetchuserData();
    }, []);

    // 2) FETCH REPORT OF A SINGLE USER
    const fetchReportForUser = async (adminId, adminName) => {
        setSelectedAdminId(adminId);
        setSelectedAdminName(adminName);
        setReport(null);
        setReportLoading(true);

        try {
            const response = await axios.get(
                `/api/report/MBS2/query?adminId=${adminId}`
            );
            const reportData =
                response.data?.data?.userActivityReport?.[0] || null;
            setReport(reportData);
        } catch (error) {
            console.error("Error fetching report:", error);
            alert("Failed to fetch report for this user");
        } finally {
            setReportLoading(false);
        }
    };

    // MODAL HANDLERS
    const openModal = (type, queryIds) => {
        setModalData({ type, queryIds });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalData({ type: "", queryIds: [] });
    };

    // COMMON LOADER UI
    const LoaderUI = (
        <div className="flex justify-center items-center h-40">
            <div className="w-10 h-10 border-4 border-t-4 border-gray-200 rounded-full animate-spin"></div>
            <p className="ml-4 text-lg font-semibold text-gray-700">
                Loading...
            </p>
        </div>
    );

    return (
        <div className="mt-12 container lg:w-[90%] mx-auto">
            <div className="text-3xl font-bold text-center text-white bg-blue-600 py-4 rounded-t-xl shadow-md">
                Lead Transfer Reports 
            </div>

            <div className="bg-white shadow-md rounded-b-xl p-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* LEFT SIDE: USER LIST */}
                <div className="lg:col-span-1 border-r border-gray-200 pr-2">
                    <h2 className="text-lg font-semibold mb-3">
                        All Users / Admins
                    </h2>

                    {usersLoading ? (
                        LoaderUI
                    ) : users.length === 0 ? (
                        <p className="text-sm text-gray-500">
                            No users found.
                        </p>
                    ) : (
                        <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                            {users.map((user) => (
                                <button
                                    key={user._id}
                                    onClick={() =>
                                        fetchReportForUser(user._id, user.name)
                                    }
                                    className={`w-full text-left px-3 py-2 rounded border text-sm hover:bg-blue-50 ${
                                        selectedAdminId === user._id
                                            ? "bg-blue-100 border-blue-500"
                                            : "bg-white border-gray-300"
                                    }`}
                                >
                                    <div className="font-medium">
                                        {user.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {user.branch}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* RIGHT SIDE: REPORT FOR SELECTED USER */}
                <div className="lg:col-span-3 pl-2">
                    <h2 className="text-lg font-semibold mb-3">
                        {selectedAdminName
                            ? `Report for: ${selectedAdminName}`
                            : "Select a user to view report"}
                    </h2>

                    {!selectedAdminId && (
                        <p className="text-sm text-gray-500">
                            Please click on a user name from the left side to
                            see their MBS report.
                        </p>
                    )}

                    {selectedAdminId && reportLoading && LoaderUI}

                    {selectedAdminId && !reportLoading && !report && (
                        <p className="text-sm text-gray-500">
                            No report data found for this user.
                        </p>
                    )}

                    {selectedAdminId && !reportLoading && report && (
                        <div className="mt-2">
                            <table className="table-auto w-full border-collapse border border-gray-300">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 px-4 py-2">
                                            User Name
                                        </th>
                                        <th className="border border-gray-300 px-4 py-2">
                                            Branch
                                        </th>
                                        <th className="border border-gray-300 px-4 py-2">
                                            Sent Queries
                                        </th>
                                        <th className="border border-gray-300 px-4 py-2">
                                            Received Queries
                                        </th>
                                        <th className="border border-gray-300 px-4 py-2">
                                            Sent Query
                                        </th>
                                        <th className="border border-gray-300 px-4 py-2">
                                            Received Query
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="hover:bg-gray-50">
                                        <td className="border border-gray-300 px-4 py-2">
                                            {report.userName}
                                        </td>
                                        <td className="border border-gray-300 px-4 py-2">
                                            {report.branch}
                                        </td>
                                        <td className="border border-gray-300 px-4 py-2">
                                            {report.sentQueries}
                                        </td>
                                        <td className="border border-gray-300 px-4 py-2">
                                            {report.receivedQueries}
                                        </td>

                                        <td className="border border-gray-300 px-4 py-2 text-center">
                                            <button
                                                className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
                                                disabled={
                                                    !report.sentQueryDetails ||
                                                    report.sentQueryDetails
                                                        .length === 0
                                                }
                                                onClick={() =>
                                                    openModal(
                                                        "Sent Queries",
                                                        report.sentQueryDetails ||
                                                            []
                                                    )
                                                }
                                            >
                                                View (
                                                {report.sentQueryDetails
                                                    ? report
                                                          .sentQueryDetails
                                                          .length
                                                    : 0}
                                                )
                                            </button>
                                        </td>

                                        <td className="border border-gray-300 px-4 py-2 text-center">
                                            <button
                                                className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 disabled:opacity-50"
                                                disabled={
                                                    !report.receivedQueryDetails ||
                                                    report
                                                        .receivedQueryDetails
                                                        .length === 0
                                                }
                                                onClick={() =>
                                                    openModal(
                                                        "Received Queries",
                                                        report.receivedQueryDetails ||
                                                            []
                                                    )
                                                }
                                            >
                                                View (
                                                {report.receivedQueryDetails
                                                    ? report
                                                          .receivedQueryDetails
                                                          .length
                                                    : 0}
                                                )
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div
                        className="fixed inset-0 bg-black opacity-50"
                        onClick={closeModal}
                    ></div>

                    <div className="bg-white p-6 rounded shadow-lg z-10 max-h-[80vh] overflow-y-scroll w-[95%] md:w-[70%] lg:w-[60%]">
                        <h3 className="text-xl font-semibold mb-4">
                            {modalData.type}
                        </h3>

                        <table className="min-w-full table-auto">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="px-4 py-2 text-left">
                                        Name
                                    </th>
                                    <th className="px-4 py-2 text-left">
                                        Assigned Date
                                    </th>
                                    <th className="px-4 py-2 text-left">
                                        Assigned By
                                    </th>
                                    <th className="px-4 py-2 text-left">
                                        Assigned To
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {modalData.queryIds.map((query, idx) => {
                                    const formattedDate = query.assignedDate
                                        ? new Date(
                                              query.assignedDate
                                          ).toLocaleDateString("en-GB", {
                                              day: "numeric",
                                              month: "long",
                                              year: "numeric",
                                          })
                                        : "";

                                    return (
                                        <tr key={idx} className="border-t">
                                            <td className="px-4 py-2">
                                                {query.studentName}
                                            </td>
                                            <td className="px-4 py-2">
                                                {formattedDate}
                                            </td>
                                            <td className="px-4 py-2">
                                                {Array.isArray(
                                                    query.assignedsenthistory
                                                )
                                                    ? query.assignedsenthistory.join(
                                                          ", "
                                                      )
                                                    : ""}
                                            </td>
                                            <td className="px-4 py-2">
                                                {Array.isArray(
                                                    query.assignedreceivedhistory
                                                )
                                                    ? query.assignedreceivedhistory.join(
                                                          ", "
                                                      )
                                                    : ""}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        <button
                            className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                            onClick={closeModal}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
