"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Loader from "@/components/Loader/Loader";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function UnderVisit() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const [adminData, setAdminData] = useState(null);
  const [courses, setCourses] = useState({}); // To store course ID to name mapping

  // Fetch admin data based on session email
  useEffect(() => {
    const fetchAdminData = async () => {
      if (!session?.user?.email) return;

      setLoading(true);
      try {
        const response = await axios.get(`/api/admin/find-admin-byemail/${session.user.email}`);
        setAdminData(response.data.branch); // Ensure response contains branch
      } catch (err) {
        console.error("Error fetching admin data:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [session]);

  // Fetch queries based on admin data
  useEffect(() => {
    const fetchQueryData = async () => {
      if (!adminData) return;

      setLoading(true);
      try {
        const { data } = await axios.get(`/api/report/visit/${adminData}`);
        setQueries(data.queries);
      } catch (error) {
        console.error("Error fetching query data:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQueryData();
  }, [adminData]);

  // Fetch all courses and map IDs to names
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await axios.get(`/api/course/fetchall/courses`);
        const courseMapping = response.data.fetch.reduce((acc, course) => {
          acc[course._id] = course.course_name; // Assuming each course has _id and name
          return acc;
        }, {});
        setCourses(courseMapping);
      } catch (error) {
        console.error("Error fetching courses:", error.message);
      }
    };

    fetchCourses();
  }, []);

  return (
    <div className="container mx-auto p-5">
      <div className="flex flex-col lg:flex-row justify-between space-y-6 lg:space-y-0 lg:space-x-6">
        {/* Queries List */}
        <div className="w-full">
          <div className="mb-6">
            <div className="p-4">
              <div className="relative">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader />
                  </div>
                ) : (
                  <table className="min-w-full text-xs text-left text-gray-600 font-sans">
                    <thead className="bg-[#29234b] text-white uppercase">
                      <tr>
                        <th className="px-6 py-4">Student Name</th>
                        <th className="px-6 py-4">Mobile Number</th>
                        <th className="px-6 py-4">Course</th>
                        <th className="px-6 py-4">Qualification</th>
                        <th className="px-6 py-4">Address</th>
                        <th className="px-6 py-4">Reference</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queries.length > 0 ? (
                        queries
                          .sort((a, b) => {
                            const gradeOrder = { A: 1, B: 2, C: 3, D: 4, F: 5 };
                            return gradeOrder[a.grade] - gradeOrder[b.grade];
                          })
                          .map((query) => {
                            const courseName = courses[query.courseInterest] || "Unknown Course";
                            return (
                              <tr
                                key={query._id}
                                className="border-b cursor-pointer transition-colors duration-200 hover:opacity-90"
                              >
                                <td className="px-6 py-1 font-semibold">
                                  <Link href={`/branch/page/allquery/${query._id}`}>{query.studentName}</Link>
                                </td>
                                <td className="px-6 py-1">{query.studentContact.phoneNumber}</td>
                                <td className="px-6 py-1">{courseName}</td>
                                <td className="px-6 py-1">{query.qualification}</td>
                                <td className="px-6 py-1">{query.studentContact.address}</td>
                                <td className="px-6 py-1">{query.referenceid}</td>
                                <td className="px-6 py-1">{query.addmission ? "Enroll" : "Pending"}</td>
                              </tr>
                            );
                          })
                      ) : (
                        <tr>
                          <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                            No queries available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
