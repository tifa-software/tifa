"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import Loader from "@/components/Loader/Loader";
import BulkAssign from "@/components/BulkAssign/BulkAssign";
import { ArrowLeft, ArrowRight, Search, Trash2, CirclePlus, Filter, X, Send, XCircleIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";

// Utility: build API URL with query params
function buildApiUrl({ userid, page = 1, deadlineFilter = "", grade = "", search = "", customDate = "", rangeStart = "", rangeEnd = "", assignedFrom = "" }) {
  const params = new URLSearchParams();
  params.set("autoclosed", "close");
  params.set("page", String(page));
  if (deadlineFilter) params.set("deadlineFilter", deadlineFilter);
  if (deadlineFilter === "custom" && customDate) {
    params.set("deadlineDate", customDate);
  }
  if (deadlineFilter === "dateRange" && rangeStart && rangeEnd) {
    params.set("deadlineFrom", rangeStart);
    params.set("deadlineTo", rangeEnd);
  }
  if (grade) params.set("grade", grade);
  if (search) params.set("search", search);
  if (assignedFrom) params.set("assignedFrom", assignedFrom);
  return `/api/queries/fetchall-byuser/${encodeURIComponent(userid)}?${params.toString()}`;
}

export default function AllQuery() {
  const router = useRouter();
  const { data: session } = useSession();

  // ---- Admin data state ----
  const [adminData, setAdminData] = useState(null);
  const [adminLoading, setAdminLoading] = useState(true);

  // ---- Data state ----
  const [queries, setQueries] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBootLoading, setIsBootLoading] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  // ---- UI state ----
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedqueries, setSelectedqueries] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterByGrade, setFilterByGrade] = useState("");
  const [filterAssignedFrom, setFilterAssignedFrom] = useState("");
  const [deadlineFilter, setDeadlineFilter] = useState("");
  const [customDate, setCustomDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  // Sentinel for infinite scroll
  const sentinelRef = useRef(null);

  const handleRowClick = (id) => router.push(`/staff/page/allquery/${id}`);
  const toggleFilterPopup = () => setIsFilterOpen((v) => !v);

  // Fetch admin data
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const response = await axios.get(`/api/admin/find-admin-byemail/${session?.user?.email}`);
        setAdminData(response.data._id);
      } catch (err) {
        console.error("Error fetching admin data:", err);
      } finally {
        setAdminLoading(false);
      }
    };

    if (session?.user?.email) fetchAdminData();
  }, [session]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Map helpers
  const findAdminNameById = useCallback(
    (id) => {
      const found = admins?.find((a) => a._id === id);
      return found?.name || "";
    },
    [admins]
  );

  // --- Filter → (Re)load from server (page=1) ---
  const fetchFirstPageWithFilters = useCallback(async () => {
    if (!adminData) return;

    setIsBootLoading(true);
    setSelectedqueries([]);
    setHasMore(false);
    setPage(1);
    const effectiveDeadlineFilter =
      deadlineFilter === "custom" && !customDate
        ? ""
        : deadlineFilter === "dateRange" && (!startDate || !endDate)
          ? ""
          : deadlineFilter;

    try {
      const url = buildApiUrl({
        userid: adminData,
        page: 1,
        deadlineFilter: effectiveDeadlineFilter,
        customDate,
        rangeStart: startDate,
        rangeEnd: endDate,
        grade: filterByGrade,
        search: debouncedSearchTerm,
        assignedFrom: filterAssignedFrom,
      });

      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      const list = json?.data ?? [];

      // Update admins from API response
      if (json?.admins) {
        setAdmins(json.admins);
      }

      // Set total count from backend
      setTotalCount(json?.total ?? 0);

      setQueries(list);
      setPage(json?.page ?? 1);
      setHasMore((json?.totalPages ?? 1) > (json?.page ?? 1));
    } catch (e) {
      console.error("Filter load failed:", e);
    } finally {
      setIsBootLoading(false);
    }
  }, [adminData, deadlineFilter, customDate, startDate, endDate, filterByGrade, debouncedSearchTerm, filterAssignedFrom]);

  // Apply filters on change
  useEffect(() => {
    if (adminData) {
      fetchFirstPageWithFilters();
    }
  }, [fetchFirstPageWithFilters]);

  // ---- Infinite scroll loader ----
  const loadMore = useCallback(async () => {
    if (isLoading || isBootLoading || !hasMore || !adminData) return;
    setIsLoading(true);
    const effectiveDeadlineFilter =
      deadlineFilter === "custom" && !customDate
        ? ""
        : deadlineFilter === "dateRange" && (!startDate || !endDate)
          ? ""
          : deadlineFilter;

    try {
      const nextPage = page + 1;
      const url = buildApiUrl({
        userid: adminData,
        page: nextPage,
        deadlineFilter: effectiveDeadlineFilter,
        customDate,
        rangeStart: startDate,
        rangeEnd: endDate,
        grade: filterByGrade,
        search: debouncedSearchTerm,
        assignedFrom: filterAssignedFrom,
      });

      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      const newData = json?.data ?? [];

      setQueries((prev) => [...prev, ...newData]);
      setPage(json?.page ?? nextPage);
      setHasMore((json?.totalPages ?? nextPage) > (json?.page ?? nextPage));
    } catch (e) {
      console.error("Pagination failed:", e);
    } finally {
      setIsLoading(false);
    }
  }, [page, isLoading, isBootLoading, hasMore, adminData, deadlineFilter, customDate, startDate, endDate, filterByGrade, debouncedSearchTerm, filterAssignedFrom]);

  // IntersectionObserver for sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) loadMore();
      },
      { root: null, rootMargin: "600px 0px 600px 0px", threshold: 0 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  // ---- Bulk actions ----
  const handleSelectquerie = (id) => {
    setSelectedqueries((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBulkDelete = async () => {
    const ok = window.confirm("Are you sure you want to Send in Trash this Queries?");
    if (!ok) return;
    try {
      await axios.delete("/api/queries/trash", { data: { ids: selectedqueries } });
      setQueries((prev) => prev.filter((q) => !selectedqueries.includes(q._id)));
      setSelectedqueries([]);
      alert("Queries Send in Trash successfully");
    } catch (e) {
      console.error(e);
      alert(String(e));
    }
  };

  const handleBulkAssign = () => {
    const ok = window.confirm("Are you sure you want to Assign these Queries?");
    if (!ok) return;
    setIsModalOpen(true);
    setModalData({ ids: selectedqueries });
  };

  const handleremovebulk = () => setIsModalOpen(false);

  if (adminLoading) {
    return (
      <div className="container lg:w-[95%] mx-auto py-5">
        <div className="flex justify-center items-center h-[400px]">
          <Loader />
        </div>
      </div>
    );
  }

  if (!adminData) {
    return (
      <div className="container lg:w-[95%] mx-auto py-5">
        <div className="text-center text-gray-500">Admin data not available</div>
      </div>
    );
  }

  return (
    <div className="container lg:w-[95%] mx-auto py-5">
      {/* Filters + Actions */}
      <div className="flex justify-between items-center mb-4">
        <div className="relative w-1/3">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Search By Student Name , Reference and Phone Number"
            className="border px-3 py-2 pl-10 text-sm focus:outline-none w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button className="lg:hidden text-gray-600 px-3 py-2 border rounded-md" onClick={toggleFilterPopup}>
          <Filter size={16} />
        </button>

        {/* Mobile Filters */}
        {isFilterOpen && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-50 z-50">
            <div className="fixed top-0 right-0 w-64 h-full bg-white shadow-lg p-4 z-50">
              <button className="text-gray-600 mb-4" onClick={toggleFilterPopup}>
                <X size={20} />
              </button>

              <div className="flex flex-col space-y-3">
                <select
                  className="border px-3 py-2 focus:outline-none text-sm"
                  value={filterAssignedFrom}
                  onChange={(e) => setFilterAssignedFrom(e.target.value)}
                >
                  <option value="">All Assigned</option>
                  {Array.from(
                    new Set(
                      queries
                        .flatMap((querie) => {
                          const history = querie.assignedreceivedhistory;
                          return Array.isArray(history) ? history : history ? [history] : [];
                        })
                        .filter((id) => id)
                    )
                  )
                    .map((assignedFrom) => {
                      const adminName = findAdminNameById(assignedFrom);
                      return adminName ? { id: assignedFrom, name: adminName } : null;
                    })
                    .filter((option) => option !== null)
                    .map((option, index) => (
                      <option key={index} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                </select>

                <select
                  className="border px-3 py-2 focus:outline-none text-sm"
                  value={deadlineFilter}
                  onChange={(e) => setDeadlineFilter(e.target.value)}
                >
                  <option value="" disabled>
                    Trash Date
                  </option>
                  <option value="">All</option>
                  <option value="today">Today</option>
                  <option value="tomorrow">Tomorrow</option>
                  <option value="dayAfterTomorrow">Day After Tomorrow</option>
                  <option value="past">Past Date</option>
                  <option value="custom">Custom Date</option>
                  <option value="dateRange">Date-to-Date</option>
                </select>

                {deadlineFilter === "custom" && (
                  <input
                    type="date"
                    className="border px-3 py-2 focus:outline-none text-sm"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                  />
                )}

                {deadlineFilter === "dateRange" && (
                  <div className="flex space-x-2">
                    <input
                      type="date"
                      className="border px-3 py-2 focus:outline-none text-sm"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    <div className="flex items-center text-xs">to</div>
                    <input
                      type="date"
                      className="border px-3 py-2 focus:outline-none text-sm"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                )}

                {/* <Link href={"/staff/page/importquery"}>
                  <button className="bg-[#29234b] rounded-md flex items-center text-white text-sm px-4 py-2 ">
                    <CirclePlus size={16} className="me-1" /> Import Query
                  </button>
                </Link>
                <Link href={"/staff/page/addquery"}>
                  <button className="bg-[#29234b] rounded-md flex items-center text-white text-sm px-4 py-2">
                    <CirclePlus size={16} className="me-1" /> Add Query
                  </button>
                </Link> */}

                {/* <button
                  className="text-red-500 rounded-md border border-red-500 px-3 py-2"
                  onClick={handleBulkDelete}
                  disabled={selectedqueries.length === 0}
                >
                  <Trash2 size={16} />
                </button> */}
              </div>
            </div>
          </div>
        )}

        {/* Desktop Filters */}
        <div className="hidden lg:flex flex-wrap space-x-3">
          <select
            className="border px-3 py-2 focus:outline-none text-sm"
            value={filterAssignedFrom}
            onChange={(e) => setFilterAssignedFrom(e.target.value)}
          >
            <option value="">All Assigned</option>
            {Array.from(
              new Set(
                queries
                  .flatMap((querie) => {
                    const history = querie.assignedreceivedhistory;
                    return Array.isArray(history) ? history : history ? [history] : [];
                  })
                  .filter((id) => id)
              )
            )
              .map((assignedFrom) => {
                const adminName = findAdminNameById(assignedFrom);
                return adminName ? { id: assignedFrom, name: adminName } : null;
              })
              .filter((option) => option !== null)
              .map((option, index) => (
                <option key={index} value={option.id}>
                  {option.name}
                </option>
              ))}
          </select>

          <select
            value={filterByGrade}
            onChange={(e) => setFilterByGrade(e.target.value)}
            className="px-2 py-1 border"
          >
            <option value="">All Grades</option>
            <option value="H">Important</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="Null">Null</option>

          </select>

          <div className="relative">
            <select
              className="border px-3 py-2 focus:outline-none text-sm"
              value={deadlineFilter}
              onChange={(e) => setDeadlineFilter(e.target.value)}
            >
              <option value="" disabled>
                Trash Date
              </option>
              <option value="">All</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="dayAfterTomorrow">Day After Tomorrow</option>
              <option value="past">Past Date</option>
              <option value="custom">Custom Date</option>
              <option value="dateRange">Date-to-Date</option>
            </select>

            {deadlineFilter === "custom" && (
              <div className="absolute mt-2">
                <input
                  type="date"
                  className="border px-3 py-2 focus:outline-none text-sm bg-white"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                />
              </div>
            )}

            {deadlineFilter === "dateRange" && (
              <div className="flex space-x-2 absolute bg-white border border-black p-2 mt-2 rounded">
                <input
                  type="date"
                  className="border px-3 py-2 focus:outline-none text-sm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <div className="flex items-center">to</div>
                <input
                  type="date"
                  className="border px-3 py-2 focus:outline-none text-sm"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* <Link href={"/staff/page/importquery"}>
            <button className="bg-[#29234b] rounded-md flex items-center text-white text-sm px-4 py-2 ">
              <CirclePlus size={16} className="me-1" /> Import Query
            </button>
          </Link>

          <Link href={"/staff/page/addquery"}>
            <button className="bg-[#29234b] rounded-md flex items-center text-white text-sm px-4 py-2 ">
              <CirclePlus size={16} className="me-1" /> Add Query
            </button>
          </Link> */}

          {/* <button
            className="text-red-500 rounded-md border border-red-500 px-3 py-2"
            onClick={handleBulkDelete}
            disabled={selectedqueries.length === 0}
          >
            <Trash2 size={16} />
          </button>

          <button
            className="text-blue-500 rounded-md border border-blue-500 hover:bg-blue-200 duration-150 cursor-pointer px-3 py-2"
            onClick={handleBulkAssign}
            disabled={selectedqueries.length === 0}
          >
            <Send size={16} />
          </button> */}

          {isModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
                <div className="flex justify-end">
                  <button onClick={handleremovebulk}>
                    <XCircleIcon className="text-red-600" />
                  </button>
                </div>
                <BulkAssign onClose={() => setIsModalOpen(false)} data={modalData} initialData={modalData} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Header stats + Legend */}
      <div className="flex flex-wrap justify-between gap-4 mt-2 text-sm py-1">
        <div>
          <div className="flex items-center gap-1 bg-gray-200 px-2 rounded-md">
            <span>Total Queries =</span>
            <span className="font-semibold">{totalCount}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full animate-blink"></span>
            <span className="text-gray-600">Past Due</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500"></span>
            <span className="text-gray-600">Due Today</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#fcccba]"></span>
            <span className="text-gray-600">Due Tomorrow</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#ffe9bf]"></span>
            <span className="text-gray-600">Due Day After Tomorrow</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#6cb049]"></span>
            <span className="text-gray-600">Enrolled</span>
          </div>
        </div>
      </div>

      {/* Table */}   <div className="relative max-h-[600px] overflow-y-auto shadow-md bg-white border border-gray-200">
        <table className="w-full text-sm text-left rtl:text-right text-gray-600 font-sans">
          <thead className="bg-[#29234b] text-white uppercase sticky top-0 z-20">
            <tr>
              <th scope="col" className="px-4 font-medium capitalize py-2">N/O</th>
              <th scope="col" className="px-4 font-medium capitalize py-2">Staff Name</th>
              <th scope="col" className="px-4 font-medium capitalize py-2">Student Name <span className="text-xs">(Reference)</span></th>
              <th scope="col" className="px-4 font-medium capitalize py-2">Branch</th>
              <th scope="col" className="px-4 font-medium capitalize py-2">Phone Number</th>
              <th scope="col" className="px-4 font-medium capitalize py-2">Grade</th>
              <th scope="col" className="px-4 font-medium capitalize py-2">Assigned from</th>
              <th scope="col" className="px-4 font-medium capitalize py-2">Assigned To</th>
              <th scope="col" className="px-4 font-medium capitalize py-2">Trash Date</th>
              <th scope="col" className="px-4 font-medium capitalize py-2">Address</th>
            </tr>
          </thead>

          <tbody>
            {isBootLoading && (
              <tr>
                <td colSpan="10" className="px-6 py-4">
                  <div className="flex justify-center items-center h-[200px]">
                    <Loader />
                  </div>
                </td>
              </tr>
            )}

            {!isBootLoading && queries.length === 0 && (
              <tr>
                <td colSpan="10" className="px-6 py-8 text-center text-gray-500">No queries available</td>
              </tr>
            )}

            {!isBootLoading &&
              queries.map((querie, index) => {
                const matchedUser = findAdminNameById(querie.userid) || "Tifa Admin";

                // Get the last element from the arrays
                const lastAssignedReceived = Array.isArray(querie.assignedreceivedhistory)
                  ? querie.assignedreceivedhistory[querie.assignedreceivedhistory.length - 1]
                  : querie.assignedreceivedhistory;
                const lastAssignedSent = Array.isArray(querie.assignedsenthistory)
                  ? querie.assignedsenthistory[querie.assignedsenthistory.length - 1]
                  : querie.assignedsenthistory;

                const matchedassignedUser = findAdminNameById(lastAssignedReceived);
                const matchedassignedsenderUser = findAdminNameById(lastAssignedSent);

                const today = new Date().toDateString();
                const deadlineDate = new Date(querie.deadline);
                const isToday = !isNaN(deadlineDate) && deadlineDate.toDateString() === today;
                const isPast = !isNaN(deadlineDate) && deadlineDate < new Date() && !isToday;
                const isTomorrow =
                  !isNaN(deadlineDate) &&
                  deadlineDate.toDateString() === new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();
                const isDayAfter =
                  !isNaN(deadlineDate) &&
                  deadlineDate.toDateString() === new Date(Date.now() + 48 * 60 * 60 * 1000).toDateString();

                let rowCls = "";
                if (querie.addmission) rowCls = "bg-[#fff] text-black";
                else if (isToday) rowCls = "bg-[#fff] text-black";
                else if (isPast) rowCls = "bg-[#fff] text-black";
                else if (isTomorrow) rowCls = "bg-[#fff] text-black";
                else if (isDayAfter) rowCls = "bg-[#fff] text-black";

                return (
                  <React.Fragment key={querie._id}>
                    <tr className={`border-b cursor-pointer transition-colors duration-200 relative ${rowCls}`}>
                      <td className="px-4 py-2 relative">
                        <input
                          type="checkbox"
                          checked={selectedqueries.includes(querie._id)}
                          onChange={() => handleSelectquerie(querie._id)}
                        />
                        <span className="ms-2">{index + 1}</span>
                      </td>

                      <td onClick={() => handleRowClick(querie._id)} className="px-4 py-2 text-[12px] font-semibold">
                        {matchedUser}
                      </td>

                      <td className="px-4 py-2 font-semibold text-sm whitespace-nowrap" onClick={() => handleRowClick(querie._id)}>
                        {querie.studentName} <span className="text-xs">({querie.referenceid})</span>
                      </td>

                      <td onClick={() => handleRowClick(querie._id)} className="px-4 py-2 text-[12px]">
                        {Array.isArray(querie.branch) ? querie.branch.join(", ") : querie.branch}
                      </td>

                      <td onClick={() => handleRowClick(querie._id)} className="px-4 py-2 text-[12px]">
                        {querie?.studentContact?.phoneNumber}
                      </td>
                      
                                            <td
                                              onClick={() => handleRowClick(querie._id)}
                                              className="px-4 py-2 text-[12px]"
                                            >
                                              <div className="flex items-center gap-2 whitespace-nowrap">
                                                <span>{querie.lastgrade}</span>
                      
                                                {querie.lastgrade === "H" && (
                                                  <span >
                                                    <Image src="/image/images.jpeg" width={64.4} height={38.7} />
                                                  </span>
                                                )}
                                              </div>
                                            </td>

                      <td onClick={() => handleRowClick(querie._id)} className="px-4 py-2 text-[12px]">
                        {matchedassignedsenderUser}
                      </td>

                      <td onClick={() => handleRowClick(querie._id)} className="px-4 py-2 text-[12px]">
                        {matchedassignedUser}
                      </td>

                      <td onClick={() => handleRowClick(querie._id)} className="px-4 py-2 text-[12px]">
                        {(() => {
                          const d = new Date(querie.updatedAt);
                          if (isNaN(d.getTime())) return querie.updatedAt || "";
                          const dd = String(d.getDate()).padStart(2, "0");
                          const mm = String(d.getMonth() + 1).padStart(2, "0");
                          const yy = String(d.getFullYear()).slice(-2);
                          return `${dd}-${mm}-${yy}`;
                        })()}
                      </td>

                      <td onClick={() => handleRowClick(querie._id)} className="px-4 py-2 text-[12px]">
                        {querie?.studentContact?.address}
                      </td>

                      <span className="absolute right-0 top-0 bottom-0 flex items-center">
                        {!querie.addmission &&
                          (new Date(querie.lastDeadline) < new Date() &&
                            new Date(querie.lastDeadline).toDateString() !== new Date().toDateString() ? (
                            <span className="inline-flex items-center px-2 text-[10px] font-semibold text-red-600 bg-red-200 rounded-full shadow-md">
                              ✖️ Today Update
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 text-[10px] font-semibold text-green-600 bg-green-200 rounded-full shadow-md">
                              ✔️ Checked
                            </span>
                          ))}
                      </span>
                    </tr>

                    <tr className="border-b bg-gray-200">
                      <td colSpan="10" className="px-4">
                        <div className="flex flex-wrap gap-4">
                          <p className="font-bold text-xs">Last Action</p>
                          <p className="text-xs">
                            <strong>Action By = </strong>
                            {querie.lastactionby}
                          </p>
                          <ul>
                            <li className="text-xs">
                              <strong>Message = </strong>
                              {querie.lastmessage !== "null" ? querie.lastmessage : querie.notes}
                            </li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}

            {/* Skeleton Loading Rows */}
            {isLoading && !isBootLoading && (
              <>
                {[...Array(3)].map((_, i) => (
                  <React.Fragment key={`skeleton-${i}`}>
                    <tr className="border-b animate-pulse">
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded w-12"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded w-8"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 rounded w-28"></div>
                      </td>
                    </tr>
                    <tr className="border-b bg-gray-100">
                      <td colSpan="10" className="px-4 py-2">
                        <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </>
            )}

            {/* Infinite scroll sentinel */}
            {!isBootLoading && (
              <tr>
                <td colSpan="10" className="px-6 py-4">
                  <div ref={sentinelRef} className="w-full flex items-center justify-center">
                    {isLoading ? null : hasMore ? <span className="text-xs text-gray-400">Scroll to load more…</span> : <span className="text-xs text-gray-400">— End —</span>}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
