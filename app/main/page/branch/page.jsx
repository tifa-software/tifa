"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Loader from "@/components/Loader/Loader";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    ArrowRight,
    Search,
    CirclePlus
} from "lucide-react";
import Link from "next/link";

export default function Branch() {
    const [branches, setBranches] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [searchTerm, setSearchTerm] = useState("");
    const [sortOrder, setSortOrder] = useState("newest");
    const [filterCourse, setFilterCourse] = useState("");

    useEffect(() => {
        fetchAllCourses();
    }, []);

    useEffect(() => {
        fetchBranches();
    }, [currentPage, searchTerm, sortOrder, filterCourse]);

    const fetchAllCourses = async () => {
        try {
            const res = await axios.get("/api/course/fetchall/ds");
            setCourses(res.data.fetch);
        } catch (error) {
            console.error("Course fetch error:", error);
        }
    };

    const fetchBranches = async () => {
        setLoading(true);
        try {
            const res = await axios.get("/api/branch/fetchallserver/branch", {
                params: {
                    page: currentPage,
                    limit: 8,
                    search: searchTerm,
                    course: filterCourse || "All",
                    sort: sortOrder,
                },
            });

            setBranches(res.data.branches);
            setTotalPages(res.data.totalPages);
        } catch (error) {
            console.error("Branch fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    const router = useRouter();
    const handleRowClick = (id) => {
        router.push(`/main/page/branch/${id}`);
    };

    const getCourseName = (courseId) => {
        const course = courses.find((course) => course._id === courseId);
        return course ? course.course_name : "Unknown";
    };

    return (
        <div className="container lg:w-[95%] mx-auto py-5">
            {/* Search + Filters */}
            <div className="flex justify-between items-center mb-4">
                {/* Search Input */}
                <div className="relative w-1/3">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search size={14} />
                    </span>
                    <input
                        type="text"
                        placeholder="Search Branch..."
                        className="border px-3 py-2 pl-10 w-full text-sm"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>

                {/* Filters */}
                <div className="hidden lg:flex space-x-3">
                    {/* Course Filter */}
                    <select
                        className="border px-3 py-2 text-sm"
                        value={filterCourse}
                        onChange={(e) => {
                            setFilterCourse(e.target.value);
                            setCurrentPage(1);
                        }}
                    >
                        <option value="">All Courses</option>
                        {courses.map((course) => (
                            <option key={course._id} value={course._id}>
                                {course.course_name}
                            </option>
                        ))}
                    </select>

                    {/* Sorting */}
                    <select
                        className="border px-3 py-2 text-sm"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                    >
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                    </select>

                    {/* Add Branch Button */}
                    <Link href={"/main/page/addbranch"}>
                        <button className="bg-[#29234b] rounded-md flex items-center text-white text-sm px-4 py-2">
                            <CirclePlus size={16} className="me-1" /> Add Branch
                        </button>
                    </Link>
                </div>
            </div>

            {/* Table */}
            <div className="relative overflow-x-auto shadow-md bg-white border border-gray-200">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="bg-[#29234b] text-white uppercase">
                        <tr>
                            <th className="px-4 py-2">Branch Name</th>
                            <th className="px-4 py-2">Location</th>
                            <th className="px-4 py-2">Courses</th>
                            <th className="px-4 py-2">Students</th>
                            <th className="px-4 py-2">Staff</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-4">
                                    <div className="flex justify-center items-center h-[300px]">
                                        <Loader />
                                    </div>
                                </td>
                            </tr>
                        ) : branches.length > 0 ? (
                            branches.map((branch) => (
                                <tr
                                    key={branch._id}
                                    onClick={() => handleRowClick(branch._id)}
                                    className="border-b cursor-pointer hover:bg-gray-100 odd:bg-gray-50"
                                >
                                    <td className="px-4 py-2 font-semibold text-gray-900">
                                        {branch.branch_name}
                                    </td>

                                    <td className="px-4 py-2 text-xs">
                                        {branch.location.street}, {branch.location.city},{" "}
                                        {branch.location.state}, {branch.location.zipCode}
                                    </td>

                                    <td className="px-4 py-2 text-xs">
                                        {branch.courses.length > 0
                                            ? branch.courses
                                                .map((id) => getCourseName(id))
                                                .join(", ")
                                            : "No Courses"}
                                    </td>

                                    <td className="px-4 py-2 text-xs">
                                        {branch.student_count || 0}
                                    </td>

                                    <td className="px-4 py-2 text-xs">
                                        {branch.staff_count || 0}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="py-4 text-center text-gray-500">
                                    No branches found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    paginate={setCurrentPage}
                />
            </div>
        </div>
    );
}

const Pagination = ({ currentPage, totalPages, paginate }) => (
    <div className="flex justify-center my-4">
        <button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-3 py-1 mx-1 text-sm border rounded ${
                currentPage === 1 ? "cursor-not-allowed bg-gray-200" : "bg-[#6cb049] text-white"
            }`}
        >
            <ArrowLeft size={18} />
        </button>

        <span className="px-3 py-1 mx-1 text-sm border rounded bg-gray-200">
            Page {currentPage} of {totalPages}
        </span>

        <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 mx-1 text-sm border rounded ${
                currentPage === totalPages
                    ? "cursor-not-allowed bg-gray-200"
                    : "bg-[#6cb049] text-white"
            }`}
        >
            <ArrowRight size={18} />
        </button>
    </div>
);
