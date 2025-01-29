"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Loader from "@/components/Loader/Loader";
import { useSession } from 'next-auth/react';
import Link from "next/link";
import { PhoneCall } from "lucide-react";
export default function Lead() {
    const [allquery, setAllquery] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [referenceId, setReferenceId] = useState("");
    const [suboption, setSuboption] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [admission, setAdmission] = useState("");
    const [grade, setGrade] = useState("");
    const [location, setLocation] = useState("");
    const [city, setCity] = useState("");
    const [assignedName, setAssignedName] = useState("");
    const [userName, setUserName] = useState("");
    const [referenceData, setReferenceData] = useState([]);
    const [branches, setBranches] = useState([]);
    const [branch, setBranch] = useState("");

    const [allCourses, setAllCourses] = useState([]);
    const [cours, setCours] = useState("");


    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const courseResponse = await axios.get("/api/course/fetchall/courses");
                setAllCourses(courseResponse.data.fetch || []);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const [user, setuser] = useState([]);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [selectedReference, setSelectedReference] = useState(null);
    const { data: session } = useSession();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const userResponse = await axios.get("/api/admin/fetchall/admin");
                setuser(userResponse.data.fetch);
                const branchesResponse = await axios.get("/api/branch/fetchall/branch");
                setBranches(branchesResponse.data.fetch);
                const referenceResponse = await axios.get("/api/reference/fetchall/reference");
                setReferenceData(referenceResponse.data.fetch);
            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("Error fetching data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const fetchFilteredData = async () => {
        setLoading(true);
        try {
            const response = await axios.get("/api/report/lead/query", {
                params: {
                    referenceId,
                    suboption,
                    fromDate,
                    toDate,
                    admission,
                    grade,
                    location,
                    city,
                    assignedName,
                    userName,
                    branch,
                    cours
                },
            });
            setAllquery(response.data.fetch);
        } catch (error) {
            console.error("Error fetching filtered data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFilteredData();
    }, []);


    const handleFilter = () => {
        setIsFilterModalOpen(false); // Close modal
        fetchFilteredData();
    };




    const getFilterSummary = () => {
        const filters = [];
        if (referenceId) filters.push(`Reference: ${referenceId}`);
        if (suboption) filters.push(`Suboption: ${suboption}`);
        if (fromDate) filters.push(`From Date: ${fromDate}`);
        if (toDate) filters.push(`To Date: ${toDate}`);
        if (admission) filters.push(`Admission: ${admission === "true" ? "Enroll" : "Not Enroll"}`);
        if (grade) filters.push(`Grade: ${grade}`);
        if (location) filters.push(`Branch: ${location}`);
        if (city) filters.push(`City: ${city}`);
        if (assignedName) filters.push(`Assigned Name: ${assignedName}`);
        if (userName) filters.push(`Creater Name: ${userName}`);
        if (branch) filters.push(`Branch Name: ${branch}`);
        if (cours) filters.push(`Courses `);
        return filters.length > 0 ? filters.join(" | ") : "No filters applied.";
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader />
            </div>
        );
    }



    const handleReferenceChange = (e) => {
        const selectedName = e.target.value;
        setReferenceId(selectedName);
        const reference = referenceData.find((data) => data.referencename === selectedName);
        setSelectedReference(reference || null);
    };
    return (
        <div className="p-6 bg-white shadow-xl rounded-xl">
            <div className="text-3xl font-bold text-center text-white bg-blue-600 py-4 rounded-t-xl shadow-md">
                Lead Report
            </div>

            <div className='grid lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-b-xl'>
                <div className="flex flex-col bg-white p-4 rounded-lg shadow-md">
                    <label className="font-semibold mb-2 text-gray-700">Staff</label>
                    <select
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="p-2 border rounded-lg"
                    >
                        <option value="">All</option>
                        {user.map((data) => (
                            <option key={data._id} value={data.name}>
                                {data.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col bg-white p-4 rounded-lg shadow-md">
                    <label className="font-semibold mb-2 text-gray-700">Course</label>
                    <select
                        value={cours}
                        onChange={(e) => setCours(e.target.value)}
                        className="p-2 border rounded-lg"
                    >
                        <option value="">All</option>
                        {allCourses.map((data, index) => (
                            <option key={index} value={data._id}>
                                {data.course_name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col bg-white p-4 rounded-lg shadow-md">
                    <label className="font-semibold mb-2 text-gray-700">Reference</label>
                    <select
                        value={referenceId}
                        onChange={handleReferenceChange}
                        className="p-2 border rounded-lg"
                    >
                        <option value="">All</option>
                        {referenceData.map((data) => (
                            <option key={data._id} value={data.referencename}>
                                {data.referencename}
                            </option>
                        ))}
                    </select>


                    {selectedReference?.referencename === "Online" && selectedReference.suboptions?.length > 0 && (


                        <select
                            value={suboption}
                            onChange={(e) => setSuboption(e.target.value)}
                            className="p-2 border rounded-lg"
                        >
                            <option value="">All</option>
                            {selectedReference.suboptions.map((suboption, index) => (
                                <option key={index} value={suboption.name}>
                                    {suboption.name}
                                </option>
                            ))}
                        </select>

                    )}
                </div>

                <div className="flex flex-col bg-white p-4 rounded-lg shadow-md">
                    <label className="font-semibold mb-2 text-gray-700">Branch</label>
                    <select
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="p-2 border rounded-lg"
                    >
                        <option value="">All</option>
                        {branches.map((data, index) => (
                            <option key={index} value={data.branch_name}>
                                {data.branch_name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col bg-white p-4 rounded-lg shadow-md">
                    <label className="font-semibold mb-2 text-gray-700">City</label>
                    <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="p-2 border rounded-lg"
                    >
                        <option value="">All</option>
                        <option value="Jaipur">Jaipur</option>
                        <option value="out">Out Of Jaipur</option>
                    </select>
                </div>

                <div className="flex flex-col bg-white p-4 rounded-lg shadow-md">
                    <label className="font-semibold mb-2 text-gray-700">Created Date</label>
                    <div className="  bg-white flex justify-between gap-2">

                        <div>

                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className=" text-gray-800  border focus:ring-0 focus:outline-none"
                            />
                        </div>
                        <p className=" text-black text-center">To</p>
                        <div>

                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className=" text-gray-800  border focus:ring-0 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

            </div>

            <button onClick={fetchFilteredData} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded shadow-md hover:bg-blue-600">
                Apply Filters
            </button>

            <div className='grid lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 gap-6 p-6 mt-6 bg-gray-50 rounded-xl'>
                <div className="flex items-center bg-white p-4 rounded-lg shadow-md">
                    <div className='flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full'>
                        <PhoneCall className='w-8 h-8 text-blue-500' />
                    </div>
                    <div className='ml-4'>
                        <p className='text-xl font-bold text-gray-800'>{allquery.length}</p>
                        <p className='text-gray-500'>Total Query</p>
                    </div>
                </div>

                <div className="flex items-center bg-white p-4 rounded-lg shadow-md">
                    <div className='flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full'>
                        <PhoneCall className='w-8 h-8 text-blue-500' />
                    </div>
                    <div className='ml-4'>
                        <p className='text-xl font-bold text-gray-800'>{allquery.filter(item => item.addmission == true).length}
                        </p>
                        <p className='text-gray-500'>Enrolled Queries</p>
                    </div>
                </div>

                <div className="flex items-center bg-white p-4 rounded-lg shadow-md">
                    <div className='flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full'>
                        <PhoneCall className='w-8 h-8 text-blue-500' />
                    </div>
                    <div className='ml-4'>
                        <p className='text-xl font-bold text-gray-800'>{allquery.filter(item => item.addmission == false).length}
                        </p>
                        <p className='text-gray-500'>Pending Queries</p>
                    </div>
                </div>

                <div className="flex items-center bg-white p-4 rounded-lg shadow-md">
                    <div className='flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full'>
                        <PhoneCall className='w-8 h-8 text-blue-500' />
                    </div>
                    <div className='ml-4'>
                        <p className='text-xl font-bold text-gray-800'>{allquery.filter(item => item.demo == true).length}
                        </p>
                        <p className='text-gray-500'>Demo Queries</p>
                    </div>
                </div>
                <div className="flex items-center bg-white p-4 rounded-lg shadow-md">
                    <div className='flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full'>
                        <PhoneCall className='w-8 h-8 text-blue-500' />
                    </div>
                    <div className='ml-4'>
                        <p className='text-xl font-bold text-gray-800'>{allquery.filter(item => item.studentContact.city === "Jaipur").length}
                        </p>
                        <p className='text-gray-500'>Jaipur Queries</p>
                    </div>
                </div>

                <div className="flex items-center bg-white p-4 rounded-lg shadow-md">
                    <div className='flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full'>
                        <PhoneCall className='w-8 h-8 text-blue-500' />
                    </div>
                    <div className='ml-4'>
                        <p className='text-xl font-bold text-gray-800'>{allquery.filter(item => item.studentContact.city !== "Jaipur").length}
                        </p>
                        <p className='text-gray-500'>Out Of Jaipur Queries</p>
                    </div>
                </div>
                
                <div className="flex items-center bg-white p-4 rounded-lg shadow-md">
                    <div className='flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full'>
                        <PhoneCall className='w-8 h-8 text-blue-500' />
                    </div>
                    <div className='ml-4'>
                        <p className='text-xl font-bold text-gray-800'>{allquery.filter(item => item.autoclosed === "close" && item.addmission === false).length
                        }
                        </p>
                        <p className='text-gray-500'>Trash Queries</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
