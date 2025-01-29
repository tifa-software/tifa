"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Loader from "@/components/Loader/Loader";
import { useSession } from 'next-auth/react';
import { PhoneCall } from "lucide-react";

export default function Lead() {
    const [allquery, setAllquery] = useState([]);
    const [loading, setLoading] = useState(true);
    const [referenceData, setReferenceData] = useState([]);
    const [branches, setBranches] = useState([]);
    const [allCourses, setAllCourses] = useState([]);
    const [user, setUser] = useState([]);
    const { data: session } = useSession();

    // Filter states
    const [filters, setFilters] = useState({
        referenceId: "",
        suboption: "",
        fromDate: "",
        toDate: "",
        admission: "",
        grade: "",
        location: "",
        city: "",
        assignedName: "",
        userName: "",
        branch: "",
        cours: ""
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [courseRes, userRes, branchRes, refRes] = await Promise.all([
                    axios.get("/api/course/fetchall/courses"),
                    axios.get("/api/admin/fetchall/admin"),
                    axios.get("/api/branch/fetchall/branch"),
                    axios.get("/api/reference/fetchall/reference")
                ]);
                setAllCourses(courseRes.data.fetch || []);
                setUser(userRes.data.fetch);
                setBranches(branchRes.data.fetch);
                setReferenceData(refRes.data.fetch);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const fetchFilteredData = async () => {
        setLoading(true);
        try {
            const response = await axios.get("/api/report/lead/query", { params: filters });
            setAllquery(response.data.fetch);
        } catch (error) {
            console.error("Error fetching filtered data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFilteredData();
    }, [filters]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader />
            </div>
        );
    }

    return (
        <div className="p-6 bg-white shadow-xl rounded-xl">
            <div className="text-3xl font-bold text-center text-white bg-blue-600 py-4 rounded-t-xl shadow-md">
                Lead Report
            </div>

            <div className='grid lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-b-xl'>
                <div className="flex flex-col bg-white p-4 rounded-lg shadow-md">
                    <label className="font-semibold mb-2 text-gray-700">Staff</label>
                    <select name="userName" value={filters.userName} onChange={handleFilterChange} className="p-2 border rounded-lg">
                        <option value="">All</option>
                        {user.map((data) => (
                            <option key={data._id} value={data.name}>{data.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-col bg-white p-4 rounded-lg shadow-md">
                    <label className="font-semibold mb-2 text-gray-700">Branch</label>
                    <select name="branch" value={filters.branch} onChange={handleFilterChange} className="p-2 border rounded-lg">
                        <option value="">All</option>
                        {branches.map(branch => (
                            <option key={branch._id} value={branch.branch_name}>{branch.branch_name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-col bg-white p-4 rounded-lg shadow-md">
                    <label className="font-semibold mb-2 text-gray-700">Reference</label>
                    <select name="referenceId" value={filters.referenceId} onChange={handleFilterChange} className="p-2 border rounded-lg">
                        <option value="">All</option>
                        {referenceData.map((data) => (
                            <option key={data._id} value={data.referencename}>{data.referencename}</option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-col bg-white p-4 rounded-lg shadow-md">
                    <label className="font-semibold mb-2 text-gray-700">Created Date</label>
                    <input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} className="p-2 border rounded-lg" />
                </div>
            </div>

            <button onClick={fetchFilteredData} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded shadow-md hover:bg-blue-600">
                Apply Filters
            </button>

            <div className='grid lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 gap-6 p-6 mt-6 bg-gray-50 rounded-xl'>
                {[{ count: allquery.length, label: "Total Query" }, { count: 1234, label: "Follow-ups" }, { count: 789, label: "Converted" }, { count: 456, label: "Pending" }].map((item, index) => (
                    <div key={index} className="flex items-center bg-white p-4 rounded-lg shadow-md">
                        <div className='flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full'>
                            <PhoneCall className='w-8 h-8 text-blue-500' />
                        </div>
                        <div className='ml-4'>
                            <p className='text-xl font-bold text-gray-800'>{item.count}</p>
                            <p className='text-gray-500'>{item.label}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
