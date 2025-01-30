"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Loader from "@/components/Loader/Loader";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

export default function Visit() {
    const [queries, setQueries] = useState([]);
    const [filteredQueries, setFilteredQueries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        branch: "",
        studentName: "",
        contact: "",
        course: "",
        assignedTo: "",
        city: "",
    });
    const [courses, setCourses] = useState({});
    const [coursesfee, setCoursesfee] = useState({});
    const [user, setUser] = useState({});
    const router = useRouter();

    useEffect(() => {
        const fetchQueryData = async () => {
            try {
                setLoading(true);
                const response = await axios.get("/api/report/enroll/5");
                setQueries(response.data.fetch);
                setFilteredQueries(response.data.fetch);
            } catch (error) {
                console.error("Error fetching query data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchQueryData();
    }, []);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const response = await axios.get(`/api/course/fetchall/courses`);
                const courseMapping = response.data.fetch.reduce((acc, course) => {
                    acc[course._id] = course.course_name;
                    return acc;
                }, {});
                setCourses(courseMapping);

                const coursesfeeMapping = response.data.fetch.reduce((acc, coursesfee) => {
                    const enrollPercent = parseFloat(coursesfee.enrollpercent) || 0;
                    const enrollmentFee = coursesfee.fees * (enrollPercent / 100);

                    acc[coursesfee._id] = {
                        totalFee: coursesfee.fees,
                        enrollPercent: enrollPercent,
                        enrollmentFee: enrollmentFee.toFixed(),
                    };
                    return acc;
                }, {});

                setCoursesfee(coursesfeeMapping);
            } catch (error) {
                console.error("Error fetching courses:", error.message);
            }
        };

        fetchCourses();
    }, []);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await axios.get('/api/admin/fetchall/admin');
                const userMapping = response.data.fetch.reduce((acc, user) => {
                    acc[user._id] = user.name;
                    return acc;
                }, {});
                setUser(userMapping);
            } catch (error) {
                console.error("Error fetching user:", error.message);
            }
        };

        fetchUserData();
    }, []);

    useEffect(() => {
        const filtered = queries.filter((query) => {
            const courseFeeDetails = coursesfee[query.courseInterest] || {};
            const remainingFees = courseFeeDetails.totalFee - query.total;

            return (
                (!filters.branch || query.branch.toLowerCase().includes(filters.branch.toLowerCase())) &&
                (filters.staffName
                    ? query.staffName.toLowerCase().includes(filters.staffName.toLowerCase())
                    : true) &&
                (!filters.studentName || query.studentName?.toLowerCase().includes(filters.studentName.toLowerCase())) &&
                (!filters.contact || query.studentContact.phoneNumber.includes(filters.contact)) &&
                (!filters.course || (courses[query.courseInterest] || "").toLowerCase().includes(filters.course.toLowerCase())) &&
                (!filters.assignedTo || (user[query.assignedTo] || user[query.userid] || "").toLowerCase().includes(filters.assignedTo.toLowerCase())) &&
                (!filters.city || query.studentContact.city.toLowerCase().includes(filters.city.toLowerCase())) &&
                (!filters.fees || remainingFees.toString().includes(filters.fees))
            );
        });
        setFilteredQueries(filtered);
    }, [filters, queries, courses, user, coursesfee]);


    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const handleRowClick = (id) => {
        router.push(`/main/page/allquery/${id}`);
    };

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredQueries);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Queries");
        XLSX.writeFile(workbook, "queries.xlsx");
    };

    return (
        <>
            <div className="text-3xl font-bold text-center text-white bg-blue-600 py-4 rounded-t-xl shadow-md">
                Admission Report
            </div>
            <div className="container mx-auto p-5">
                <div className="flex flex-col lg:flex-row justify-between space-y-6 lg:space-y-0 lg:space-x-6">
                    <div className="w-full">
                        <h1 className="text-lg font-semibold mb-4">Total Queries: {filteredQueries.length}</h1>
                        <div className="shadow-lg rounded-lg bg-white mb-6">
                            <button
                                onClick={exportToExcel}
                                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                            >
                                Export to Excel
                            </button>
                            <div className="p-4">
                                <div className="relative overflow-y-auto">
                                    <table className="min-w-full text-xs text-left text-gray-600 font-sans">
                                        <thead className="bg-[#29234b] text-white uppercase">
                                            <tr>
                                                <th className="px-6 py-4">S/N</th>

                                                <th className="px-6 py-4">

                                                    <input
                                                        type="text"
                                                        className="w-full mt-1 text-black px-2 py-1 rounded"
                                                        placeholder="Staff Name"
                                                        onChange={(e) =>
                                                            handleFilterChange("staffName", e.target.value)
                                                        }
                                                    />
                                                </th>
                                                <th className="px-6 py-4">

                                                    <input
                                                        type="text"
                                                        placeholder=" Student Name"
                                                        className="mt-1 w-full text-black text-sm border rounded px-2 py-1"
                                                        onChange={(e) => handleFilterChange("studentName", e.target.value)}
                                                    />
                                                </th>
                                                <th className="px-6 py-4">

                                                    <input
                                                        type="text"
                                                        placeholder="Contact No"
                                                        className="mt-1 w-full text-black text-sm border rounded px-2 py-1"
                                                        onChange={(e) => handleFilterChange("contact", e.target.value)}
                                                    />
                                                </th>
                                                <th className="px-6 py-4">

                                                    <input
                                                        type="text"
                                                        placeholder=" Interested Course"
                                                        className="mt-1 w-full text-black text-sm border rounded px-2 py-1"
                                                        onChange={(e) => handleFilterChange("course", e.target.value)}
                                                    />
                                                </th>
                                                <th className="px-6 py-4">

                                                    <input
                                                        type="text"
                                                        placeholder="Assigned To"
                                                        className="mt-1 w-full text-black text-sm border rounded px-2 py-1"
                                                        onChange={(e) => handleFilterChange("assignedTo", e.target.value)}
                                                    />
                                                </th>
                                                <th className="px-6 py-4">

                                                    <input
                                                        type="text"
                                                        placeholder="Branch"
                                                        className="mt-1 w-full text-black text-sm border rounded px-2 py-1"
                                                        onChange={(e) => handleFilterChange("branch", e.target.value)}
                                                    />
                                                </th>
                                                <th className="px-6 py-4">

                                                    <input
                                                        type="text"
                                                        placeholder="City"
                                                        className="mt-1 w-full text-black text-sm border rounded px-2 py-1"
                                                        onChange={(e) => handleFilterChange("city", e.target.value)}
                                                    />
                                                </th>
                                                <th className="px-6 py-4">Admission Date</th>
                                                <th className="px-6 py-4">Total Fees</th>
                                                <th className="px-6 py-4">Final Fees</th>
                                                <th className="px-6 py-4">

                                                    <input
                                                        type="text"
                                                        placeholder="Remaining Fees"
                                                        className="mt-1 w-full text-black text-sm border rounded px-2 py-1"
                                                        onChange={(e) => handleFilterChange("fees", e.target.value)}
                                                    />
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td colSpan="9" className="px-6 py-4 text-center">
                                                        <div className="flex items-center justify-center h-full">
                                                            <Loader />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : filteredQueries.length > 0 ? (
                                                filteredQueries.map((query, index) => {
                                                    const courseName = courses[query.courseInterest] || "Unknown Course";
                                                    const coursesfeen = coursesfee[query.courseInterest] || "N/A";
                                                    const UserName = user[query.assignedTo] || user[query.userid] || "Unknown User";
                                                    return (
                                                        <tr
                                                            key={query._id}
                                                            className="border-b cursor-pointer transition-colors duration-200 hover:opacity-90"
                                                            onClick={() => handleRowClick(query._id)}
                                                        >
                                                            <td className="px-6 py-1 font-semibold">{index + 1}</td>
                                                            <td className="px-6 py-1 font-semibold">{query.staffName}</td>
                                                            <td className="px-6 py-1 font-semibold">{query.studentName}</td>
                                                            <td className="px-6 py-1 font-semibold">{query.studentContact.phoneNumber}</td>
                                                            <td className="px-6 py-1 font-semibold">{courseName}</td>
                                                            <td className="px-6 py-1 font-semibold">{UserName}</td>
                                                            <td className="px-6 py-1">{query.branch}</td>
                                                            <td className="px-6 py-1">{query.studentContact.city}</td>
                                                            <td className="px-6 py-1">
                                                                {query.addmissiondate
                                                                    ? new Intl.DateTimeFormat('en-GB', {
                                                                        day: 'numeric',
                                                                        month: 'long',
                                                                        year: 'numeric',
                                                                    }).format(new Date(query.addmissiondate))
                                                                    : 'N/A'}
                                                            </td>


                                                            <td className="px-6 py-1">{coursesfeen.totalFee ? `${coursesfeen.totalFee} ₹` : "N/A"}</td>
                                                            <td className="px-6 py-1">
                                                                {query.finalfees > 0 ? (
                                                                    query.finalfees
                                                                ) : (
                                                                    <>
                                                                        {coursesfeen.totalFee ? `${coursesfeen.totalFee} ₹` : "N/A"}
                                                                    </>
                                                                )}
                                                            </td>


                                                            <td className="px-6 py-1">{coursesfeen.totalFee - query.total} ₹</td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                                                        No queries available
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
