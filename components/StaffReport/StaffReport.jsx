import React from 'react'
import { PhoneCall, CheckCircle, CircleDashed, Navigation, Locate, LocateOff, Trash } from "lucide-react";

export default function StaffReport({ data }) {
    return (
        <div>
            <div className=' grid grid-cols-4 gap-6 p-6  bg-gray-50 rounded-xl'>

                <div className="flex items-center bg-white p-2 rounded-lg shadow-md">
                    <div className='flex items-center justify-center w-4 h-4 bg-blue-100 rounded-full'>
                        <PhoneCall className='w-4 h-4 text-blue-500' />
                    </div>
                    <div className='ml-4 flex gap-4'>
                        <p className=' font-bold text-gray-800'>{data.length}</p>
                        <p className='text-gray-500'>Total Query</p>
                    </div>
                </div>

                <div className="flex items-center bg-white p-2 rounded-lg shadow-md">
                    <div className='flex items-center justify-center w-4 h-4 bg-green-100 rounded-full'>
                        <CheckCircle className='w-4 h-4 text-green-500' />
                    </div>
                    <div className='ml-4 flex gap-4'>
                        <p className='text-xl font-bold text-gray-800'>{data.filter(item => item.addmission == true).length}
                        </p>
                        <p className='text-gray-500'>Enrolled Queries</p>
                    </div>
                </div>

                <div className="flex items-center bg-white p-2 rounded-lg shadow-md">
                    <div className='flex items-center justify-center w-4 h-4 bg-green-100 rounded-full'>
                        <CheckCircle className='w-4 h-4 text-green-500' />
                    </div>
                    <div className='ml-4 flex gap-4'>
                        <p className='text-xl font-bold text-gray-800'>{data.filter(item => item.demo === true && item.total > 0 && item.addmission == false).length}
                        </p>
                        <p className='text-gray-500'>Under Demo  With Some Fees</p>
                    </div>
                </div>

                <div className="flex items-center bg-white p-2 rounded-lg shadow-md">
                    <div className='flex items-center justify-center w-4 h-4 bg-orange-100 rounded-full'>
                        <CircleDashed className='w-4 h-4 text-orange-500' />
                    </div>
                    <div className='ml-4 flex gap-4'>
                        <p className='text-xl font-bold text-gray-800'>{data.filter(item => item.addmission == false && item.autoclosed === "open").length}
                        </p>
                        <p className='text-gray-500'>Pending Queries</p>
                    </div>
                </div>

                <div className="flex items-center bg-white p-2 rounded-lg shadow-md">
                    <div className='flex items-center justify-center w-4 h-4 bg-blue-100 rounded-full'>
                        <Navigation className='w-4 h-4 text-blue-500' />
                    </div>
                    <div className='ml-4 flex gap-4'>
                        <p className='text-xl font-bold text-gray-800'>{data.filter(item => item.demo == true).length}
                        </p>
                        <p className='text-gray-500'>Demo Queries</p>

                    </div>
                </div>

                <div className="flex items-center bg-white p-2 rounded-lg shadow-md">
                    <div className='flex items-center justify-center w-4 h-4 bg-blue-100 rounded-full'>
                        <Navigation className='w-4 h-4 text-blue-500' />
                    </div>
                    <div className='ml-4 flex gap-4'>
                        <p className='text-xl font-bold text-gray-800'>{data.filter(item => item.stage === 6).length}
                        </p>
                        <p className='text-gray-500'>Visited Queries</p>
                    </div>
                </div>
                <div className="flex items-center bg-white p-2 rounded-lg shadow-md">
                    <div className='flex items-center justify-center w-4 h-4 bg-blue-100 rounded-full'>
                        <Locate className='w-4 h-4 text-blue-500' />
                    </div>
                    <div className='ml-4 flex gap-4'>
                        <p className='text-xl font-bold text-gray-800'>{data.filter(item => item.studentContact.city === "Jaipur").length}
                        </p>
                        <p className='text-gray-500'>Jaipur Queries</p>
                    </div>
                </div>

                <div className="flex items-center bg-white p-2 rounded-lg shadow-md">
                    <div className='flex items-center justify-center w-4 h-4 bg-gray-100 rounded-full'>
                        <LocateOff className='w-4 h-4 text-gray-500' />
                    </div>
                    <div className='ml-4 flex gap-4'>
                        <p className='text-xl font-bold text-gray-800'>{data.filter(item => item.studentContact.city !== "Jaipur").length}
                        </p>
                        <p className='text-gray-500'>Out Of Jaipur Queries</p>
                    </div>
                </div>

                <div className="flex items-center bg-white p-2 rounded-lg shadow-md">
                    <div className='flex items-center justify-center w-4 h-4 bg-red-100 rounded-full'>
                        <Trash className='w-4 h-4 text-red-500' />
                    </div>
                    <div className='ml-4 flex gap-4'>
                        <p className='text-xl font-bold text-gray-800'>{data.filter(item => item.autoclosed === "close" && item.addmission === false).length}
                        </p>
                        <p className='text-gray-500'>Trash Queries</p>
                    </div>
                </div>


            </div>
        </div>
    )
}
