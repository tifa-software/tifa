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
        studentName: "",
        phoneNumber: "",
        courseInterest: "",
        branch: "",
        city: "",
        enroll: "",
    });
    const [courses, setCourses] = useState({});
    const [coursesfee, setCoursesfee] = useState({});
    const [user, setUser] = useState({});

    const router = useRouter();

    useEffect(() => {
        const fetchQueryData = async () => {
            try {
                setLoading(true);
                const { data } = await axios.get(`/api/queries/demo/1`);
                setQueries(data.fetch);
                setFilteredQueries(data.fetch);
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
                    // Parse enrollpercent as a number and calculate the enrollment fee
                    const enrollPercent = parseFloat(coursesfee.enrollpercent) || 0; // Default to 0 if enrollpercent is invalid
                    const enrollmentFee = coursesfee.fees * (enrollPercent / 100); // Calculate the enrollment fee

                    acc[coursesfee._id] = {
                        totalFee: coursesfee.fees,
                        enrollPercent: enrollPercent,
                        enrollmentFee: enrollmentFee.toFixed() // Keep the fee to two decimal places
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
        const fetchuserData = async () => {
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

        fetchuserData();
    }, []);



    useEffect(() => {
        const filtered = queries.filter((query) => {
            const courseName = courses[query.courseInterest] || "Unknown Course";
            const UserName = user[query.assignedTo] || "Unknown User";

            return (
                (filters.studentName
                    ? query.studentName?.toLowerCase().includes(filters.studentName.toLowerCase())
                    : true) &&
                (filters.phoneNumber
                    ? query.studentContact.phoneNumber.includes(filters.phoneNumber)
                    : true) &&
                (filters.courseInterest
                    ? courseName.toLowerCase().includes(filters.courseInterest.toLowerCase())
                    : true) &&
                (filters.assignedTo
                    ? UserName.toLowerCase().includes(filters.assignedTo.toLowerCase())
                    : true) &&
                (filters.branch
                    ? query.branch.toLowerCase().includes(filters.branch.toLowerCase())
                    : true) &&
                (filters.city
                    ? query.studentContact.city.toLowerCase().includes(filters.city.toLowerCase())
                    : true) &&
                (filters.enroll
                    ? (filters.enroll === "Enroll" && query.addmission) ||
                    (filters.enroll === "Not Enroll" && !query.addmission)
                    : true)
            );
        });
        setFilteredQueries(filtered);
    }, [filters, queries]);

    const handleRowClick = (id) => {
        router.push(`/main/page/allquery/${id}`);
    };

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredQueries);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Queries");
        XLSX.writeFile(workbook, "queries.xlsx");
    };

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <div className="container mx-auto p-5">
            <div className="flex flex-col lg:flex-row justify-between space-y-6 lg:space-y-0 lg:space-x-6">
                <div className="w-full">Total Queries: {filteredQueries.length}
                    <div className="shadow-lg rounded-lg bg-white mb-6">
                        <div className="p-4">
                            <div className="flex justify-between items-center gap-5 mb-4">
                                <button
                                    onClick={exportToExcel}
                                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                >
                                    Export to Excel
                                </button>
                            </div>
                            <div className="relative overflow-y-auto">
                                <table className="min-w-full text-xs text-left text-gray-600 font-sans">
                                    <thead className="bg-[#29234b] text-white uppercase">
                                        <tr>
                                            <th className="px-6 py-4">S/N</th>
                                            <th className="px-6 py-4">

                                                <input
                                                    type="text"
                                                    className="w-full mt-1 text-black px-2 py-1 rounded"
                                                    placeholder="Student Name"
                                                    onChange={(e) =>
                                                        handleFilterChange("studentName", e.target.value)
                                                    }
                                                />
                                            </th>
                                            <th className="px-6 py-4">

                                                <input
                                                    type="text"
                                                    className="w-full mt-1 text-black px-2 py-1 rounded"
                                                    placeholder=" Mobile No."
                                                    onChange={(e) =>
                                                        handleFilterChange("phoneNumber", e.target.value)
                                                    }
                                                />
                                            </th>
                                            <th className="px-6 py-4">

                                                <input
                                                    type="text"
                                                    className="w-full mt-1 text-black px-2 py-1 rounded"
                                                    placeholder=" Interested Course"
                                                    onChange={(e) =>
                                                        handleFilterChange("courseInterest", e.target.value)
                                                    }
                                                />
                                            </th>

                                            <th className="px-6 py-4">

                                                <input
                                                    type="text"
                                                    className="w-full mt-1 text-black px-2 py-1 rounded"
                                                    placeholder="Assigned To"
                                                    onChange={(e) =>
                                                        handleFilterChange("assignedTo", e.target.value)
                                                    }
                                                />
                                            </th>
                                            <th className="px-6 py-4">

                                                <input
                                                    type="text"
                                                    className="w-full mt-1 text-black px-2 py-1 rounded"
                                                    placeholder="Branch"
                                                    onChange={(e) =>
                                                        handleFilterChange("branch", e.target.value)
                                                    }
                                                />
                                            </th>

                                            <th className="px-6 py-4">

                                                <input
                                                    type="text"
                                                    className="w-full mt-1 text-black px-2 py-1 rounded"
                                                    placeholder="City"
                                                    onChange={(e) =>
                                                        handleFilterChange("city", e.target.value)
                                                    }
                                                />
                                            </th>
                                            <th className="px-6 py-4">
                                                Enroll Fees
                                            </th>
                                            <th className="px-6 py-4">
                                                Received Fees
                                            </th>
                                            {/* <th className="px-6 py-4">Deadline</th> */}
                                            <th className="px-6 py-4">

                                                <select
                                                    className="w-full mt-1 text-black px-2 py-1 rounded"
                                                    onChange={(e) =>
                                                        handleFilterChange("enroll", e.target.value)
                                                    }
                                                >
                                                    <option value="">All</option>
                                                    <option value="Enroll">Enroll</option>
                                                    <option value="Not Enroll">Not Enroll</option>
                                                </select>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan="8" className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center h-full">
                                                        <Loader />
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filteredQueries.length > 0 ? (
                                            filteredQueries.map((query, index) => {
                                                const deadline = new Date(query.deadline);
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
                                                        <td className="px-6 py-1 font-semibold">{query.studentName}</td>
                                                        <td className="px-6 py-1 font-semibold">{query.studentContact.phoneNumber}</td>
                                                        <td className="px-6 py-1 font-semibold">{courseName}</td>
                                                        <td className="px-6 py-1 font-semibold">{UserName}</td>
                                                        <td className="px-6 py-1">{query.branch}</td>
                                                        <td className="px-6 py-1">{query.studentContact.city}</td>
                                                        <td className="px-6 py-1">{coursesfeen.enrollmentFee} ₹</td>
                                                        <td className="px-6 py-1">{query.total} ₹</td>
                                                        {/* <td className="px-6 py-1">
                                                            {deadline.toLocaleDateString()}
                                                        </td> */}
                                                        <td className="px-6 py-1">
                                                            {query.addmission ? "Enroll" : "Not Enroll"}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
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
    );
}
