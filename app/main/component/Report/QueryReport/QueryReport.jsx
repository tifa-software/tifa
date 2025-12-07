"use client";
import React, { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";
import { useSession } from 'next-auth/react';
import Link from "next/link";
import * as XLSX from "xlsx";
import Queryreport55 from "@/app/main/component/queryreport/Queryreport55"
import { ChevronDownSquare } from "lucide-react";
export default function QueryReport({ initialFilters } = {}) {
  const [allquery, setAllquery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);

  // Filter states
  const [referenceId, setReferenceId] = useState(initialFilters?.referenceId || "");
  const [suboption, setSuboption] = useState(initialFilters?.suboption || "");
  const [fromDate, setFromDate] = useState(initialFilters?.fromDate || "");
  const [toDate, setToDate] = useState(initialFilters?.toDate || "");
  const [admission, setAdmission] = useState(initialFilters?.admission || "");
  const [reson, setReson] = useState("");
  const [grade, setGrade] = useState(initialFilters?.grade || "");
  const [location, setLocation] = useState(initialFilters?.location || "");
  const [city, setCity] = useState(initialFilters?.city || "");
  const [assignedName, setAssignedName] = useState(initialFilters?.assignedName || "");
  const [assignedFrom, setAssignedFrom] = useState("");
  const [userName, setUserName] = useState(initialFilters?.userName || "");
  const [studentName, setStudentName] = useState("");
  const [referenceData, setReferenceData] = useState([]);
  const [branches, setBranches] = useState([]);
  const [user, setuser] = useState([]);
  const [selectedReference, setSelectedReference] = useState(null);
  const { data: session } = useSession();
  const [branch, setBranch] = useState(initialFilters?.branch || "");
  const [showClosed, setShowClosed] = useState("");
  const options = [
    { value: "interested_but_not_proper_response", label: "Interested but not proper response" },
    { value: "Wrong Lead Looking For Job", label: "Wrong Lead Looking For Job" },
    { value: "no_connected", label: "No Connected" },
    { value: "not_lifting", label: "Not Lifting" },
    { value: "busy", label: "Busy" },
    { value: "not_interested", label: "Not Interested" },
    { value: "wrong_no", label: "Wrong No" },
    { value: "no_visit_branch_yet", label: "No Visit Branch Yet" }
  ];

  // ✅ State to store selected reasons
  const [reason, setReason] = useState([]);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const tableWrapperRef = useRef(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeQuery, setActiveQuery] = useState(null);
  const handleOpenModal = (queryContent) => {
    setActiveQuery(queryContent);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setActiveQuery(null);
  };


  // ✅ Toggle selection of an option
  const toggleOption = (value) => {
    setReason((prevSelected) =>
      prevSelected.includes(value)
        ? prevSelected.filter((option) => option !== value)
        : [...prevSelected, value]
    );
  };

  // ✅ Handles click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
      const response = await axios.get("/api/report/fetchalloverview/query", {
        params: {
          referenceId,
          suboption,
          fromDate,
          toDate,
          admission,
          grade,
          reason: reason.length > 0 ? reason.join(",") : "",
          location,
          branch,
          city,
          assignedName,
          assignedFrom,
          userName,
          showClosed,
          studentName,
          page,
          limit,
        },
      });
      const fetchedData = response.data.fetch || [];
      setAllquery(fetchedData);
      setTotalCount(response.data.pagination?.total ?? fetchedData.length);
      setTotalPages(response.data.pagination?.totalPages ?? 1);
    } catch (error) {
      console.error("Error fetching filtered data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data whenever filters or pagination change
  useEffect(() => {
    fetchFilteredData();
  }, [referenceId, studentName, suboption, fromDate, branch, toDate, admission, grade, reason, location, city, assignedName, assignedFrom, userName, showClosed, page, limit]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [referenceId, studentName, suboption, fromDate, branch, toDate, admission, grade, reason, location, city, assignedName, assignedFrom, userName, showClosed]);

  const removeFilter = () => {
    // Reset all filter variables to their default values
    setReferenceId("");
    setSuboption("");
    setFromDate("");
    setToDate("");
    setAdmission("");
    setReson("");
    setGrade("");
    setReason([]);
    setBranch("");
    setLocation("");
    setCity("");
    setAssignedName("");
    setAssignedFrom("");
    setUserName("");
    setStudentName("");
    setShowClosed("");
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  useEffect(() => {
    if (tableWrapperRef.current) {
      tableWrapperRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [page]);

  const handleLimitChange = (event) => {
    setLimit(Number(event.target.value));
    setPage(1);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(allquery);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Queries");
    XLSX.writeFile(workbook, "queries.xlsx");
  };

  const getFilterSummary = () => {
    const filters = [];
    if (referenceId) filters.push(`Reference: ${referenceId}`);
    if (suboption) filters.push(`Suboption: ${suboption}`);
    if (fromDate) filters.push(`From Date: ${fromDate}`);
    if (toDate) filters.push(`To Date: ${toDate}`);
    if (admission) filters.push(`Admission: ${admission === "true" ? "Enroll" : "Not Enroll"}`);
    if (grade) filters.push(`Grade: ${grade}`);
    if (reason.length > 0) filters.push(`Reason: ${reason.join(", ")}`);
    if (location) filters.push(`Branch: ${location}`);
    if (city) filters.push(`City: ${city}`);
    if (assignedName) filters.push(`Assigned To: ${assignedName}`);
    if (assignedFrom) filters.push(`Assigned From: ${assignedFrom}`);
    if (userName) filters.push(`Creater Name: ${userName}`);
    if (showClosed) filters.push(`Closed Queries`);
    if (studentName) filters.push(`StudentName : ${studentName}`);
    if (branch) filters.push(`Branch: ${branch}`);
    return filters.length > 0 ? filters.join(" | ") : "No filters applied.";
  };

  const startIndex = (page - 1) * limit;
  const safeTotalPages = Math.max(1, totalPages);
  const displayedFrom = totalCount === 0 ? 0 : startIndex + 1;
  const displayedTo = Math.min(totalCount, startIndex + allquery.length);
  const sortedQueries = useMemo(
    () => [...allquery].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [allquery]
  );
  const isEmptyState = !loading && sortedQueries.length === 0;
  const skeletonRowCount = Math.min(limit, 10);
  const tableColumnCount = 15;



  const handleReferenceChange = (e) => {
    const selectedName = e.target.value;
    setReferenceId(selectedName);
    const reference = referenceData.find((data) => data.referencename === selectedName);
    setSelectedReference(reference || null);
  };
  return (
    <>
      <div className="text-3xl font-bold text-center text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 py-4 rounded-t-xl shadow-md">
        Overview
      </div>
      <div className="mt-8 container lg:w-[98%] mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white/80 p-5 shadow-lg ring-1 ring-gray-100 backdrop-blur">
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wider">Total Queries</p>
            <p className="text-3xl font-bold text-gray-900">{loading ? "…" : totalCount}</p>
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Active Filters</p>
            <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/80 px-4 py-3 text-sm text-blue-900">
              {getFilterSummary()}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={removeFilter}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
            >
              Clear Filters
            </button>
            <button
              onClick={exportToExcel}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-500"
            >
              Export to Excel
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 text-sm text-gray-700">
          <span>
            Showing {displayedFrom}-{displayedTo} of {totalCount} results
          </span>
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={handleLimitChange}
              className="border rounded px-2 py-1 text-gray-800 focus:outline-none focus:ring-0"
            >
              {[25, 50, 100, 200].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className={`px-3 py-1 rounded border ${page === 1 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
            >
              Previous
            </button>
            <span>
              Page {page} of {safeTotalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= safeTotalPages}
              className={`px-3 py-1 rounded border ${page >= safeTotalPages
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
            >
              Next
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between mb-4">
          <label className="flex items-center text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={showClosed === "close"}
              onChange={() => setShowClosed(showClosed === "close" ? "" : "close")}
              className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded"
            />
            Show Only Closed Queries
          </label>
        </div>
        <div
          ref={tableWrapperRef}
          className="shadow-xl rounded-2xl border border-gray-200 bg-white overflow-x-auto max-h-[70vh] overflow-y-auto scroll-smooth"
        >
          <table className="min-w-full text-left text-[12px] font-light border-collapse">
            <thead className="bg-gray-800 text-white">
              <tr className="divide-x divide-gray-700">
                <th className="px-4 py-3 text-[12px]">S/N</th>
                <th className="px-4 py-3 text-[12px]">Staff Name
                  <select
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-5 ms-2  text-gray-800  border focus:ring-0 focus:outline-none"
                  >
                    <option value="">All</option>
                    {user.map((data) => (
                      <option key={data._id} value={data.name}>
                        {data.name}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="px-4 py-3 text-[12px]">
                  Student Name
                  <div className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      id="nullCheck"
                      className="mr-2"
                      onChange={(e) => setStudentName("Null")}
                    />
                    <label htmlFor="nullCheck" className="text-[12px]">Null</label>
                  </div>
                </th>
                <th className="px-4 py-3 text-[12px]">Phone No.</th>
                <th className="px-4 py-3 text-[12px]">Contacts</th>
                <th className="px-4 py-3 text-[12px] ">Reference
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
                <th className="px-4 py-3 text-[12px] ">Branch
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-5 ms-2  text-gray-800  border focus:ring-0 focus:outline-none"
                  >
                    <option value="">All</option>
                    {branches.map((data, index) => (
                      <option key={index} value={data.branch_name}>
                        {data.branch_name}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="px-4 py-3 text-[12px]">City
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className=" w-5 ms-2  text-gray-800  border focus:ring-0 focus:outline-none"
                  >
                    <option value="">All</option>
                    <option value="Jaipur">Jaipur</option>
                    <option value="out">Out Of Jaipur</option>
                    <option value="Not_Provided">Not Provided</option>
                  </select>
                </th>
                <th className="px-4 py-3 text-[12px]">Grade
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-5 ms-2  text-gray-800  border focus:ring-0 focus:outline-none"
                  >
                    <option value="">All</option>
                    <option value="H">Important</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </th>
                <th className="px-4 py-3 text-[12px]">Assigned From
                  <select
                    value={assignedFrom}
                    onChange={(e) => setAssignedFrom(e.target.value)}
                    className="w-5 ms-2  text-gray-800  border focus:ring-0 focus:outline-none"
                  >
                    <option value="">All</option>
                    <option value="Not-Assigned">Not Assigned</option>
                    {user.map((data) => (
                      <option key={data._id} value={data.name}>
                        {data.name}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="px-4 py-3 text-[12px]">Assigned To
                  <select
                    value={assignedName}
                    onChange={(e) => setAssignedName(e.target.value)}
                    className="w-5 ms-2  text-gray-800  border focus:ring-0 focus:outline-none"
                  >
                    <option value="">All</option>
                    <option value="Not-Assigned">Not Assigned</option>
                    {user.map((data) => (
                      <option key={data._id} value={data.name}>
                        {data.name}
                      </option>
                    ))}
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

                {showClosed === "close" ? (
                  <>
                    <th className="px-4 py-3 text-[12px] relative">

                      <div ref={dropdownRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setDropdownOpen(!dropdownOpen)}
                          className="ms-2 px-2 py-1 text-white border rounded-md text-left focus:ring-0 focus:outline-none"
                        >
                          <span>Reason</span>
                        </button>

                        {dropdownOpen && (
                          <div className="absolute left-0 mt-2 w-52 bg-white border rounded-md shadow-md z-10">
                            <div className="p-2 max-h-48 overflow-y-auto">
                              {options.map((option) => (
                                <label key={option.value} className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    value={option.value}
                                    checked={reason.includes(option.value)}
                                    onChange={(e) => toggleOption(e.target.value)}
                                    className="w-4 h-4"
                                  />
                                  <span className="text-sm text-gray-800">{option.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 text-[12px]">Stage</th>
                  </>
                )}

                <th className="px-4 py-3 text-[12px]">Enroll
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
              {loading &&
                Array.from({ length: skeletonRowCount }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="animate-pulse">
                    {Array.from({ length: tableColumnCount }).map((__, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-4">
                        <div className="h-3 rounded-full bg-gray-200" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!loading &&
                sortedQueries.map((data, index) => (
                  <tr
                    key={data._id || index}
                    className="odd:bg-gray-50 even:bg-gray-100 hover:bg-blue-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-[12px]">{startIndex + index + 1}</td>
                    <td className="px-4 py-3 text-[12px]">{data.userid}</td>
                    <td className="px-4 py-3 text-[12px] text-blue-500">

                      <button onClick={() => handleOpenModal(`${data._id}`)}>
                        {data.studentName || "N/A"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-[12px]">{data.studentContact.phoneNumber}</td>
                    <td className="px-4 py-3 text-[12px]"> {data.historyCount}</td>
                    <td className="px-4 py-3 text-[12px]">{data.referenceid} {data.suboption}</td>
                    <td className="px-4 py-3 text-[12px] relative">
                      <span className="overflow-hidden whitespace-nowrap text-ellipsis">{data.lastmessage?.slice(0, 12)}...</span>
                      <div className="absolute cursor-pointer left-0 bottom-0 bg-gray-800 text-white p-2 rounded-md opacity-0 transition-opacity hover:opacity-100 max-w-xs w-48">
                        {data.lastmessage}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px]">{data.branch}</td>
                    <td className="px-4 py-3 text-[12px]">{data.studentContact.city}</td>
                    <td className="px-4 py-3 text-[12px]">{data.lastgrade}</td>
                    <td className="px-4 py-3 text-[12px]">{data.assignedsenthistory}</td>
                    <td className="px-4 py-3 text-[12px]">{data.assignedreceivedhistory}</td>
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

                    {showClosed === "close" ? (
                      <>
                        <td className="px-4 py-3 text-[12px] relative">
                          <span className="overflow-hidden whitespace-nowrap text-ellipsis">{data.reason?.slice(0, 12) || "N/A"}</span>
                          <div className="absolute cursor-pointer left-0 bottom-0 bg-gray-800 text-white p-2 rounded-md opacity-0 transition-opacity hover:opacity-100 max-w-xs w-48">
                            {data.reason || "N/A"}
                          </div>
                        </td>
                      </>
                    ) : (
                      <>

                        <td className="px-4 py-3 text-[12px]">
                          {data.stage === 1
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
                      </>
                    )}

                    <td className="px-4 py-3 text-[12px]">{data.addmission ? "Enrolled" : "Not Enrolled"}</td>
                  </tr>
                ))}
              {isEmptyState && (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-sm text-gray-500">
                    No data available for current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div >
      </div>
      {isModalOpen && (
        <div className="fixed bg-white inset-0 z-50 flex items-center justify-center  overflow-auto">
          <div className="   h-screen w-screen  relative">
            <button
              className="absolute top-0 text-3xl bg-red-200 hover:bg-red-600 rounded-bl-full w-16 flex justify-center items-center  right-0 border text-white"
              onClick={handleCloseModal}
            >
              &times;
            </button>
            <div><Queryreport55 id={activeQuery} /></div>
          </div>
        </div>
      )}

    </>
  );
}
