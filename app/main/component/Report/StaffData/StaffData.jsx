"use client";
import React, { useEffect, useState } from 'react';
import axios from 'axios'

export default function StaffData({ staffid }) {
    const [queries, setQueries] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {

        const fetchQueryData = async () => {
            if (staffid) {
                try {
                    setLoading(true);
                    const response = await axios.get(`/api/report/staffdata/${staffid}`);
                    setQueries(response.data.fetch);
                } catch (error) {
                    console.error('Error fetching query data:', error);
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchQueryData();
    }, [staffid]);
    return (
        <>
            <div className="text-xl inline font-extrabold text-center sticky top-0 py-2 px-4 backdrop-blur-md bg-blue-100/80 rounded-br-full   text-blue-800 ">
                Staff = {staffid}
            </div>
            <div className='container lg:w-[95%] mx-auto py-5 h-screen flex items-center justify-center'>
              <span className=' text-red-600 text-3xl'>  Under Development</span>
            </div>
        </>
    )
}
