"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { PhoneCall, CheckCircle, Navigation, XCircle, Loader } from "lucide-react";

export default function StaffDatanew({ staffid }) {
    const [userData, setUserData] = useState(null);
    const [adminData, setAdminData] = useState(null);
    const [queries, setQueries] = useState([]);
    const [data, setData] = useState([]);
    const [data1, setData1] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedQueries, setSelectedQueries] = useState([]);
    const [loading, setLoading] = useState(true);
    const today = new Date().toISOString().split("T")[0];


    const [user, setUser] = useState([]);
    const [activeDay, setActiveDay] = useState(null);
    const [selectedYear, setSelectedYear] = useState("");
    const [selectedMonth, setSelectedMonth] = useState("");
    const [filteredDates, setFilteredDates] = useState([]);
    const [monthlyActivity, setMonthlyActivity] = useState(null);


    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const response = await axios.get(`/api/admin/find-admin-byemail/${staffid}`);
                setUserData(response.data);
                setAdminData(response.data._id);
            } catch (err) {
                console.error(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (staffid) fetchAdminData();
    }, [staffid]);

    useEffect(() => {
        const fetchQueryData = async () => {
            if (adminData) {
                try {
                    setLoading(true);
                    const response = await axios.get(`/api/report/dailyreport/${adminData}`);
                    setData(response.data.data.userActivityReport);
                    setData1(response.data.data.userActivityReport.todayConnectionStatus);
                } catch (error) {
                    console.error("Error fetching query data:", error);
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchQueryData();
    }, [adminData]);

    useEffect(() => {
        const fetchQueries = async () => {
            if (adminData) {
                try {
                    setLoading(true);
                    const response = await axios.get(`/api/queries/fetchall-byuser/${adminData}?autoclosed=open`);
                    const today = new Date();
                    const tomorrow = new Date(today);
                    tomorrow.setDate(today.getDate() + 1);

                    const filteredQueries = response.data.fetch.filter(query => {
                        const deadline = new Date(query.deadline);
                        return deadline <= tomorrow;
                    });

                    setQueries(filteredQueries);
                } catch (error) {
                    console.error("Error fetching query data:", error);
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchQueries();
    }, [adminData]);

    const handleButtonClick = () => {
        const queries = data.dailyActivity?.[today]?.queries || [];
        setSelectedQueries(queries);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await axios.get("/api/admin/fetchall/admin");
                setUser(response.data.fetch);
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        };

        fetchUserData();
    }, []);

    useEffect(() => {
        if (selectedYear && selectedMonth && data.dailyActivity) {
            const filtered = Object.entries(data.dailyActivity).filter(([day]) => {
                const date = new Date(day);
                return (
                    date.getFullYear().toString() === selectedYear &&
                    (date.getMonth() + 1).toString() === selectedMonth
                );
            });
            setFilteredDates(filtered);

            // Extract monthly activity
            const monthKey = `${selectedYear}-${selectedMonth.padStart(2, "0")}`;
            if (data.monthlyActivity && data.monthlyActivity[monthKey]) {
                setMonthlyActivity(data.monthlyActivity[monthKey]);
            } else {
                setMonthlyActivity(null);
            }
        } else {
            setFilteredDates([]);
            setMonthlyActivity(null);
        }
    }, [selectedYear, selectedMonth, data.dailyActivity, data.monthlyActivity]);

    const getUserName = (id) => {
        const matchedUser = user.find((u) => u._id === id);
        return matchedUser ? matchedUser.name : "Unknown User";
    };

    const years = Array.from(
        new Set(Object.keys(data.dailyActivity || {}).map((day) => new Date(day).getFullYear()))
    );
    const months = selectedYear
        ? Array.from(
            new Set(
                Object.keys(data.dailyActivity || {})
                    .filter((day) => new Date(day).getFullYear().toString() === selectedYear)
                    .map((day) => new Date(day).getMonth() + 1)
            )
        )
        : [];

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-100">
                <Loader className="animate-spin w-16 h-16 text-blue-500" />
            </div>
        );
    }

    return (
        <>
            <div className=" mx-auto my-6">
                <div className="text-xl font-bold text-center text-white bg-gradient-to-r from-blue-600 to-blue-400 py-4 rounded-lg shadow-lg">
                    Staff Report of{" "}
                    <span className="text-yellow-300">{userData?.name}</span> from{" "}
                    <span className="text-yellow-300">{userData?.branch}</span>
                </div>

                {/* Filter Section */}
                <div className="flex gap-4 justify-center items-center mt-6 bg-gray-50 shadow-md p-4 rounded-lg">
                    <label className="font-semibold">Select Year:</label>
                    <select
                        value={selectedYear}
                        onChange={(e) => {
                            setSelectedYear(e.target.value);
                            setSelectedMonth(""); // Reset month when year changes
                        }}
                        className="bg-gray-100 border border-gray-300 p-2 rounded-lg shadow-sm focus:ring focus:ring-blue-300"
                    >
                        <option value="">Select Year</option>
                        {years.map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>

                    <label className="font-semibold">Select Month:</label>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        disabled={!selectedYear}
                        className="bg-gray-100 border border-gray-300 p-2 rounded-lg shadow-sm focus:ring focus:ring-blue-300"
                    >
                        <option value="">Select Month</option>
                        {months.map((month) => (
                            <option key={month} value={month}>
                                {new Date(0, month - 1).toLocaleString("en", { month: "long" })}
                            </option>
                        ))}
                    </select>

                </div>


                {/* Data Section */}
                <div className="mt-6">
                    <h1 className="text-xl px-4 font-semibold">Today’s Data</h1>
                    <div className="grid grid-cols-4 gap-6 p-6 bg-gray-50 rounded-lg shadow-lg">
                        {/* Today Query */}
                        <div className="flex items-center bg-white p-4 rounded-lg shadow-md">
                            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full">
                                <Navigation className="w-8 h-8 text-blue-500" />
                            </div>
                            <div className="ml-4">
                                <p className="text-xl font-bold text-gray-800">{queries.length}</p>
                                <p className="text-gray-500">Today Queries</p>
                            </div>
                        </div>

                        {/* Total Action */}
                        <div className="flex items-center bg-white p-4 rounded-lg shadow-md justify-between">
                            <div className="flex items-center">
                                <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full">
                                    <CheckCircle className="w-8 h-8 text-green-500" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-xl font-bold text-gray-800">{data.dailyActivity?.[today]?.count?.[0] || 0}</p>
                                    <p className="text-gray-500">Total Actions Today</p>
                                </div>
                            </div>
                            <button
                                className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition"
                                onClick={handleButtonClick}
                            >
                                View
                            </button>
                        </div>

                        {/* Connected */}
                        <div className="flex items-center bg-white p-4 rounded-lg shadow-md">
                            <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                                <PhoneCall className="w-8 h-8 text-green-500" />
                            </div>
                            <div className="ml-4">
                                <p className="text-xl font-bold text-gray-800">{data1.connected}</p>
                                <p className="text-gray-500">Connected</p>
                            </div>
                        </div>

                        {/* Not Connected */}
                        <div className="flex items-center bg-white p-4 rounded-lg shadow-md">
                            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
                                <XCircle className="w-8 h-8 text-red-500" />
                            </div>
                            <div className="ml-4">
                                <p className="text-xl font-bold text-gray-800">{data1.no_connected}</p>
                                <p className="text-gray-500">Not Connected</p>
                            </div>
                        </div>

                        <div className="flex items-center bg-white p-4 rounded-lg shadow-md">
                            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
                                <PhoneCall className="w-8 h-8 text-red-500" />
                            </div>
                            <div className="ml-4">
                                <p className="text-xl font-bold text-gray-800">{data1.not_lifting}</p>
                                <p className="text-gray-500">Not Lifting</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50'>
                        <div className='bg-white p-6 rounded-lg shadow-lg w-2/3'>

                            <div className='flex justify-between items-center mb-4'>
                                <h2 className='text-xl font-bold'>Queries</h2>
                                <button className='text-red-500' onClick={closeModal}><XCircle /></button>
                            </div>
                            <div className=' overflow-scroll max-h-96'>
                                {selectedQueries.length > 0 ? (
                                    <table className='min-w-full bg-white border border-gray-200'>
                                        <thead>
                                            <tr className='bg-gray-100'>

                                                <th className='border px-4 py-2 text-left'>N/O</th>
                                                <th className='border px-4 py-2 text-left'>Student Name</th>
                                                <th className='border px-4 py-2 text-left'>Contect Number</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedQueries.map((query, index) => (
                                                <tr key={query.id} className='border'>
                                                    <td className='border px-4 py-2'>{index + 1}</td>
                                                    <td className='border px-4 py-2'>{query.studentName}</td>
                                                    <td className='border px-4 py-2'>{query.studentContact.phoneNumber}</td>
                                                </tr>
                                            ))}

                                        </tbody>
                                    </table>
                                ) : (
                                    <p>No queries available.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>


            <div className="container lg:w-[95%] mx-auto py-5">
                {/* Dropdowns for year and month */}

                <div className="mt-4 space-y-4">
                    {/* Display Monthly Activity */}
                    {monthlyActivity && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-4">
                            <h3 className="text-lg font-semibold mb-2 text-blue-800">Monthly Activity</h3>
                            <p className="text-gray-700">
                                Total Actions: <span className="font-bold">{monthlyActivity[0]}</span>
                            </p>
                            <p className="text-gray-700">
                                Total Other Metrics: <span className="font-bold">{monthlyActivity[1]}</span>
                            </p>
                        </div>
                    )}

                    {/* Display Daily Activity */}
                    {filteredDates.length === 0 ? (
                        <div></div>
                    ) : (
                        filteredDates
                            .sort(([dayA], [dayB]) => new Date(dayB) - new Date(dayA))
                            .map(([day, activity]) => (
                                <div key={day}>
                                    <button
                                        onClick={() => setActiveDay(activeDay === day ? null : day)}
                                        className="bg-[#29234b] hover:bg-[#29234b]/80 text-white font-semibold py-2 px-4 rounded w-full text-left"
                                    >
                                        Date: {day} {activeDay === day ? "▼" : "▶"}
                                    </button>

                                    {activeDay === day && (
                                        <div className="mt-2">
                                            <p className="font-medium text-sm border px-2 bg-gray-50">
                                                Actions Taken: {activity.count[0]}
                                            </p>
                                            <table className="w-full text-sm text-left rtl:text-right text-gray-600 font-sans mt-2">
                                                <thead className="bg-[#29234b] text-white uppercase">
                                                    <tr>
                                                        <th scope="col" className="px-4 font-medium capitalize py-2">
                                                            Student Name
                                                        </th>
                                                        <th scope="col" className="px-4 font-medium capitalize py-2">
                                                            Phone Number
                                                        </th>
                                                        <th scope="col" className="px-4 font-medium capitalize py-2">
                                                            Reference
                                                        </th>
                                                        <th scope="col" className="px-4 font-medium capitalize py-2">
                                                            City
                                                        </th>
                                                        <th scope="col" className="px-4 font-medium capitalize py-2">
                                                            Address
                                                        </th>
                                                        <th scope="col" className="px-4 font-medium capitalize py-2">
                                                            Assigned from
                                                        </th>
                                                        <th scope="col" className="px-4 font-medium capitalize py-2">
                                                            Assigned To
                                                        </th>
                                                        <th scope="col" className="px-4 font-medium capitalize py-2">
                                                            Created Date
                                                        </th>
                                                        <th scope="col" className="px-4 font-medium capitalize py-2">
                                                            Status
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {activity.queries.map((query, index) => (
                                                        <tr key={index}>
                                                            <td className="px-4 py-2 text-[12px] font-semibold">
                                                                {query.studentName}
                                                            </td>
                                                            <td className="px-4 py-2 text-[12px] font-semibold">
                                                                {query.studentContact.phoneNumber}
                                                            </td>
                                                            <td className="px-4 py-2 text-[12px] font-semibold">
                                                                {query.referenceid !== "null" &&
                                                                    query.referenceid !== null
                                                                    ? query.referenceid
                                                                    : "Not Provided"}
                                                                {query.suboption !== "null" && <>{query.suboption}</>}
                                                            </td>
                                                            <td className="px-4 py-2 text-[12px] font-semibold">
                                                                {query.studentContact.city}
                                                            </td>
                                                            <td className="px-4 py-2 text-[12px] font-semibold">
                                                                {query.studentContact.address}
                                                            </td>
                                                            <td className="px-4 py-2 text-[12px] font-semibold">
                                                                {query.assignedsenthistory &&
                                                                    query.assignedsenthistory.length > 0
                                                                    ? query.assignedsenthistory
                                                                        .map((id) => getUserName(id))
                                                                        .join(", ")
                                                                    : "Not Assigned"}
                                                            </td>
                                                            <td className="px-4 py-2 text-[12px] font-semibold">
                                                                {query.assignedreceivedhistory &&
                                                                    query.assignedreceivedhistory.length > 0
                                                                    ? query.assignedreceivedhistory
                                                                        .map((id) => getUserName(id))
                                                                        .join(", ")
                                                                    : "Not Assigned"}
                                                            </td>
                                                            <td className="px-4 py-2 text-[12px] font-semibold">
                                                                {new Date(query.createdAt).toLocaleDateString("en-GB", {
                                                                    day: "2-digit",
                                                                    month: "2-digit",
                                                                    year: "numeric",
                                                                })}
                                                            </td>
                                                            <td className="px-4 py-2 text-[12px] font-semibold">
                                                                <td className="px-4 py-2 text-[12px] font-semibold">
                                                                    {query.addmission ? "Enroll" : "Not Enroll"}
                                                                </td>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            ))
                    )}
                </div>
            </div>
        </>
    );
}
