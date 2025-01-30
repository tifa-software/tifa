"use client";
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Loader from '@/components/Loader/Loader';
import StaffReport from '@/components/StaffReport/StaffReport';
import StaffReport2 from '@/components/StaffReport2/StaffReport2';
import StaffReport3 from '@/components/StaffReport3/StaffReport3';

export default function StaffReportdata({ staffid ,staffName}) {
    const [allqueries, setAllqueries] = useState([]);
    const [sentqueries, setSentqueries] = useState([]);
    const [receivedqueries, setReceivedqueries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const fetchQueryData = async () => {
            if (staffid) {
                try {
                    setLoading(true);
                    const response = await axios.get(`/api/report/staffquery/${staffid}`);
                    setAllqueries(response.data.fetch);
                    const response1 = await axios.get(`/api/report/staffsenquery/${staffid}`);
                    setSentqueries(response1.data.fetch);
                    const response2 = await axios.get(`/api/report/staffreceivedquery/${staffid}`);
                    setReceivedqueries(response2.data.fetch);
                } catch (error) {
                    console.error('Error fetching query data:', error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchQueryData();
    }, [staffid]);

    const filterByDate = (data) => {
        if (!startDate || !endDate) return data;
        return data.filter(item => {
            const createdAt = new Date(item.createdAt);
            return createdAt >= new Date(startDate) && createdAt <= new Date(endDate);
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader />
            </div>
        );
    }

    return (
        <>
            <div className="text-3xl font-bold text-center text-white bg-blue-600 py-4 rounded-t-xl shadow-md">
                Staff Report of {staffName}
            </div>

            <div className="px-6 py-4 flex gap-4 justify-center items-center bg-gray-50 shadow-md rounded-lg mt-4">
                <label className="font-semibold">Start Date:</label>
                <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    className="border p-2 rounded-lg shadow-sm focus:ring focus:ring-blue-300" 
                />
                <label className="font-semibold">End Date:</label>
                <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                    className="border p-2 rounded-lg shadow-sm focus:ring focus:ring-blue-300" 
                />
            </div>

            <div className="px-6 py-4 mt-6 bg-white shadow-md rounded-lg">
                <h2 className="text-lg font-semibold mb-2 text-blue-600">Created Query</h2>
                <StaffReport data={filterByDate(allqueries)} />
            </div>

            <div className="px-6 py-4 mt-4 bg-gray-100 shadow-md rounded-lg">
                <h2 className="text-lg font-semibold mb-2 text-green-600">Assigned Sent</h2>
                <StaffReport2 data={filterByDate(sentqueries)} />
            </div>

            <div className="px-6 py-4 mt-4 bg-gray-100 shadow-md rounded-lg">
                <h2 className="text-lg font-semibold mb-2 text-red-600">Assigned Received</h2>
                <StaffReport3 data={filterByDate(receivedqueries)} />
            </div>
        </>
    );
}
