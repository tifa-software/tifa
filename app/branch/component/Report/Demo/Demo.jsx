"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Loader from "@/components/Loader/Loader";
import { useSession } from 'next-auth/react';
import Link from "next/link";
import { ChevronDownSquare } from "lucide-react";
export default function QueryReport() {
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
    const [referenceData, setReferenceData] = useState([]);
    const [branches, setBranches] = useState([]);
    const [user, setuser] = useState([]);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [selectedReference, setSelectedReference] = useState(null);
    const { data: session } = useSession();
    const [branch, setBranch] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const userResponse = await axios.get("/api/admin/fetchall/admin");
                const filteredData = userResponse.data.fetch.filter((item) => item.branch === branch);
                setuser(filteredData);
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
    }, [branch]);

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


    const fetchFilteredData = async () => {
        setLoading(true);
        try {
            const response = await axios.get("/api/branchreport/fetchall/query", {
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
                },
            });

            // Ensure `branch` is available before filtering
            if (branch) {
                const filteredData = response.data.fetch.filter((item) => item.branch === branch && item.demo === true);
                setAllquery(filteredData);
            } else {
                console.warn("Branch is not defined, skipping data filtering.");
                setAllquery([]);
            }
        } catch (error) {
            console.error("Error fetching filtered data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Fetch data only when `branch` is defined
        if (branch) {
            fetchFilteredData();
        }
    }, [branch]);


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
        <>
            <div className="mt-12 container lg:w-[98%] mx-auto">
                <div className="flex justify-between gap-5 items-center">

                    <div className="py-3 px-4 flex-auto mb-4 bg-blue-100 text-blue-800 rounded-lg shadow-md flex justify-between items-center">
                        <span className="text-sm font-medium">{getFilterSummary()}</span>

                    </div>
                    <div>

                        <button
                            onClick={handleFilter}
                            className="mb-4 bg-blue-500 text-white px-4 py-2 rounded shadow-md hover:bg-blue-600 transition duration-200"
                        >
                            Apply Filters
                        </button>

                    </div>
                </div>

                <div className="overflow-x-auto  shadow-lg rounded-lg border border-gray-300">
                    <table className="min-w-full text-left text-[12px] font-light border-collapse">
                        <thead className="bg-gray-800 text-white">
                            <tr className="divide-x divide-gray-700">
                                <th className="px-4 py-3 text-[12px]">Sr No.</th>
                                <th className="px-4 py-3 text-[12px]">Student Name</th>
                                <th className="px-4 py-3 text-[12px]">Phone Number</th>
                                <th className="px-4 py-3 text-[12px]">No Of Contact</th>
                                <th className="px-4 py-3 text-[12px] flex items-center justify-center">Reference
                                    <select
                                        value={referenceId}
                                        onChange={handleReferenceChange}
                                        className=" w-5 ms-2  text-gray-800  border focus:ring-0 focus:outline-none"
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
                                            className=" w-5 ms-2  text-gray-800  border focus:ring-0 focus:outline-none"
                                        >
                                            <option value="">All</option>
                                            {selectedReference.suboptions.map((suboption, index) => (
                                                <option key={index} value={suboption.name}>
                                                    {suboption.name}
                                                </option>
                                            ))}
                                        </select>

                                    )}
                                </th>
                                <th className="px-4 py-3 text-[12px]">Message</th>
                                <th className="px-4 py-3 text-[12px]">City
                                    <select
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        className=" w-5 ms-2  text-gray-800  border focus:ring-0 focus:outline-none"
                                    >
                                        <option value="">All</option>
                                        <option value="Jaipur">Jaipur</option>
                                        <option value="out">Out Of Jaipur</option>
                                    </select>
                                </th>


                                <th className="px-4 py-3 text-[12px] relative group flex">Created Date <ChevronDownSquare className=" ms-2" />
                                    <div className=" absolute bg-white p-2 hidden group-hover:block">

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
                                </th>
                                <th className="px-4 py-3 text-[12px]">Demo</th>
                                <th className="px-4 py-3 text-[12px]">Status</th>
                                <th className="px-4 py-3 text-[12px] flex">Enroll
                                    <select
                                        value={admission}
                                        onChange={(e) => setAdmission(e.target.value)}
                                        className="w-5 ms-2  text-gray-800  border focus:ring-0 focus:outline-none"
                                    >
                                        <option value="">All</option>
                                        <option value="true">Enroll</option>
                                        <option value="false">Not Enroll</option>
                                    </select>
                                </th>

                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {allquery.map((data, index) => (
                                <tr
                                    key={index}
                                    className="odd:bg-gray-50 even:bg-gray-100 hover:bg-gray-200 transition-all"
                                >
                                    <td className="px-4 py-3 text-[12px]">{index + 1}</td>
                                    <Link href={`/branch/page/allquery/${data._id}`}><td className="px-4 py-3 text-[12px]">{data.studentName}</td></Link>
                                    <td className="px-4 py-3 text-[12px]"><Link href={`/branch/page/allquery/${data._id}`}>{data.studentContact.phoneNumber}</Link></td>
                                    <td className="px-4 py-3 text-[12px]"> {data.historyCount}</td>
                                    <td className="px-4 py-3 text-[12px]">{data.referenceid} {data.suboption}</td>
                                    <td className="px-4 py-3 text-[12px] relative">
                                        <span className="overflow-hidden whitespace-nowrap text-ellipsis">{data.lastmessage?.slice(0, 12)}...</span>
                                        <div className="absolute cursor-pointer left-0 bottom-0 bg-gray-800 text-white p-2 rounded-md opacity-0 transition-opacity hover:opacity-100 max-w-xs w-48">
                                            {data.lastmessage}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-[12px]">{data.studentContact.city}</td>
                                    <td className="px-4 py-3 text-[12px]">
                                        {(() => {
                                            const date = new Date(data.createdAt);
                                            const monthNames = [
                                                'January', 'February', 'March', 'April', 'May', 'June',
                                                'July', 'August', 'September', 'October', 'November', 'December'
                                            ];
                                            const day = date.getDate().toString().padStart(2, '0');
                                            const month = monthNames[date.getMonth()];
                                            const year = date.getFullYear();
                                            return ` ${day} ${month}, ${year}`;
                                        })()}
                                    </td>
                                    <td className="px-4 py-3 text-[12px]">{data.demo ? "YES" : "NO"}</td>

                                    <td className="px-4 py-3 text-[12px]">{data.stage === 1
                                        ? "1st Stage"
                                        : data.stage === 2
                                            ? "2nd Stage"
                                            : data.stage === 3
                                                ? "3rd Stage"
                                                : data.stage === 4
                                                    ? "4th Stage"
                                                    : data.stage === 5
                                                        ? "5th Stage"
                                                        : data.stage === 6
                                                            ? "6th Stage"
                                                            : "Initial Stage"}
                                    </td>
                                    <td className="px-4 py-3 text-[12px]">{data.addmission ? "Enrolled" : "Not Enrolled"}</td>

                                </tr>


                            ))}
                        </tbody>
                    </table>
                </div >
            </div>


        </>
    );
}
