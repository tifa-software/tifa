"use client";
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Loader from '@/components/Loader/Loader';
import StaffReport from '@/components/StaffReport/StaffReport';
import StaffReport2 from '@/components/StaffReport2/StaffReport2';
import StaffReport3 from '@/components/StaffReport3/StaffReport3';
export default function StaffReportdata({ staffid }) {
    const [allqueries, setAllqueries] = useState([]);
    const [sentqueries, setSentqueries] = useState([]);
    const [receivedqueries, setReceivedqueries] = useState([]);
    const [loading, setLoading] = useState(true);

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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader />
            </div>
        );
    }


    return (
        <>
            <div className="text-xl inline font-extrabold text-center sticky top-0 py-2 px-4 backdrop-blur-md bg-blue-100/80 rounded-br-full   text-blue-800 ">
                Staff Report
            </div>

            <div className="">


                <div className=' px-4 py-2 mt-5'>
                    <span className=' font-semibold px-2'>Over View</span>

                    <StaffReport data={allqueries} />

                </div>

                <div className=' px-4 py-2 border bg-gray-100 mt-2'>
                    <span className=' font-semibold px-2'>Assigned Sent</span>

                    <StaffReport2 data={sentqueries} />

                </div>

                <div className=' px-4 py-2 border bg-gray-100 mt-2'>
                    <span className=' font-semibold px-2'>Assigned received</span>

                    <StaffReport3 data={receivedqueries} />

                </div>
            </div>



        </>
    )
}
