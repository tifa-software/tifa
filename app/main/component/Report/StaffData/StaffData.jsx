"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function StaffData({ staffid }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState([]);
    const [activeDay, setActiveDay] = useState(null); // State to track active date

    useEffect(() => {
        const fetchQueryData = async () => {
            if (staffid) {
                try {
                    setLoading(true);
                    const response = await axios.get(`/api/report/staffdata/${staffid}`);
                    setData(response.data.data.userActivityReport);
                } catch (error) {
                    console.error("Error fetching query data:", error);
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchQueryData();
    }, [staffid]);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await axios.get("/api/admin/fetchall/admin");
                setUser(response.data.fetch);
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        };

        fetchUserData();
    }, []);

    const getUserName = (id) => {
        const matchedUser = user.find((u) => u._id === id);
        return matchedUser ? matchedUser.name : "Unknown User";
    };

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-100">
                <div className="text-3xl text-blue-500">Loading...</div>
            </div>
        );
    }

    return (
        <>
            <div className="font-semibold inline text-center sticky top-0 py-2 px-4 backdrop-blur-md bg-blue-100 rounded-br-full text-gray-800">
                Staff Report for {data.userName} from {data.branch}
            </div>
            <div className="container lg:w-[95%] mx-auto py-5">
                <div className="mt-4 space-y-4">
                    {Object.keys(data.dailyActivity || {}).length === 0 ? (
                        <div>No daily activity data available.</div>
                    ) : (
                        Object.entries(data.dailyActivity)
                            .sort(([dayA], [dayB]) => new Date(dayB) - new Date(dayA))
                            .map(([day, activity]) => (
                                <div key={day}>
                                    <button
                                        onClick={() => setActiveDay(activeDay === day ? null : day)}
                                        className="bg-[#29234b] hover:bg-[#29234b]/80 text-white font-semibold py-2 px-4 rounded w-full text-left"
                                    >
                                        Date: {day} {activeDay === day ? "▼" : "▶"}
                                    </button>
                                    {activeDay === day && (
                                        <div className="mt-2">
                                            <p className="font-medium text-sm border px-2 bg-gray-50">
                                                Actions Taken: {activity.count[0]}
                                            </p>
                                            <table className="w-full text-sm text-left rtl:text-right text-gray-600 font-sans mt-2">
                                                <thead className="bg-[#29234b] text-white uppercase">
                                                    <tr>
                                                        <th scope="col" className="px-4 font-medium capitalize py-2">
                                                            Student Name
                                                        </th>
                                                        <th scope="col" className="px-4 font-medium capitalize py-2">
                                                            Phone Number
                                                        </th>
                                                        <th scope="col" className="px-4 font-medium capitalize py-2">
                                                            Reference
                                                        </th>
                                                        <th scope="col" className="px-4 font-medium capitalize py-2">
                                                            City
                                                        </th>
                                                        <th scope="col" className="px-4 font-medium capitalize py-2">
                                                            Address
                                                        </th>
                                                        <th scope="col" className="px-4 font-medium capitalize py-2">
                                                            Assigned from
                                                        </th>
                                                        <th scope="col" className="px-4 font-medium capitalize py-2">
                                                            Assigned To
                                                        </th>
                                                        <th scope="col" className="px-4 font-medium capitalize py-2">
                                                            Created Date
                                                        </th>
                                                        <th scope="col" className="px-4 font-medium capitalize py-2">
                                                            Status
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {activity.queries.map((query, index) => (
                                                        <tr key={index}>
                                                            <td className="px-4 py-2 text-[12px] font-semibold">
                                                                {query.studentName}
                                                            </td>
                                                            <td className="px-4 py-2 text-[12px] font-semibold">
                                                                {query.studentContact.phoneNumber}
                                                            </td>
                                                            <td className="px-4 py-2 text-[12px] font-semibold">
                                                                {query.referenceid !== "null" &&
                                                                query.referenceid !== null
                                                                    ? query.referenceid
                                                                    : "Not Provided"}
                                                                {query.suboption !== "null" && <>{query.suboption}</>}
                                                            </td>
                                                            <td className="px-4 py-2 text-[12px] font-semibold">
                                                                {query.studentContact.city}
                                                            </td>
                                                            <td className="px-4 py-2 text-[12px] font-semibold">
                                                                {query.studentContact.address}
                                                            </td>
                                                            <td className="px-4 py-2 text-[12px] font-semibold">
                                                                {query.assignedsenthistory &&
                                                                query.assignedsenthistory.length > 0
                                                                    ? query.assignedsenthistory
                                                                          .map((id) => getUserName(id))
                                                                          .join(", ")
                                                                    : "Not Assigned"}
                                                            </td>
                                                            <td className="px-4 py-2 text-[12px] font-semibold">
                                                                {query.assignedreceivedhistory &&
                                                                query.assignedreceivedhistory.length > 0
                                                                    ? query.assignedreceivedhistory
                                                                          .map((id) => getUserName(id))
                                                                          .join(", ")
                                                                    : "Not Assigned"}
                                                            </td>
                                                            <td className="px-4 py-2 text-[12px] font-semibold">
                                                                {new Date(query.createdAt).toLocaleDateString("en-GB", {
                                                                    day: "numeric",
                                                                    month: "long",
                                                                    year: "numeric",
                                                                })}
                                                            </td>
                                                            <td className="px-4 py-2 text-[12px] font-semibold">
                                                                {query.addmission ? "Enroll" : "Not Enroll"}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            ))
                    )}
                </div>
            </div>
        </>
    );
}
