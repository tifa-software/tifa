"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { PhoneCall, CheckCircle, CircleDashed, Navigation, XCircle, Locate, LocateOff, Trash } from "lucide-react";

export default function StaffDatanew({ staffid }) {
    const [userData, setUserData] = useState(null);
    const [error, setError] = useState("");
    const [adminData, setAdminData] = useState(null);
    const [queries, setQueries] = useState([]);
    const [data, setData] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedQueries, setSelectedQueries] = useState([]);
    const [loading, setLoading] = useState(true);
    const today = new Date().toISOString().split('T')[0];
    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const response = await axios.get(
                    `/api/admin/find-admin-byemail/${staffid}`
                );
                setUserData(response.data);
                setAdminData(response.data._id);
            } catch (err) {
                setError(err.message);
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
                    const response = await axios.get(`/api/report/staffdata/${adminData}`);
                    setData(response.data.data.userActivityReport);
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
        // Fetch queries data once the adminData is available
        const fetchQueryData = async () => {
            if (adminData) {
                try {
                    setLoading(true);
                    const autoclosedStatus = 'open'; // or 'close', based on your logic
                    const response = await axios.get(`/api/queries/fetchall-byuser/${adminData}?autoclosed=${autoclosedStatus}`);
                    const today = new Date();
                    const tomorrow = new Date(today);
                    tomorrow.setDate(today.getDate() + 1);

                    // Filter for queries with deadlines today, tomorrow, or in the past
                    const filteredQueries = response.data.fetch.filter(query => {
                        const deadline = new Date(query.deadline);
                        return (
                            deadline <= tomorrow
                        );
                    });

                    setQueries(filteredQueries);
                } catch (error) {
                    console.error('Error fetching query data:', error);
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchQueryData();
    }, [adminData]);

    const handleButtonClick = () => {
        const queries = data.dailyActivity?.[today]?.queries || [];
        setSelectedQueries(queries);
        setIsModalOpen(true);
    };

    // Handle modal close
    const closeModal = () => {
        setIsModalOpen(false);
    };


    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-100">
                <div className="text-3xl text-blue-500">Loading...</div>
            </div>
        );
    }


    return (
        <>
            <div className="text-xl font-bold text-center text-white bg-blue-600 py-4 rounded-t-xl shadow-md">
                Staff Report of <span className=" text-yellow-400">{userData.name}</span> from <span className=" text-yellow-400">{userData.branch}</span>
            </div>

            <div className=' flex gap-5 justify-around'>


                <div className="px-6 py-4 flex gap-4 justify-center items-center bg-gray-50 shadow-md rounded-lg mt-4">
                    <label className="font-semibold">Start Date:</label>
                    <input
                        type="date"

                        className="border p-2 rounded-lg shadow-sm focus:ring focus:ring-blue-300"
                    />
                    <label className="font-semibold">End Date:</label>
                    <input
                        type="date"

                        className="border p-2 rounded-lg shadow-sm focus:ring focus:ring-blue-300"
                    />
                </div>

                {/* Reset Filter Button */}
                <div className="flex items-center justify-center mt-4">
                    <button

                        className="px-4 py-2 bg-red-600 text-white rounded-lg shadow-md"
                    >
                        Reset Filters
                    </button>
                </div>
            </div>

            <div>
                <div className=' grid grid-cols-4 gap-6 p-6  bg-gray-50 rounded-xl'>


                    <div className="flex items-center bg-white p-4 rounded-lg shadow-md">
                        <div className='flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full'>
                            <Navigation className='w-8 h-8 text-blue-500' />
                        </div>
                        <div className='ml-4'>
                            <p className='text-xl font-bold text-gray-800'>{queries.length}
                            </p>
                            <p className='text-gray-500'>Today Query</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-md">
                        <div className=" flex items-center">
                            <div className='flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full'>
                                <Navigation className='w-8 h-8 text-blue-500' />
                            </div>
                            <div className='ml-4'>
                                <div>
                                    <p className='text-xl font-bold text-gray-800'>{data.dailyActivity?.[new Date().toISOString().split('T')[0]]?.count?.[0] || 0}
                                    </p>
                                    <p className='text-gray-500'>
                                        Total Action Today
                                    </p>
                                </div>
                            </div></div>
                        <button
                            className=' text-sm bg-blue-400 rounded hover:bg-blue-500 text-white px-2'
                            onClick={handleButtonClick}
                        >
                            View
                        </button>
                    </div>
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

                    <div className="flex items-center bg-white p-4 rounded-lg shadow-md">
                        <div className='flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full'>
                            <Navigation className='w-8 h-8 text-blue-500' />
                        </div>
                        <div className='ml-4'>
                            <p className='text-xl font-bold text-gray-800'>123
                            </p>
                            <p className='text-gray-500'>Connected</p>
                        </div>
                    </div>




                </div>
            </div>
        </>
    )
}
