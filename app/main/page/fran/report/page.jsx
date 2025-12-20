"use client"
import React, { useState } from 'react';
import QueryReport from '@/app/main/component/franReport/QueryReport/QueryReport';
import Demo from '@/app/main/component/franReport/Demo/Demo';
import Visit from '@/app/main/component/franReport/Visit/Visit';
import StaffReport from '@/app/main/component/franReport/StaffReport/StaffReport';
import Addmission from '@/app/main/component/franReport/Addmission/Addmission';
import Admissionxlms from '@/app/main/component/franReport/Admissionxlms/Admissionxlms';
import AdmissionBranchxlms from '@/app/main/component/franReport/AdmissionBranchxlms/AdmissionBranchxlms';
import Xlms from '@/app/main/component/franReport/Xlms/Xlms';
import UserPendingReport from '@/app/main/component/franReport/UserPendingReport/UserPendingReport';
import Staff from '@/app/main/component/franReport/Staff/Staff';
import FranPerformance from "@/app/main/component/FranPerformance/FranPerformance"
import Lead from '../LeadCount/LeadCount';
export default function BranchReportPage() {

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

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto bg-white shadow-lg rounded-lg">
                <header className="p-6 border-b border-gray-200 bg-[#29234b] text-white rounded-t-lg">
                    <h1 className="text-2xl font-bold">Franchise Branch Report</h1>
                    <p className="mt-1 text-sm">View and manage branch queries and reports efficiently.</p>
                </header>

                <div className="p-6 grid lg:grid-cols-2 gap-4">

                    <div className="bg-gray-50 p-2 rounded-lg shadow-sm border">
                        <button
                            className="text-[#29234b] "
                            onClick={() => handleOpenModal(<QueryReport />)}
                        >
                            OVERVIEW
                        </button>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg shadow-sm border">
                        <button
                            className="text-[#29234b] "
                            onClick={() => handleOpenModal(<Demo />)}
                        >
                            Demo Queries
                        </button>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg shadow-sm border">
                        <button
                            className="text-[#29234b] "
                            onClick={() => handleOpenModal(<Visit />)}
                        >
                            Visit Queries
                        </button>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg shadow-sm border">
                        <button
                            className="text-[#29234b] "
                            onClick={() => handleOpenModal(<Lead />)}
                        >
                            Lead Report
                        </button>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg shadow-sm border">
                        <button
                            className="text-[#29234b] "
                            onClick={() => handleOpenModal(<LeadTransfer />)}
                        >
                            Lead Transfer Report
                        </button>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg shadow-sm border">
                        <button
                            className="text-[#29234b] "
                            onClick={() => handleOpenModal(<StaffReport />)}
                        >
                            Staff Register
                        </button>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg shadow-sm border">
                        <button
                            className="text-[#29234b] "
                            onClick={() => handleOpenModal(<Addmission />)}
                        >
                            AddMission Register
                        </button>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg shadow-sm border">
                        <button
                            className="text-[#29234b] "
                            onClick={() => handleOpenModal(<Staff />)}
                        >
                            Staff Daily Activity Report
                        </button>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg shadow-sm border">
                        <button
                            className="text-[#29234b] "
                            onClick={() => handleOpenModal(<UserPendingReport />)}
                        >
                            User Pending Report
                        </button>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg shadow-sm border">
                        <button
                            className="text-[#29234b] "
                            onClick={() => handleOpenModal(<Xlms />)}
                        >
                            Visit Counsellor Report
                        </button>
                    </div>

                    <div className="bg-gray-50 p-2 rounded-lg shadow-sm border">
                        <button
                            className="text-[#29234b] "
                            onClick={() => handleOpenModal(<Admissionxlms />)}
                        >
                            Addmission Counsellor  Report
                        </button>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg shadow-sm border">
                        <button
                            className="text-[#29234b] "
                            onClick={() => handleOpenModal(<AdmissionBranchxlms />)}
                        >
                            Addmission Branch  Report
                        </button>
                    </div>




                    <div className="bg-gray-50 p-2 rounded-lg shadow-sm border">
                        <button
                            className="text-[#29234b] "
                            onClick={() => handleOpenModal(<FranPerformance />)}
                        >
                            Performance Report
                        </button>
                    </div>
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
                        <div>{activeQuery}</div>
                    </div>
                </div>
            )}
        </div>
    );
}
