import React from 'react'
import { PhoneCall, CheckCircle, CircleDashed, Navigation, Locate, LocateOff, Trash } from "lucide-react";

export default function StaffReport({ data }) {
    return (
        <div>
            <div className=' flex flex-col gap-6 p-6  bg-gray-50 rounded-xl'>

                <div className="flex items-center bg-white p-4 rounded-lg shadow-md">
                    <div className='flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full'>
                        <PhoneCall className='w-8 h-8 text-blue-500' />
                    </div>
                    <div className='ml-4'>
                        <p className='text-xl font-bold text-gray-800'>{data.filter(item => item.autoclosed === "open" && item.addmission === false).length}</p>
                        <p className='text-gray-500'>Total Query</p>
                    </div>
                </div>

                <div className="flex items-center bg-white p-4 rounded-lg shadow-md">
                    <div className='flex items-center justify-center w-16 h-16 bg-green-100 rounded-full'>
                        <CheckCircle className='w-8 h-8 text-green-500' />
                    </div>
                    <div className='ml-4'>
                        <p className='text-xl font-bold text-gray-800'>{data.filter(item => item.addmission == true).length}
                        </p>
                        <p className='text-gray-500'>Enrolled Queries</p>
                    </div>
                </div>

                <div className="flex items-center bg-white p-4 rounded-lg shadow-md">
                    <div className='flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full'>
                        <CircleDashed className='w-8 h-8 text-orange-500' />
                    </div>
                    <div className='ml-4'>
                        <p className='text-xl font-bold text-gray-800'>{data.filter(item => item.addmission == false && item.autoclosed === "open").length}
                        </p>
                        <p className='text-gray-500'>Pending Queries</p>
                    </div>
                </div>

                <div className="flex items-center bg-white p-4 rounded-lg shadow-md">
                    <div className='flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full'>
                        <Navigation className='w-8 h-8 text-blue-500' />
                    </div>
                    <div className='ml-4'>
                        <p className='text-xl font-bold text-gray-800'>{data.filter(item => item.demo == true).length}
                        </p>
                        <p className='text-gray-500'>Demo Queries</p>
                    </div>
                </div>
                <div className="flex items-center bg-white p-4 rounded-lg shadow-md">
                    <div className='flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full'>
                        <Locate className='w-8 h-8 text-blue-500' />
                    </div>
                    <div className='ml-4'>
                        <p className='text-xl font-bold text-gray-800'>{data.filter(item => item.studentContact.city === "Jaipur").length}
                        </p>
                        <p className='text-gray-500'>Jaipur Queries</p>
                    </div>
                </div>

                <div className="flex items-center bg-white p-4 rounded-lg shadow-md">
                    <div className='flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full'>
                        <LocateOff className='w-8 h-8 text-gray-500' />
                    </div>
                    <div className='ml-4'>
                        <p className='text-xl font-bold text-gray-800'>{data.filter(item => item.studentContact.city !== "Jaipur").length}
                        </p>
                        <p className='text-gray-500'>Out Of Jaipur Queries</p>
                    </div>
                </div>

                <div className="flex items-center bg-white p-4 rounded-lg shadow-md">
                    <div className='flex items-center justify-center w-16 h-16 bg-red-100 rounded-full'>
                        <Trash className='w-8 h-8 text-red-500' />
                    </div>
                    <div className='ml-4'>
                        <p className='text-xl font-bold text-gray-800'>{data.filter(item => item.autoclosed === "close" && item.addmission === false).length}
                        </p>
                        <p className='text-gray-500'>Trash Queries</p>
                    </div>
                </div>


            </div>
        </div>
    )
}
