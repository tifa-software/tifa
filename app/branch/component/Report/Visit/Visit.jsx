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
  const [courses, setCourses] = useState({});
  const [filters, setFilters] = useState({
    studentName: "",
    mobileNumber: "",
    course: "",
    qualification: "",
    address: "",
    reference: "",
    status: "",
  });

  useEffect(() => {
    const fetchAdminData = async () => {
      if (!session?.user?.email) return;

      setLoading(true);
      try {
        const response = await axios.get(`/api/admin/find-admin-byemail/${session.user.email}`);
        setAdminData(response.data.branch);
      } catch (err) {
        console.error("Error fetching admin data:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [session]);

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

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await axios.get(`/api/course/fetchall/courses`);
        const courseMapping = response.data.fetch.reduce((acc, course) => {
          acc[course._id] = course.course_name;
          return acc;
        }, {});
        setCourses(courseMapping);
      } catch (error) {
        console.error("Error fetching courses:", error.message);
      }
    };

    fetchCourses();
  }, []);

  const handleFilterChange = (e, key) => {
    setFilters({ ...filters, [key]: e.target.value });
  };

  const filteredQueries = queries.filter((query) => {
    const courseName = courses[query.courseInterest] || "Unknown Course";
    return (
      query.studentName?.toLowerCase().includes(filters.studentName.toLowerCase()) &&
      query.studentContact.phoneNumber.includes(filters.mobileNumber) &&
      courseName.toLowerCase().includes(filters.course.toLowerCase()) &&
      query.qualification.toLowerCase().includes(filters.qualification.toLowerCase()) &&
      query.studentContact.address.toLowerCase().includes(filters.address.toLowerCase()) &&
      query.referenceid.toLowerCase().includes(filters.reference.toLowerCase()) &&
      (filters.status === "" ||
        (filters.status === "Enroll" && query.addmission) ||
        (filters.status === "Pending" && !query.addmission))
    );
  });

  return (
    <div className="container mx-auto p-5">
      <div className="flex flex-col lg:flex-row justify-between space-y-6 lg:space-y-0 lg:space-x-6">
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
                        <th className="px-6 py-4">#</th>
                        <th className="px-6 py-4">
                          <input
                            type="text"
                            placeholder="Student Name"
                            className="w-full p-1 text-black"
                            value={filters.studentName}
                            onChange={(e) => handleFilterChange(e, "studentName")}
                          />
                        </th>
                        <th className="px-6 py-4">
                          <input
                            type="text"
                            placeholder="Mobile Number"
                            className="w-full p-1 text-black"
                            value={filters.mobileNumber}
                            onChange={(e) => handleFilterChange(e, "mobileNumber")}
                          />
                        </th>
                        <th className="px-6 py-4">
                          <input
                            type="text"
                            placeholder="Course"
                            className="w-full p-1 text-black"
                            value={filters.course}
                            onChange={(e) => handleFilterChange(e, "course")}
                          />
                        </th>
                        <th className="px-6 py-4">
                          <input
                            type="text"
                            placeholder="Qualification"
                            className="w-full p-1 text-black"
                            value={filters.qualification}
                            onChange={(e) => handleFilterChange(e, "qualification")}
                          />
                        </th>
                        <th className="px-6 py-4">
                          <input
                            type="text"
                            placeholder="Address"
                            className="w-full p-1 text-black"
                            value={filters.address}
                            onChange={(e) => handleFilterChange(e, "address")}
                          />
                        </th>
                        <th className="px-6 py-4">
                          <input
                            type="text"
                            placeholder="Reference"
                            className="w-full p-1 text-black"
                            value={filters.reference}
                            onChange={(e) => handleFilterChange(e, "reference")}
                          />
                        </th>
                        <th className="px-6 py-4">
                          <select
                            className="w-full p-1 text-black"
                            value={filters.status}
                            onChange={(e) => handleFilterChange(e, "status")}
                          >
                            <option value="">All</option>
                            <option value="Enroll">Enroll</option>
                            <option value="Pending">Pending</option>
                          </select>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQueries.length > 0 ? (
                        filteredQueries.map((query, index) => {
                          const courseName = courses[query.courseInterest] || "Unknown Course";
                          return (
                            <tr
                              key={query._id}
                              className="border-b cursor-pointer transition-colors duration-200 hover:opacity-90"
                            >
                              <td className="px-6 py-1 font-semibold">{index + 1}</td>
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
                          <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
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
