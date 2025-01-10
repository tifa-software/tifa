"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Loader from "@/components/Loader/Loader";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function UnderVisit() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { data: session } = useSession();
  const [adminData, setAdminData] = useState(null);

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
        const { data } = await axios.get(`/api/queries/fetchgrade-bybranch/${adminData}`);
        setQueries(data.queries);
      } catch (error) {
        console.error("Error fetching query data:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQueryData();
  }, [adminData]);

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
                        <th className="px-6 py-4">Grade</th>
                        <th className="px-6 py-4">Deadline</th>
                        <th className="px-6 py-4">Visit</th>
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
                            const deadline = new Date(query.deadline);
                            return (
                              <tr
                                key={query._id}
                                className="border-b cursor-pointer transition-colors duration-200 hover:opacity-90"
                              >
                                <td className="px-6 py-1 font-semibold">
                                  <Link href={`/branch/page/allquery/${query._id}`}>{query.studentName}</Link>
                                </td>
                                <td className="px-6 py-1">{query.grade}</td>
                                <td className="px-6 py-1">{deadline.toLocaleDateString()}</td>
                                <td className="px-6 py-1">True</td>
                                <td className="px-6 py-1">{query.addmission ? "Enroll" : "Pending"}</td>
                              </tr>
                            );
                          })
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
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
