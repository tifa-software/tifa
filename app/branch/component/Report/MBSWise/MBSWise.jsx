"use client";
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Loader from "@/components/Loader/Loader";
import { useSession } from 'next-auth/react';

export default function MBSWise() {
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const { data: session } = useSession();
    const [ branch, setBranch ] = useState("");

    const [filters, setFilters] = useState({
        userName: "",
        branch: "",
        date: "",
    });
    const [columns, setColumns] = useState({
        userName: true,
        branch: true,
        dailyActivity: true,
        weeklyActivity: true,
        monthlyActivity: true,
        trendAnalysis: true,
    });

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const response = await axios.get(`/api/admin/find-admin-byemail/${session?.user?.email}`);
                setBranch(response.data.branch);
            } catch (err) {
                console.log(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (session?.user?.email) fetchAdminData();
    }, [session]);
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const response = await axios.get("/api/branchreport/MBS/query");
                const reportData = response.data.data.userActivityReport || [];
    
                // Filter data based on the branch
                const filteredByBranch = reportData.filter(item => item.branch === branch);
                
                setData(filteredByBranch);
                setFilteredData(filteredByBranch);
            } catch (error) {
                console.error("Error fetching data:", error);
                alert("Failed to fetch data. Please try again later.");
            } finally {
                setLoading(false);
            }
        };
        if (branch) {
            fetchData();
        }
    }, [branch]);  // This effect will now run whenever `branch` changes
    

    
  


    const handleFilterChange = useCallback((e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    }, []);


    useEffect(() => {
        const filtered = data.map((user) => {
            const matchesUserName = filters.userName
                ? user.userName.toLowerCase().includes(filters.userName.toLowerCase())
                : true;
            const matchesBranch = filters.branch
                ? user.branch.toLowerCase().includes(filters.branch.toLowerCase())
                : true;


            const filteredDailyActivity = filters.date
                ? { [filters.date]: user.dailyActivity[filters.date] }
                : user.dailyActivity;

            const matchesDate = filters.date
                ? Object.keys(user.dailyActivity).includes(filters.date)
                : true;

            return matchesUserName && matchesBranch && matchesDate
                ? { ...user, dailyActivity: filteredDailyActivity }
                : null;
        }).filter(Boolean);

        setFilteredData(filtered);
    }, [filters, data]);


    const handleColumnChange = (e) => {
        const { name, checked } = e.target;
        setColumns((prev) => ({ ...prev, [name]: checked }));
    };

    const toggleModal = () => {
        setIsModalOpen(!isModalOpen);
    };


    // Loader display
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader />
            </div>
        );
    }

    // Render
    return (
        <div className="mt-12 container lg:w-[90%] mx-auto">


            <div className=" flex justify-between gap-4 mb-2">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">
                        Staff Activity Reports
                    </h1>
                </div>
                <div className=" flex gap-2 items-center">
                    <button
                        onClick={toggleModal}
                        className=" px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Open Filters
                    </button>


                </div>
            </div>


            {filteredData.map((user, index) => (
                <div key={index} className="p-4 border rounded mb-4">
                    <table className="table-auto w-full border-collapse border border-gray-300">
                        <thead>
                            <tr>
                                <th className="border border-gray-300 p-2 bg-gray-100">User Info</th>
                                <th className="border border-gray-300 p-2 bg-gray-100">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {columns.userName && (
                                <tr>
                                    <td className="border border-gray-300 p-2 font-semibold">User Name</td>
                                    <td className="border border-gray-300 p-2 text-gray-700">{user.userName}</td>
                                </tr>
                            )}
                            {columns.branch && (
                                <tr>
                                    <td className="border border-gray-300 p-2 font-semibold">Branch</td>
                                    <td className="border border-gray-300 p-2 text-gray-600">{user.branch}</td>
                                </tr>
                            )}
                            {columns.dailyActivity && (
                                <tr>
                                    <td className="border border-gray-300 p-2 font-semibold">Daily Activity</td>
                                    <td className="border border-gray-300 p-2">
                                        <ul className="list-disc list-inside">
                                            <table className=" w-full">
                                                <thead>
                                                    <th className="border border-gray-300 p-2 bg-gray-100">Date</th>
                                                    <th className="border border-gray-300 p-2 bg-gray-100">Action</th>
                                                </thead>
                                                <tbody>
                                                    {Object.entries(user.dailyActivity)
                                                        .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB)) // Sort dates in ascending order
                                                        .map(([date, [actions, admissions]]) => { // Destructure actions and admissions from the array
                                                            // Format the date
                                                            const formattedDate = new Date(date).toLocaleDateString("en-GB", {
                                                                day: "numeric",
                                                                month: "long",
                                                                year: "numeric",
                                                            });

                                                            return (
                                                                <tr key={date}>
                                                                    <td className="border border-gray-300 p-2 text-gray-700">{formattedDate}</td>
                                                                    <td className="border border-gray-300 p-2 text-gray-700">{actions} actions {admissions > 0 && (<span className=" bg-green-500 text-white text-sm  rounded-full px-2">{admissions} Addmission Done</span>)}</td>

                                                                </tr>
                                                            );
                                                        })}


                                                </tbody>

                                            </table>
                                        </ul>
                                    </td>
                                </tr>
                            )}
                            {columns.weeklyActivity && (
                                <tr>
                                    <td className="border border-gray-300 p-2 font-semibold">Current Week Activity</td>
                                    <td className="border border-gray-300 p-2 text-gray-600">{user.weeklyActivity} Update in this Weak</td>
                                </tr>
                            )}

                            {columns.monthlyActivity && (
                                <tr>
                                    <td className="border border-gray-300 p-2 font-semibold">Monthly Activity</td>
                                    <td className="border border-gray-300 p-2">
                                        <ul className="list-disc list-inside">
                                            <table className=" w-full">
                                                <thead>
                                                    <th className="border border-gray-300 p-2 bg-gray-100">Month</th>
                                                    <th className="border border-gray-300 p-2 bg-gray-100">Action</th>
                                                </thead>
                                                <tbody>

                                                    {Object.entries(user.monthlyActivity)
                                                        .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))  // Sort dates in ascending order
                                                        .map(([date, [actions, admissions]]) => {
                                                            // Convert the string date to a Date object and format it
                                                            const formattedDate = new Date(date).toLocaleDateString("en-GB", {

                                                                month: "long",
                                                                year: "numeric",
                                                            });

                                                            return (
                                                                <tr key={date}>
                                                                    <td className="border border-gray-300 p-2 text-gray-700">{formattedDate}</td>
                                                                    <td className="border border-gray-300 p-2 text-gray-700">{actions} actions {admissions} Addmission</td>
                                                                </tr>
                                                            );
                                                        })}

                                                </tbody>

                                            </table>
                                        </ul>
                                    </td>
                                </tr>
                            )}

                            {columns.trendAnalysis && user.trendAnalysis && (


                                <tr>
                                    <td className="border border-gray-300 p-2 font-semibold">Trend Analysis</td>
                                    <td className="border border-gray-300 p-2">
                                        <ul className="list-disc list-inside">
                                            <table className=" w-full">

                                                <tbody>
                                                    <tr>
                                                        <td className="border border-gray-300 p-2 bg-gray-100">Current Week</td>
                                                        <td className="border border-gray-300 p-2 bg-gray-100">{user.trendAnalysis.currentWeek}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-gray-300 p-2 bg-gray-100">Last Week</td>
                                                        <td className="border border-gray-300 p-2 bg-gray-100">{user.trendAnalysis.lastWeek}</td>
                                                    </tr>
                                                    <tr>

                                                        <td className="border border-gray-300 p-2 bg-gray-100">Change</td>
                                                        <td className={
                                                            user.trendAnalysis.change > 0
                                                                ? "text-green-600 border border-gray-300 p-2 bg-gray-100"
                                                                : user.trendAnalysis.change < 0
                                                                    ? "text-red-600 border border-gray-300 p-2 bg-gray-100"
                                                                    : "text-gray-600 border border-gray-300 p-2 bg-gray-100"
                                                        }>{user.trendAnalysis.change}</td>
                                                    </tr>
                                                </tbody>

                                            </table>
                                        </ul>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ))
            }



            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg w-[90%] max-w-lg p-6">
                        <h2 className="text-2xl font-bold mb-4 text-center">Filter & Customize</h2>

                        {/* Filters */}
                        <div className="mb-6 grid grid-cols-1 gap-4">
                            <input
                                type="text"
                                name="userName"
                                placeholder="Filter by Staff Name"
                                value={filters.userName}
                                onChange={handleFilterChange}
                                className="p-2 border rounded"
                                aria-label="Filter by Staff Name"
                            />
                          
                            <input
                                type="date"
                                name="date"
                                value={filters.date}
                                onChange={handleFilterChange}
                                className="p-2 border rounded"
                                aria-label="Filter by Date"
                            />
                        </div>

                        {/* Column Selection */}
                        <div className="mb-6 grid grid-cols-1 gap-4">
                            {Object.keys(columns).map((col) => (
                                <label key={col} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        name={col}
                                        checked={columns[col]}
                                        onChange={handleColumnChange}
                                        className="form-checkbox"
                                    />
                                    <span className="text-gray-700 capitalize">{col.replace(/([A-Z])/g, " $1")}</span>
                                </label>
                            ))}
                        </div>

                        {/* Modal Actions */}
                        <div className="flex justify-end space-x-4">

                            <button
                                onClick={toggleModal}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div >
    );
}
