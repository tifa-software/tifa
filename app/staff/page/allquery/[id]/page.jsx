"use client";
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Loader from "@/components/Loader/Loader";
import { Phone, MapPin, Calendar, CheckCircle, MessageCircle } from "lucide-react";
import Link from "next/link";
import UpdateQuere from "@/app/main/component/Updatequere/UpdateQuere";
import AssignedQuery from "@/components/AssignedQuery/AssignedQuery";
import QueryHistory from "@/components/QueryHistory/QueryHistory";
import Fees from "@/components/fees/Fees";

export default function Page({ params }) {
    const { id } = params;
    const [query, setQuery] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [courses, setCourses] = useState([]); // State to store courses
    const [courseName, setCourseName] = useState(""); // State to store the course name

    const fetchBranchData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/queries/find-single-byid/${id}`);
            setQuery(response.data.query);
        } catch (error) {
            console.error("Error fetching query data:", error);
            setError("Failed to fetch query data.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    const fetchCourses = useCallback(async () => {
        try {
            const response = await axios.get(`/api/course/fetchall/courses`);
            setCourses(response.data.fetch);
        } catch (error) {
            console.error("Error fetching courses:", error);
            setError("Failed to fetch courses.");
        }
    }, []);

    useEffect(() => {
        fetchBranchData();
        fetchCourses(); // Fetch courses when the component loads
    }, [fetchBranchData, fetchCourses]);

    useEffect(() => {
        if (query) {
            setDataLoaded(true);
        }
    }, [query,]);

    // Find the course name based on the course ID
    useEffect(() => {
        if (query && courses.length > 0) {
            const course = courses.find(course => course._id === query.courseInterest);
            setCourseName(course ? course.course_name : query.courseInterest);
        }
    }, [query, courses]);

    if (loading || !dataLoaded) {
        return (
            <div className="flex justify-center items-center w-full min-h-screen bg-gray-50">
                <Loader />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center w-full min-h-screen bg-gray-50">
                <p className="text-red-500 text-lg">{error}</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 bg-gray-50 min-h-screen">
            {/* Left Sidebar */}
            <div className="col-span-1 bg-white shadow-lg rounded-lg p-6">
                <div className="sticky top-5">
                    <div className="flex flex-col">
                        <button
                            onClick={async () => {
                                if (query.autoclosed === "close") {
                                    try {
                                        // Call the update API to change autoclosed to "open"
                                        const newApiResponse = await axios.patch('/api/queries/update', {
                                            id: query._id,
                                            autoclosed: "open"  // Change autoclosed to "open" when recovering query
                                        });

                                        // Optionally, refresh data after the update
                                        fetchBranchData();
                                    } catch (error) {
                                        console.error("Error updating query:", error);
                                    }
                                } else {
                                    // Open the modal if query.autoclosed is not "close"
                                    setIsModalOpen(true);
                                }
                            }}
                            className="mb-1 bg-[#29234b] w-full py-1 rounded-md text-white transition duration-300 ease-in-out hover:bg-[#3a2b6f] focus:outline-none focus:ring-2 focus:ring-[#ffbe98] focus:ring-opacity-50"
                        >
                            {query.autoclosed === "close" ? "Recover Query" : "Update"}
                        </button>

                        <AssignedQuery refreshData={fetchBranchData} initialData={query} />
                    </div>

                    <Fees id={query._id} />
                    <h1 className="text-xl font-bold text-[#29234b] mb-3 hover:underline cursor-pointer">
                        {query.studentName}
                    </h1>
                    <div className="flex flex-col text-sm text-gray-700">
                        <Link
                            href={`tel:${query.studentContact.phoneNumber}`}
                            title={`Call ${query.studentName} at ${query.studentContact.phoneNumber}`}
                            className="flex items-center gap-x-2 p-0.5 my-1 rounded-lg hover:bg-gray-100 transition duration-200"
                        >
                            <Phone color="#6cb049" size={18} />
                            {query.studentContact.phoneNumber}
                        </Link>


                        <Link
                            href={`https://wa.me/${query.studentContact.whatsappNumber}`}
                            passHref
                            title={`Message ${query.studentName} on WhatsApp`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-x-2 p-0.5 my-1 rounded-lg hover:bg-gray-100 transition duration-200"
                        >
                            <MessageCircle color="#6cb049" size={18} />
                            {query.studentContact.whatsappNumber}

                        </Link>
                        <p className="flex items-center gap-x-2 p-2 rounded-lg hover:bg-gray-100 transition">
                            <MapPin color="#6cb049" size={18} />
                            {query.studentContact.address}
                        </p>
                        <p className="flex items-center gap-x-2 p-2 rounded-lg hover:bg-gray-100 transition">
                            <Calendar color="#6cb049" size={18} />
                            {new Date(query.deadline).toLocaleDateString("en-GB")}
                        </p>
                    </div>
                    <div className="mt-4">
                        {/* <AssignedQuery refreshData={fetchBranchData} initialData={query} /> */}

                    </div>
                    <div className="mt-4">
                        <h2 className="text-lg font-semibold text-[#29234b]">Course Interest</h2>
                        <p className="text-sm text-gray-700">{courseName}</p> {/* Show course name here */}
                    </div>
                    <div className="mt-4">
                        <h2 className="text-lg font-semibold text-[#29234b]">Enrolled Status</h2>
                        <p className="text-sm text-gray-700">{query.addmission ? "Enrolled" : "Not Enrolled"}</p>
                    </div>
                    <div className="mt-4">
                        <h2 className="text-lg font-semibold text-[#29234b]">Query Status</h2>
                        <p className="text-sm text-gray-700 capitalize">{query.autoclosed}</p>
                    </div>
                </div>
            </div>

            {/* Right Section */}
            <div className="col-span-3 bg-white shadow-md rounded-lg p-5">
                <div className="space-y-6">
                    <QueryHistory initialData={query} />
                </div>
            </div>

            {/* Update Query Modal */}
            <UpdateQuere
                refreshData={fetchBranchData}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialData={query}
            />
        </div>
    );
}
