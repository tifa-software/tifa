import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Queryadd() {
    const [totalQueries, setTotalQueries] = useState(0);
    const [totalEnrolled, setTotalEnrolled] = useState(0);
    const [totalDemo, setTotalDemo] = useState(0);
    const [totalAutoClosedOpen, setTotalAutoClosedOpen] = useState(0);
    const [totalAutoClosedClose, setTotalAutoClosedClose] = useState(0);
    const [groupedData, setGroupedData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get('/api/report/addData');
                const data = response.data.data;

                setTotalQueries(data.totalQueries);
                setTotalEnrolled(data.totalEnrolled);
                setTotalDemo(data.totalDemo);
                setTotalAutoClosedOpen(data.totalAutoClosed.open);
                setTotalAutoClosedClose(data.totalAutoClosed.close);
                setGroupedData(data.groupedData);
                setLoading(false);
            } catch (err) {
                setError('Error fetching data');
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className='flex justify-center items-center h-screen bg-gray-100'>
                <div className='flex flex-col items-center'>
                    <div className='w-12 h-12 border-4 border-t-transparent border-indigo-500 rounded-full animate-spin'></div>
                    <p className='mt-4 text-lg font-semibold text-[#29234b]'>Loading data, please wait...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-100">
                <p className="text-center text-red-600 font-medium">{error}</p>
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-gray-50 py-8 px-6'>
            <div className='grid md:grid-cols-4 gap-6'>
                {/* Summary Cards */}
                <div className='space-y-4 md:col-span-1'>
                    {[{
                        label: "Total Queries",
                        value: totalQueries
                    }, {
                        label: "Total Enrolled",
                        value: totalEnrolled
                    }, {
                        label: "Total Demo",
                        value: totalDemo
                    }, {
                        label: "Total Auto Closed Open",
                        value: totalAutoClosedOpen
                    }, {
                        label: "Total Auto Closed Close",
                        value: totalAutoClosedClose
                    }].map((card, idx) => (
                        <div key={idx} className='bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow'>
                            <h3 className='text-sm font-medium text-gray-500'>{card.label}</h3>
                            <p className='text-2xl font-bold text-[#29234b]'>{card.value}</p>
                        </div>
                    ))}
                </div>

                {/* Grouped Data Section */}
                <div className='md:col-span-3'>
                    <h3 className='text-xl font-semibold text-gray-700 mb-4'>Grouped Data</h3>

                    {groupedData.length > 0 ? (
                        <ul className='space-y-4 h-[100%] overflow-auto'>
                            {groupedData.map((user, index) => (
                                <li key={index} className='bg-white p-6 rounded-lg shadow  transition-shadow'>
                                    <h4 className='text-lg font-semibold text-[#29234b]'>{user.userName} <span className='text-sm text-gray-500'>({user.userBranch})</span></h4>
                                    <p className='mt-2 text-gray-700'>Total Queries: <span className='font-medium'>{user.totalQueries}</span></p>
                                    <table className="mt-4 w-full border-collapse border border-[#29234b]">
                                        <thead>
                                            <tr>
                                                <th className="border border-[#29234b8d] px-4 py-2 text-left text-sm text-gray-600">S/N</th>
                                                <th className="border border-[#29234b8d] px-4 py-2 text-left text-sm text-gray-600">Student Name</th>
                                                <th className="border border-[#29234b8d] px-4 py-2 text-left text-sm text-gray-600">Current Branch</th>
                                                <th className="border border-[#29234b8d] px-4 py-2 text-left text-sm text-gray-600">Mobile Number</th>
                                                <th className="border border-[#29234b8d] px-4 py-2 text-left text-sm text-gray-600">AssignedTo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {user.queries.map((query, idx) => (
                                                <tr key={idx}>
                                                    <td className="border border-[#29234b8d] px-4 py-2 text-sm text-gray-600">{idx + 1}</td>
                                                    <td className="border border-[#29234b8d] px-4 py-2 text-sm text-gray-600">{query.studentName}</td>
                                                    <td className="border border-[#29234b8d] px-4 py-2 text-sm text-gray-600">{query.branch}</td>
                                                    <td className="border border-[#29234b8d] px-4 py-2 text-sm text-gray-600">{query.studentContact.phoneNumber}</td>
                                                    <td className="border border-[#29234b8d] px-4 py-2 text-sm text-gray-600">{query.assignedTo}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className='text-gray-500'>No grouped data available.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
