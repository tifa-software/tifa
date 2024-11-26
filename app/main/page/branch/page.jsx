"use client";
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Loader from '@/components/Loader/Loader';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Search, Trash2, CirclePlus, Filter, X } from "lucide-react";
import Link from 'next/link';

export default function Branch() {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [branchesPerPage] = useState(8);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBranches, setSelectedBranches] = useState([]);
    const [sortOrder, setSortOrder] = useState("newest");
    const [filterCourse, setFilterCourse] = useState("");
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    useEffect(() => {
        const fetchBranchData = async () => {
            try {
                const response = await axios.get('/api/branch/fetchall/branch');
                setBranches(response.data.fetch);
            } catch (error) {
                console.error('Error fetching branch data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBranchData();
    }, []);

    const router = useRouter();
    const handleRowClick = (id) => {
        router.push(`/main/page/branch/${id}`);
    };
    const toggleFilterPopup = () => {
        setIsFilterOpen(!isFilterOpen);
    };

    // Sort branches based on selected order
    const sortBranches = (branches) => {
        return branches.sort((a, b) => {
            return sortOrder === "newest"
                ? new Date(b.createdAt) - new Date(a.createdAt)
                : new Date(a.createdAt) - new Date(b.createdAt);
        });
    };

    // Filter branches based on course and search term
    const filteredBranches = sortBranches(
        branches.filter(branch =>
            branch.branch_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
            (filterCourse === "" || branch.courses.includes(filterCourse))
        )
    );

    // Pagination logic
    const indexOfLastBranch = currentPage * branchesPerPage;
    const indexOfFirstBranch = indexOfLastBranch - branchesPerPage;
    const currentBranches = filteredBranches.slice(indexOfFirstBranch, indexOfLastBranch);
    const totalPages = Math.ceil(filteredBranches.length / branchesPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    // Handle multi-select for bulk actions
    const handleSelectBranch = (id) => {
        if (selectedBranches.includes(id)) {
            setSelectedBranches(selectedBranches.filter(branchId => branchId !== id));
        } else {
            setSelectedBranches([...selectedBranches, id]);
        }
    };

    // Handle bulk delete
    // const handleBulkDelete = async () => {
    //     try {
    //         // Make a DELETE request to the API with the selected branches' IDs in the request body
    //         await axios.delete('/api/branch/delete', {
    //             data: { ids: selectedBranches } // Pass the ids in the 'data' field for DELETE request
    //         });

    //         // Filter out the deleted branches from the state
    //         setBranches(branches.filter(branch => !selectedBranches.includes(branch._id)));

    //         // Clear the selected branches after deletion
    //         setSelectedBranches([]);

    //         alert('Branches deleted successfully');
    //     } catch (error) {
    //         console.error('Error deleting branches:', error);
    //         alert('Error occurred while deleting branches');
    //     }
    // };


    return (
        <div className='container lg:w-[95%] mx-auto py-5'>
            {/* Search, Sort, Filter, and Bulk Actions */}
            <div className="flex justify-between items-center mb-4">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search size={14} />
                    </span>
                    <input
                        type="text"
                        placeholder="Search branch"
                        className="border px-3 py-2 pl-10 text-sm focus:outline-none    "
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <button className="lg:hidden text-gray-600 px-3 py-2 border rounded-md" onClick={toggleFilterPopup}>
                    <Filter size={16} />
                </button>

                {/* Popup for Filters on Mobile */}
                {isFilterOpen && (
                    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 z-50">
                        <div className="fixed top-0 right-0 w-64 h-full bg-white shadow-lg p-4 z-50">
                            <button className="text-gray-600 mb-4" onClick={toggleFilterPopup}>
                                <X size={20} />
                            </button>

                            <div className="flex flex-col space-y-3">
                                <select
                                    className="border px-3 py-2 focus:outline-none text-sm"
                                    value={filterCourse}
                                    onChange={(e) => setFilterCourse(e.target.value)}
                                >
                                    <option value="">All Courses</option>
                                    {Array.from(new Set(branches.flatMap(branch => branch.courses))).map((course, index) => (
                                        <option key={index} value={course}>{course}</option>
                                    ))}
                                </select>

                                <select
                                    className="border px-3 py-2 focus:outline-none text-sm"
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                >
                                    <option value="newest">Newest</option>
                                    <option value="oldest">Oldest</option>
                                </select>

                                <Link href={'/main/page/addbranch'}>
                                    <button className="bg-[#29234b] rounded-md flex items-center text-white text-sm px-4 py-2">
                                        <CirclePlus size={16} className='me-1' /> Add Branch
                                    </button>
                                </Link>
                                {/* 
                                <button
                                    className="text-red-500 rounded-md border border-red-500 px-3 py-2"
                                    onClick={handleBulkDelete}
                                    disabled={selectedBranches.length === 0}
                                >
                                    <Trash2 size={16} />
                                </button> */}
                            </div>
                        </div>
                    </div>
                )}

                {/* Desktop Filter Section */}
                <div className="hidden lg:flex space-x-3">
                    <select
                        className="border px-3 py-2 focus:outline-none text-sm"
                        value={filterCourse}
                        onChange={(e) => setFilterCourse(e.target.value)}
                    >
                        <option value="">All Courses</option>
                        {Array.from(new Set(branches.flatMap(branch => branch.courses))).map((course, index) => (
                            <option key={index} value={course}>{course}</option>
                        ))}
                    </select>

                    <select
                        className="border px-3 py-2 focus:outline-none text-sm"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                    >
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                    </select>

                    <Link href={'/main/page/addbranch'}>
                        <button className="bg-[#29234b] rounded-md flex items-center text-white text-sm px-4 py-2 ">
                            <CirclePlus size={16} className='me-1' /> Add Branch
                        </button>
                    </Link>

                    {/* <button
                        className="text-red-500 rounded-md border border-red-500 px-3 py-2"
                        onClick={handleBulkDelete}
                        disabled={selectedBranches.length === 0}
                    >
                        <Trash2 size={16} />
                    </button> */}
                </div>
            </div>

            {/* Branch Table */}
            <div className="relative overflow-x-auto shadow-md  bg-white   border border-gray-200">
                <table className="w-full text-sm text-left rtl:text-right text-gray-600 font-sans">
                    <thead className="bg-[#29234b] text-white uppercase">
                        <tr>

                            <th scope="col" className="px-4 font-medium capitalize py-2">Branch Name</th>
                            <th scope="col" className="px-4 font-medium capitalize py-2">Location</th>
                            <th scope="col" className="px-4 font-medium capitalize py-2">Courses Offered</th>
                            <th scope="col" className="px-4 font-medium capitalize py-2">Student Count</th>
                            <th scope="col" className="px-4 font-medium capitalize py-2">Staff Count</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-4">
                                    <div className="flex justify-center items-center h-[300px]">
                                        <Loader />
                                    </div>
                                </td>
                            </tr>
                        ) : currentBranches.length > 0 ? (
                            currentBranches.map((branch, index) => (
                                <tr
                                    key={branch._id}
                                    onClick={() => handleRowClick(branch._id)}
                                    className={`border-b cursor-pointer hover:bg-gray-100 odd:bg-gray-50 even:bg-gray-100 transition-colors duration-200`}
                                >
                                    <td
                                        className="px-4 py-2 font-semibold text-gray-900 text-sm whitespace-nowrap"
                                      
                                    >
                                        {branch.branch_name}
                                    </td>
                                    <td className="px-4 py-2 text-[12px]">
                                        {branch.location.street}, {branch.location.city}, {branch.location.state}, {branch.location.zipCode}
                                    </td>
                                    <td className="px-4 py-2 truncate text-[12px]">
                                        {branch.courses.length > 0 ? branch.courses[0] : 'No courses'}...
                                    </td>
                                    <td className="px-4 py-2 text-[12px]">{branch.student_count}</td>
                                    <td className="px-4 py-2 text-[12px]">{branch.staff_count}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                                    No branches available
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    paginate={paginate}
                />
            </div>
        </div>
    );
}

const Pagination = ({ currentPage, totalPages, paginate }) => {
    return (
        <div className="flex justify-center my-4">
            <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 mx-1 text-sm border rounded ${currentPage === 1 ? 'cursor-not-allowed bg-gray-200' : 'bg-[#6cb049] text-white'}`}
            >
                <ArrowLeft size={18} />
            </button>

            <span className="px-3 py-1 mx-1 text-sm border rounded bg-gray-200">
                Page {currentPage} of {totalPages}
            </span>

            <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 mx-1 text-sm border rounded ${currentPage === totalPages ? 'cursor-not-allowed bg-gray-200' : 'bg-[#6cb049] text-white'}`}
            >
                <ArrowRight size={18} />
            </button>
        </div>
    );
};
