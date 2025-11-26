"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Loader from "@/components/Loader/Loader";
import { useRouter } from "next/navigation";

export default function Assigned() {
  const router = useRouter();

  const [queries, setQueries] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [allBranches, setAllBranches] = useState([]);

  const [selectedBranch, setSelectedBranch] = useState("All");
  const [selectedDeadline, setSelectedDeadline] = useState("All");
  const [selectedEnrollStatus, setSelectedEnrollStatus] = useState("All");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // ---------------------------
  // LOAD ALL BRANCHES (1 TIME)
  // ---------------------------
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const { data } = await axios.get("/api/branch/fetchall/s");
        setAllBranches(data.fetch || []);
      } catch (error) {
        console.log("Branch fetch error:", error);
      }
    };

    fetchBranches();
  }, []);

  // ---------------------------
  // MAIN DATA FETCH
  // ---------------------------
  const fetchData = async () => {
    try {
      setLoading(true);

      const { data } = await axios.get(
        `/api/queries/demoserver/demo?page=${currentPage}&limit=10&branch=${selectedBranch}&deadline=${selectedDeadline}&status=${selectedEnrollStatus}`
      );

      setQueries(data.fetch);
      setTotalPages(data.totalPages);
      setData(data)
      setLoading(false);
    } catch (error) {
      console.log("Fetch error:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, selectedBranch, selectedDeadline, selectedEnrollStatus]);

  const handleRowClick = (id) => {
    router.push(`/main/page/allquery/${id}`);
  };

  return (
    <div className="container mx-auto p-5">
      <div className="flex flex-col lg:flex-row justify-between space-y-6 lg:space-y-0 lg:space-x-6">

        {/* LIST */}
        <div className="w-full lg:w-2/3">
          <div className="shadow-lg rounded-lg bg-white mb-6 relative">
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Demo Count
              </h2>

              <div className="relative overflow-y-auto" style={{ height: "400px" }}>
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader />
                  </div>
                ) : (
                  <table className="min-w-full text-xs text-left text-gray-600 font-sans">
                    <thead className="bg-[#29234b] text-white uppercase">
                      <tr>
                        <th className="px-6 py-4">Sr.No</th>
                        <th className="px-6 py-4">Student</th>
                        <th className="px-6 py-4">Branch</th>
                        <th className="px-6 py-4">Deadline</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Fees</th>
                      </tr>
                    </thead>

                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="4" className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center h-full">
                              <Loader />
                            </div>
                          </td>
                        </tr>
                      ) : queries.length > 0 ? (
                        queries.map((query, index) => {
                          const deadline = new Date(query.deadline);
                          const isToday = deadline.toDateString() === new Date().toDateString();
                          const isPastDeadline = deadline < new Date();
                          const isIn24Hours =
                            deadline.toDateString() ===
                            new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();
                          const isIn48Hours =
                            deadline.toDateString() ===
                            new Date(Date.now() + 48 * 60 * 60 * 1000).toDateString();

                          const hasTotal = query.total > 0; // 👈 CHECK TOTAL CONDITION

                          // Row color logic
                          const rowClass = hasTotal
                            ? "bg-green-300 text-black" // 🔥 highest priority
                            : query.addmission
                              ? "bg-[#6cb049] text-white"
                              : isToday
                                ? "bg-red-500 text-white"
                                : isPastDeadline
                                  ? "bg-gray-800 text-white animate-blink"
                                  : isIn24Hours
                                    ? "bg-[#fcccba] text-black"
                                    : isIn48Hours
                                      ? "bg-[#ffe9bf] text-black"
                                      : "";

                          return (
                            <tr
                              key={query._id}
                              className={`border-b cursor-pointer transition-colors duration-200 hover:opacity-90 ${rowClass} `}
                              onClick={() => handleRowClick(query._id)}
                            >
                              <td className="px-6 py-1 font-semibold">{index + 1}</td>
                              <td className="px-6 py-1 font-semibold">{query.studentName}</td>
                              <td className="px-6 py-1">{query.branch}</td>
                              <td className="px-6 py-1">{deadline.toLocaleDateString()}</td>
                              <td className="px-6 py-1">
                                {query.addmission ? "Enroll" : "Pending"}
                              </td>
                              <td className="px-6 py-1">
                                {query.total}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                            No queries available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>


              {/* Pagination */}
              <div className="absolute bottom-0 left-0 right-0 bg-gray-100 py-2 px-4 flex justify-between">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-4 py-2 bg-gray-300 rounded"
                >
                  Previous
                </button>

                <span>Page {currentPage} of {totalPages}</span>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-4 py-2 bg-gray-300 rounded"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* FILTERS */}
        <div className="w-full lg:w-1/3 space-y-6">

          {/* Branch */}
          <div className="shadow-lg bg-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Filter by Branch</h3>

            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 bg-gray-100 rounded"
            >
              <option value="All">All</option>

              {allBranches.map((b) => (
                <option key={b.branch_name} value={b.branch_name}>
                  {b.branch_name}
                </option>
              ))}
            </select>
          </div>

          {/* Deadline */}
          <div className="shadow-lg bg-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Filter by Deadline</h3>

            <select
              value={selectedDeadline}
              onChange={(e) => {
                setSelectedDeadline(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 bg-gray-100 rounded"
            >
              <option value="All">All</option>
              <option value="Today">Today</option>
              <option value="Tomorrow">Tomorrow</option>
              <option value="Past">Past</option>
            </select>
          </div>

          {/* Status */}
          <div className="shadow-lg bg-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Filter by Status</h3>

            <select
              value={selectedEnrollStatus}
              onChange={(e) => {
                setSelectedEnrollStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 bg-gray-100 rounded"
            >
              <option value="All">All</option>
              <option value="Enroll">Enroll</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

        </div>

      </div>
      <div className="p-6 space-y-10">

        {/* TOP STATS */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Overview</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* CARD */}
            <div className="bg-white shadow-sm hover:shadow-md transition rounded-xl p-6 border border-gray-100">
              <h3 className="text-gray-500 text-sm">Total Queries</h3>
              <p className="text-3xl font-extrabold text-gray-800 mt-2">{data.totalCount}</p>
            </div>

            <div className="bg-white shadow-sm hover:shadow-md transition rounded-xl p-6 border border-gray-100">
              <h3 className="text-gray-500 text-sm">Total Fees = 0</h3>
              <p className="text-3xl font-extrabold text-blue-600 mt-2">{data.totalZeroCount}</p>
            </div>

            <div className="bg-white shadow-sm hover:shadow-md transition rounded-xl p-6 border border-gray-100">
              <h3 className="text-gray-500 text-sm">Fees Greater Than 0</h3>
              <p className="text-3xl font-extrabold text-green-600 mt-2">{data.totalGreaterCount}</p>
            </div>

            <div className="bg-white shadow-sm hover:shadow-md transition rounded-xl p-6 border border-gray-100">
              <h3 className="text-gray-500 text-sm">Pending</h3>
              <p className="text-3xl font-extrabold text-red-500 mt-2">{data.totalPending}</p>
            </div>

            <div className="bg-white shadow-sm hover:shadow-md transition rounded-xl p-6 border border-gray-100">
              <h3 className="text-gray-500 text-sm">Enrolled</h3>
              <p className="text-3xl font-extrabold text-purple-600 mt-2">{data.totalEnroll}</p>
            </div>

            <div className="bg-white shadow-sm hover:shadow-md transition rounded-xl p-6 border border-gray-100">
              <h3 className="text-gray-500 text-sm">Total All Queries</h3>
              <p className="text-3xl font-extrabold text-gray-800 mt-2">{data.totalAllQueries}</p>
            </div>

          </div>
        </div>

        {/* BRANCH WISE COUNTS */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Branch-wise Summary</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">

            {data?.branchWiseCounts &&
              Object.entries(data.branchWiseCounts).map(([branch, count]) => (

                <div
                  key={branch}
                  className="bg-white shadow-sm hover:shadow-md transition rounded-xl p-5 border border-gray-100"
                >
                  <h3 className="text-gray-600 text-sm">{branch}</h3>
                  <p className="text-2xl font-bold text-indigo-600 mt-2">{count}</p>
                </div>

              ))
            }

          </div>
        </div>

      </div>


    </div>
  );
}
