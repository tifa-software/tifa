"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Loader from "@/components/Loader/Loader";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import Queryreport55 from "@/app/main/component/queryreport/Queryreport55"
import { Trash2 } from "lucide-react";
import { useSession } from 'next-auth/react';

const initialFilters = {
    staffId: "",
    studentName: "",
    phoneNumber: "",
    courseId: "",
    assignedToId: "",
    branch: "",
    city: "",
    finalFees: "",
    zeroFilter: "",
};

const limitOptions = [25, 50, 100, 200];

export default function AddmissionRegister() {
    const router = useRouter();
    const [queries, setQueries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
  const { data: session } = useSession();

    const [adminList, setAdminList] = useState([]);
    const [courseList, setCourseList] = useState([]);
    const [referenceData, setReferenceData] = useState([]);

    const [filters, setFilters] = useState(initialFilters);
    const [debouncedFilters, setDebouncedFilters] = useState(initialFilters);
    const [referenceId, setReferenceId] = useState("");
    const [suboption, setSuboption] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [selectedqueries, setSelectedqueries] = useState([]);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [totalCount, setTotalCount] = useState(0);
    const [totalTrash, setTotalTrash] = useState(0);
    const [totalEnroll, setTotalEnroll] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeQuery, setActiveQuery] = useState(null);
    const handleOpenModal = (queryContent) => {
        setActiveQuery(queryContent);
        setIsModalOpen(true);
    };
    const [adminData, setAdminData] = useState("");
    
      useEffect(() => {
        const fetchAdminData = async () => {
          try {
            const response = await axios.get(`/api/admin/find-admin-byemail/${session?.user?.email}`);
            setAdminData(response.data.branch); // Make sure response.data contains branch and _id
          } catch (err) {
            setError(err.message);
          } finally {
            setLoading(false);
          }
        };
    
        if (session?.user?.email) fetchAdminData();
      }, [session]);
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setActiveQuery(null);
    };
    // Debounce text input filters (studentName, phoneNumber, branch, city, finalFees)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedFilters(filters);
        }, 500); // Wait 500ms after user stops typing

        return () => clearTimeout(timer);
    }, [filters]);

    const selectedReference = useMemo(
        () => referenceData.find((ref) => ref.referencename === referenceId) || null,
        [referenceData, referenceId]
    );

    const adminIdToName = useMemo(() => {
        return adminList.reduce((acc, admin) => {
            acc[admin._id] = admin.name;
            return acc;
        }, {});
    }, [adminList]);

    const courseIdToName = useMemo(() => {
        return courseList.reduce((acc, course) => {
            acc[course._id] = course.course_name;
            return acc;
        }, {});
    }, [courseList]);

    const fetchAdmissionReport = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const params = {
                page,
                limit,
                referenceId,
                suboption,
                fromDate,
                toDate,
                staffId: filters.staffId, // Select dropdowns are immediate
                zeroFilter: debouncedFilters.zeroFilter, // Text inputs are debounced
                studentName: debouncedFilters.studentName, // Text inputs are debounced
                phoneNumber: debouncedFilters.phoneNumber,
                courseId: filters.courseId, // Select dropdowns are immediate
                assignedToId: filters.assignedToId, // Select dropdowns are immediate
                branch: adminData, // Text inputs are debounced
                city: debouncedFilters.city, // Text inputs are debounced
                finalFees: debouncedFilters.finalFees, // Text inputs are debounced
            };

            const cleanedParams = Object.fromEntries(
                Object.entries(params).filter(
                    ([, value]) => value !== "" && value !== null && value !== undefined
                )
            );

            const response = await axios.get("/api/report/demo/5", {
                params: cleanedParams,
            });

            setQueries(response.data.fetch || []);
            setAdminList(response.data.allAdmins || []);
            setCourseList(response.data.allCourses || []);
            setReferenceData(response.data.allReferences || []);

            const pagination = response.data.pagination;
            if (pagination) {
                setTotalCount(pagination.total || 0);
                setTotalTrash(pagination.totalTrash || 0);
                setTotalEnroll(pagination.totalEnroll || 0);
                setTotalPages(pagination.totalPages || 1);
            } else {
                setTotalCount(response.data.fetch?.length || 0);
                setTotalTrash(response.data.fetch?.length || 0);
                setTotalEnroll(response.data.fetch?.length || 0);
                setTotalPages(1);
            }
        } catch (fetchError) {
            console.error("Error fetching admission data:", fetchError);
            setError("Unable to fetch data. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [
        page,
        limit,
        referenceId,
        suboption,
        fromDate,
        toDate,
        filters.staffId, // Select dropdowns are immediate
        debouncedFilters.zeroFilter, // Text inputs are debounced
        debouncedFilters.studentName, // Text inputs are debounced
        debouncedFilters.phoneNumber,
        filters.courseId, // Select dropdowns are immediate
        filters.assignedToId, // Select dropdowns are immediate
        adminData,
        debouncedFilters.city, // Text inputs are debounced
        debouncedFilters.finalFees, // Text inputs are debounced
    ]);

    useEffect(() => {
         if (!adminData) return;
        fetchAdmissionReport();
    }, [fetchAdmissionReport]);
    useEffect(() => {
        setSelectedqueries((prev) =>
            prev.filter((id) => queries.some((q) => q._id === id))
        );
    }, [queries]);
    const handleBulkDelete = async () => {
        if (selectedqueries.length === 0) {
            alert("Please select at least one query.");
            return;
        }

        const ok = window.confirm(
            "Are you sure you want to send these queries to Trash?"
        );
        if (!ok) return;
        try {
            await axios.delete("/api/queries/trash", { data: { ids: selectedqueries } });
            setQueries((prev) => prev.filter((q) => !selectedqueries.includes(q._id)));
            setSelectedqueries([]);
            alert("Queries sent to Trash successfully");
        } catch (e) {
            console.error(e);
            alert(String(e));
        }
    };

    useEffect(() => {
        setPage(1);
    }, [
        referenceId,
        suboption,
        fromDate,
        toDate,
        filters.staffId, // Select dropdowns are immediate
        debouncedFilters.zeroFilter, // Text inputs are debounced
        debouncedFilters.studentName, // Text inputs are debounced
        debouncedFilters.phoneNumber,
        filters.courseId, // Select dropdowns are immediate
        filters.assignedToId, // Select dropdowns are immediate
        debouncedFilters.branch, // Text inputs are debounced
        debouncedFilters.city, // Text inputs are debounced
        debouncedFilters.finalFees, // Text inputs are debounced
    ]);

    const handleFilterChange = (key) => (event) => {
        const value = event.target.value;
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const handleReferenceChange = (event) => {
        const value = event.target.value;
        setReferenceId(value);
        setSuboption("");
    };

    const handleRowClick = (id) => {
        router.push(`/main/page/allquery/${id}`);
    };

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(queries);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Admission Report");
        XLSX.writeFile(workbook, "admission-report.xlsx");
    };

    const removeFilter = () => {
        setFilters(initialFilters);
        setReferenceId("");
        setSuboption("");
        setFromDate("");
        setToDate("");
        setPage(1);
    };

    const handleLimitChange = (event) => {
        setLimit(Number(event.target.value));
        setPage(1);
    };

    const handlePageChange = (newPage) => {
        if (newPage < 1 || newPage > totalPages) return;
        setPage(newPage);
    };
    const allSelected =
        queries.length > 0 && selectedqueries.length === queries.length;

    const handleSelectAll = (e) => {
        const checked = e.target.checked;
        if (checked) {
            setSelectedqueries(queries.map((q) => q._id));
        } else {
            setSelectedqueries([]);
        }
    };

    const handleSelectOne = (id) => (e) => {
        e.stopPropagation(); // don't trigger row click
        const checked = e.target.checked;
        setSelectedqueries((prev) =>
            checked ? [...prev, id] : prev.filter((x) => x !== id)
        );
    };
    const safeTotalPages = Math.max(1, totalPages);
    const displayedFrom = totalCount === 0 ? 0 : (page - 1) * limit + 1;
    const displayedTo = Math.min(totalCount, (page - 1) * limit + queries.length);

    const filterSummary = useMemo(() => {
        const summary = [];
        if (filters.staffId) {
            summary.push(`Staff: ${adminIdToName[filters.staffId] || "Unknown"}`);
        }
        if (debouncedFilters.zeroFilter) {
            summary.push(`Zero Filter: ${debouncedFilters.zeroFilter}`);
        }
        if (filters.assignedToId) {
            summary.push(`Assigned To: ${adminIdToName[filters.assignedToId] || "Unknown"}`);
        }
        if (debouncedFilters.studentName) {
            summary.push(`Student: ${debouncedFilters.studentName}`);
        }
        if (debouncedFilters.phoneNumber) {
            summary.push(`Phone: ${debouncedFilters.phoneNumber}`);
        }
        if (filters.courseId) {
            summary.push(`Course: ${courseIdToName[filters.courseId] || "Selected"}`);
        }
        if (referenceId) {
            summary.push(`Reference: ${referenceId}`);
        }
        if (suboption) {
            summary.push(`Suboption: ${suboption}`);
        }
        if (debouncedFilters.branch) {
            summary.push(`Branch: ${debouncedFilters.branch}`);
        }
        if (debouncedFilters.city) {
            summary.push(`City: ${debouncedFilters.city}`);
        }
        if (fromDate || toDate) {
            summary.push(`Date: ${fromDate || "..."} → ${toDate || "..."}`);
        }
        if (debouncedFilters.finalFees) {
            summary.push(`Final Fees: ${debouncedFilters.finalFees}`);
        }
        return summary.length ? summary.join(" | ") : "No filters applied.";
    }, [
        filters.staffId,
        debouncedFilters.zeroFilter,
        filters.assignedToId,
        debouncedFilters.studentName,
        debouncedFilters.phoneNumber,
        filters.courseId,
        debouncedFilters.branch,
        debouncedFilters.city,
        debouncedFilters.finalFees,
        referenceId,
        suboption,
        fromDate,
        toDate,
        adminIdToName,
        courseIdToName,
    ]);

    return (
        <>
            <div className="text-3xl font-bold text-center text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 py-4 rounded-t-xl shadow-md">
                Demo  Report
            </div>

            <div className="mt-8 container lg:w-[98%] mx-auto space-y-6">
                <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white/90 p-5 shadow-lg ring-1 ring-gray-100 backdrop-blur">
                    <div className="bg-white p-4 rounded-xl shadow-sm space-y-2">
  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
    Summary
  </p>

  <div className="space-y-1">
    <p className="text-sm font-medium text-gray-700 flex justify-between">
      <span>Total Demo =</span>
      <span className="font-bold text-gray-900">
        {loading ? "…" : totalCount}
      </span>
    </p>

    <p className="text-sm font-medium text-gray-700 flex justify-between">
      <span>Total Enroll =</span>
      <span className="font-bold text-gray-900">
        {loading ? "…" : totalEnroll}
      </span>
    </p>

    <p className="text-sm font-medium text-gray-700 flex justify-between">
      <span>Total Trash =</span>
      <span className="font-bold text-gray-900">
        {loading ? "…" : totalTrash}
      </span>
    </p>
  </div>
</div>

                    <div className="flex-1 min-w-[240px]">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                            Active Filters
                        </p>
                        <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/80 px-4 py-3 text-sm text-blue-900">
                            {filterSummary}
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
                            Export
                        </button>
                    </div>
                </section>

                <section className="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-700">
                    <span>
                        Showing {displayedFrom}-{displayedTo} of {totalCount} results
                    </span>
                    <div className="flex items-center gap-2">
                        <span>Rows:</span>
                        <select
                            value={limit}
                            onChange={handleLimitChange}
                            className="border rounded px-2 py-1 text-gray-800 focus:outline-none focus:ring-0"
                        >
                            {limitOptions.map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            className={`flex items-center gap-1 rounded-md border px-3 py-2 text-sm ${selectedqueries.length === 0
                                ? "border-red-200 text-red-200 cursor-not-allowed"
                                : "border-red-500 text-red-500 hover:bg-red-50"
                                }`}
                            onClick={handleBulkDelete}
                            disabled={selectedqueries.length === 0}
                        >
                            <Trash2 size={16} />
                            <span>Trash</span>
                        </button>
                        <button
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page === 1}
                            className={`px-3 py-1 rounded border ${page === 1
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-white text-gray-700 hover:bg-gray-50"
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
                </section>

                {error && (
                    <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                        {error}
                    </p>
                )}

                <div className="shadow-xl rounded-2xl border border-gray-200 bg-white overflow-x-auto max-h-[75vh] overflow-y-auto scroll-smooth">
                    <table className="min-w-full text-left text-[12px] font-light border-collapse">
                        <thead className="bg-gray-900 text-white">
                            <tr className="divide-x divide-gray-800">
                                <th className="px-2 py-3 text-center">
                                    {/* <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={handleSelectAll}
                                    /> */}
                                </th>
                                <th className="px-4 py-3 text-[12px]">S/N</th>
                                <th className="px-4 py-3 text-[12px]">
                                    Staff Name
                                    <select
                                        value={filters.staffId}
                                        onChange={handleFilterChange("staffId")}
                                        className="mt-2 w-full rounded border border-gray-600 bg-gray-900/50 px-2 py-1 text-[11px] text-white focus:border-blue-300 focus:outline-none"
                                    >
                                        <option value="">All</option>
                                        {adminList.map((admin) => (
                                            <option key={admin._id} value={admin._id}>
                                                {admin.name}
                                            </option>
                                        ))}
                                    </select>
                                </th>

                                <th className="px-4 py-3 text-[12px]">
                                    Student Name
                                    <input
                                        type="text"
                                        value={filters.studentName}
                                        onChange={handleFilterChange("studentName")}
                                        placeholder="Search"
                                        className="mt-2 w-full rounded border border-gray-600 bg-gray-900/50 px-2 py-1 text-[11px] text-white placeholder:text-gray-400 focus:border-blue-300 focus:outline-none"
                                    />
                                </th>
                                <th className="px-4 py-3 text-[12px]">
                                    Contact No
                                    <input
                                        type="text"
                                        value={filters.phoneNumber}
                                        onChange={handleFilterChange("phoneNumber")}
                                        placeholder="Phone"
                                        className="mt-2 w-full rounded border border-gray-600 bg-gray-900/50 px-2 py-1 text-[11px] text-white placeholder:text-gray-400 focus:border-blue-300 focus:outline-none"
                                    />
                                </th>
                                <th className="px-4 py-3 text-[12px]">
                                    Course
                                    <select
                                        value={filters.courseId}
                                        onChange={handleFilterChange("courseId")}
                                        className="mt-2 w-full rounded border border-gray-600 bg-gray-900/50 px-2 py-1 text-[11px] text-white focus:border-blue-300 focus:outline-none"
                                    >
                                        <option value="">All</option>
                                        {courseList.map((course) => (
                                            <option key={course._id} value={course._id}>
                                                {course.course_name}
                                            </option>
                                        ))}
                                    </select>
                                </th>
                                <th className="px-4 py-3 text-[12px]">
                                    Reference
                                    <select
                                        value={referenceId}
                                        onChange={handleReferenceChange}
                                        className="mt-2 w-full rounded border border-gray-600 bg-gray-900/50 px-2 py-1 text-[11px] text-white focus:border-blue-300 focus:outline-none"
                                    >
                                        <option value="">All</option>
                                        {referenceData.map((ref) => (
                                            <option key={ref._id} value={ref.referencename}>
                                                {ref.referencename}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedReference?.suboptions?.length > 0 && (
                                        <select
                                            value={suboption}
                                            onChange={(event) => setSuboption(event.target.value)}
                                            className="mt-2 w-full rounded border border-gray-600 bg-gray-900/50 px-2 py-1 text-[11px] text-white focus:border-blue-300 focus:outline-none"
                                        >
                                            <option value="">All Suboptions</option>
                                            {selectedReference.suboptions.map((option, index) => (
                                                <option key={`${selectedReference._id}-${index}`} value={option.name}>
                                                    {option.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </th>
                                <th className="px-4 py-3 text-[12px]">
                                    Assigned To
                                    <select
                                        value={filters.assignedToId}
                                        onChange={handleFilterChange("assignedToId")}
                                        className="mt-2 w-full rounded border border-gray-600 bg-gray-900/50 px-2 py-1 text-[11px] text-white focus:border-blue-300 focus:outline-none"
                                    >
                                        <option value="">All</option>
                                        {adminList.map((admin) => (
                                            <option key={admin._id} value={admin._id}>
                                                {admin.name}
                                            </option>
                                        ))}
                                    </select>
                                </th>
                                <th className="px-4 py-3 text-[12px]">
                                    Branch
                                   
                                </th>
                                <th className="px-4 py-3 text-[12px]">
                                    City
                                    <input
                                        type="text"
                                        value={filters.city}
                                        onChange={handleFilterChange("city")}
                                        placeholder="City"
                                        className="mt-2 w-full rounded border border-gray-600 bg-gray-900/50 px-2 py-1 text-[11px] text-white placeholder:text-gray-400 focus:border-blue-300 focus:outline-none"
                                    />
                                </th>
                                <th className="px-4 py-3 text-[12px] relative group">
                                    Demo Date
                                    <div className="mt-2 flex flex-col gap-2 text-gray-800">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-300">From</span>
                                            <input
                                                type="date"
                                                value={fromDate}
                                                onChange={(event) => setFromDate(event.target.value)}
                                                className="flex-1 rounded border border-gray-600 bg-gray-900/50 px-2 py-1 text-[11px] text-white focus:border-blue-300 focus:outline-none"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-300">To</span>
                                            <input
                                                type="date"
                                                value={toDate}
                                                onChange={(event) => setToDate(event.target.value)}
                                                className="flex-1 rounded border border-gray-600 bg-gray-900/50 px-2 py-1 text-[11px] text-white focus:border-blue-300 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-[12px]">Enroll Fees</th>
                                {/* <th className="px-4 py-3 text-[12px]">
                                    Final Fees
                                    <input
                                        type="number"
                                        value={filters.finalFees}
                                        onChange={handleFilterChange("finalFees")}
                                        placeholder="Exact amount"
                                        className="mt-2 w-full rounded border border-gray-600 bg-gray-900/50 px-2 py-1 text-[11px] text-white placeholder:text-gray-400 focus:border-blue-300 focus:outline-none"
                                    />
                                </th> */}
                                <th className="px-4 py-3 text-[12px]">Remaining</th>
                                <th className="px-4 py-3 text-[12px]">
                                    Total Receive
                                    <select
                                        value={filters.zeroFilter}
                                        onChange={handleFilterChange("zeroFilter")}
                                        className="mt-2 w-full rounded border border-gray-600 bg-gray-900/50 px-2 py-1 text-[11px] text-white focus:border-blue-300 focus:outline-none"
                                    >
                                        <option value="">All</option>
                                        <option value="0">0 Fees</option>
                                       
                                    </select>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={13} className="px-6 py-10 text-center">
                                        <div className="flex items-center justify-center">
                                            <Loader />
                                        </div>
                                    </td>
                                </tr>
                            ) : queries.length === 0 ? (
                                <tr>
                                    <td colSpan={13} className="px-6 py-10 text-center text-gray-500">
                                        No admissions found for selected filters.
                                    </td>
                                </tr>
                            ) : (
                                queries.map((query, index) => {
                                    const isSelected = selectedqueries.includes(query._id);
                                    return (
                                        <tr
                                            key={query._id}
                                            className="odd:bg-gray-50 even:bg-white hover:bg-blue-50 transition-colors cursor-pointer"
                                            onClick={() => handleOpenModal(`${query._id}`)}
                                        >
                                            <td
                                                className="px-2 py-3 text-center"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={handleSelectOne(query._id)}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-[12px] font-semibold">
                                                {(page - 1) * limit + index + 1}
                                            </td>
                                            <td className="px-4 py-3 text-[12px]">{query.staffName}</td>
                                            <td className="px-4 py-3 text-[12px]">{query.studentName || "N/A"}</td>
                                            <td className="px-4 py-3 text-[12px]">
                                                {query.studentContact?.phoneNumber || "N/A"}
                                            </td>
                                            <td className="px-4 py-3 text-[12px]">{query.courseName}</td>
                                            <td className="px-4 py-3 text-[12px]">
                                                {query.referenceid}
                                                {query.suboption && query.suboption !== "null" && (
                                                    <span className="ml-1 text-gray-500">({query.suboption})</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-[12px]">{query.assignedToName}</td>
                                            <td className="px-4 py-3 text-[12px]">{query.branch}</td>
                                            <td className="px-4 py-3 text-[12px]">
                                                {query.studentContact?.city || "N/A"}
                                            </td>
                                            <td className="px-4 py-3 text-[12px]">
                                                {query.demodate || query.demoupdatedate
                                                    ? new Intl.DateTimeFormat("en-GB", {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric",
                                                    }).format(new Date(query.demodate || query.demoupdatedate))
                                                    : "N/A"}
                                            </td>
                                            <td className="px-4 py-3 text-[12px]">
                                                {query.totalFees != null ? `${query.totalFees} ₹` : "N/A"}
                                            </td>
                                            {/* <td className="px-4 py-3 text-[12px]">
                                            {query.finalFeesUsed != null ? `${query.finalFeesUsed} ₹` : "N/A"}
                                        </td> */}
                                            <td className="px-4 py-3 text-[12px]">
                                                {typeof query.remainingFees === "number"
                                                    ? `${query.remainingFees} ₹`
                                                    : "N/A"}
                                            </td>
                                            <td className="px-4 py-3 text-[12px]">{query.total}</td>

                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
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
