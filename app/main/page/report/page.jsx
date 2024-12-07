"use client"
import React, { useState } from 'react';
import Queryadd from '../../component/Report/Query/Queryadd';

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
                    <h1 className="text-2xl font-bold">Branch Report</h1>
                    <p className="mt-1 text-sm">View and manage branch queries and reports efficiently.</p>
                </header>

                <div className="p-6 grid lg:grid-cols-2 gap-4">

                    <div className="bg-gray-50 p-2 rounded-lg shadow-sm border">
                        <button
                            className="text-[#29234b] underline"
                            onClick={() => handleOpenModal(<Queryadd />)}
                        >
                            Overview
                        </button>
                    </div>



                </div>
            </div>


            {isModalOpen && (
                <div className="fixed bg-white inset-0 z-50 flex items-center justify-center  overflow-auto">
                    <div className="   h-screen w-screen  relative">
                        <button
                            className="absolute top-2 text-3xl right-2 text-red-500 hover:text-red-700"
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
