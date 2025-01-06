"use client";
import React, { useState, useEffect, useRef,useCallback } from "react";
import axios from "axios";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import toast, { Toaster } from "react-hot-toast";
import { useSession } from 'next-auth/react';
import { Citylist } from "@/constants/City";
import Address from "@/components/Address/Address"

export default function Page({ params }) {
    const { id } = params;
    const [branches, setBranches] = useState([]);
    const [allCourses, setAllCourses] = useState([]); // Store all courses
    const [referenceData, setReferenceData] = useState([]);
    const [displayDate, setDisplayDate] = useState("");
    const [user, setuser] = useState([]);

    const [adminData, setAdminData] = useState(null);
    const [adminid, setAdminid] = useState(null);
    const [adminbranch, setAdminbranch] = useState(null);
    const { data: session } = useSession();
    const [formData, setFormData] = useState({
        // userid: "",
        referenceid: "",
        suboption: "null",
        studentName: "",
        lastgrade: "",
        // assignedTo: "Not-Assigned",
        assignedToreq: "",
        assignedreceivedhistory: "",
        assignedsenthistory: "",

        gender: "Not_Defined",
        category: "Not_Defined",
        studentContact: {
            phoneNumber: "",
            whatsappNumber: "",
            address: "",
            city: "Jaipur"
        },
        courseInterest: "",
        deadline: "",
        branch: "",
        notes: "",

        qualification: "Not Provided",
        profession: "",
        professiontype: "null",
        reference_name: "null",
        addmission: false,
        autoclosed: "open"
    });
    const [interestStatus, setInterestStatus] = useState("");
    const [gradeStatus, setGradeStatus] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isFormValid, setIsFormValid] = useState(false);

    // const today = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();
    const sessionStart = new Date(currentYear, 2, 1); // March 1 of the current year
    const sessionEnd = new Date(currentYear + 1, 2, 31); // March 31 of the next year
    const formatDate = (date) => date.toISOString().split('T')[0];

    const inputRefs = useRef([]);

    const handleKeyDown = (e, index) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission on Enter
            const nextInput = inputRefs.current[index + 1];
            if (nextInput) {
                nextInput.focus();
            }
        }
    };


    
    const fetchExistingData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/queries/find-single-byid/${id}`);
            const existingData = response.data.query;
            setFormData(existingData);
        } catch (err) {
            console.error("Error fetching data for ID:", err);
            setError("Failed to load data.");
        } finally {
            setLoading(false);
        }
    }, [id]); // id as a dependency ensures it updates if id changes.

    useEffect(() => {
        fetchExistingData();
    }, [fetchExistingData]);


    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {

                const courseResponse = await axios.get("/api/course/fetchall/courses");
                setAllCourses(courseResponse.data.fetch || []);

            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                setLoading(true);  // Start loading
                const response = await axios.get(
                    `/api/admin/find-admin-byemail/${session?.user?.email}`
                );
                const adminBranch = response.data;
                setAdminData(adminBranch);
                setAdminid(response.data._id);
                setAdminbranch(response.data.branch);
                // Update the formData with the fetched admin branch
                setFormData((prevFormData) => ({
                    ...prevFormData,

                    userid: adminBranch._id,
                }));
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);  // Stop loading
            }
        };

        if (session?.user?.email) fetchAdminData();
    }, [session]);


    const fetchReferences = async () => {
        setLoading(true); // Set fetching state to true
        try {
            const response = await axios.get('/api/reference/fetchall/reference');
            setReferenceData(response.data.fetch);
        } catch (error) {
            toast.error("Error fetching reference data");
        } finally {
            setLoading(false); // Turn off loading state
        }
    };

    useEffect(() => {
        fetchReferences(); // Fetch all references when the component mounts
    }, []);


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

    useEffect(() => {
        const fetchuserData = async () => {
            try {
                const response = await axios.get('/api/admin/fetchall/admin');
                setuser(response.data.fetch);
            } catch (error) {
                console.error('Error fetching user data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchuserData();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "deadline") {
            const formattedDate = new Date(value).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
            });
            setDisplayDate(formattedDate); // Set formatted date for display
        }

        setFormData((prevFormData) => {
            if (name === "assignedToreq") {
                return {
                    ...prevFormData,
                    assignedToreq: value,
                    assignedreceivedhistory: value, // Mirror assignedToreq value
                    assignedTostatus: true,
                    assignedsenthistory: adminid
                };
            }

            if (name.includes("studentContact.")) {
                const [_, key] = name.split("."); // Extract nested key
                return {
                    ...prevFormData,
                    studentContact: {
                        ...prevFormData.studentContact,
                        [key]: value,
                    },
                };
            }

            return {
                ...prevFormData,
                [name]: value,
                branch: adminbranch // Automatically set branch for any other form changes as well
            };
        });
    };





    useEffect(() => {
        const isFormFilled =
            (formData.referenceid === 'Online' && formData.studentContact.phoneNumber) || // Only phone number required if referenceid is 'Online'
            (
                formData.studentName &&
                formData.gender &&
                // formData.assignedTo &&
                // formData.assignedToreq &&
                // formData.assignedreceivedhistory &&
                // formData.assignedsenthistory &&

                formData.referenceid &&
                formData.studentContact.phoneNumber &&
                formData.studentContact.whatsappNumber &&
                formData.studentContact.address &&
                formData.studentContact.city &&
                formData.courseInterest &&
                formData.deadline &&
                // formData.branch &&
                formData.notes &&
                formData.qualification &&
                formData.profession
            );

        setIsFormValid(isFormFilled);
    }, [formData]);



    const handleInterestChange = (e) => {
        const selectedStatus = e.target.value;
        setInterestStatus(selectedStatus);

        // Update formData based on the selected status
        setFormData((prevFormData) => ({
            ...prevFormData,
            addmission: selectedStatus === "admission",
            autoclosed: selectedStatus === "not_interested" || selectedStatus === "wrong_no" ? "close" : "open"
        }));
    };
    const handleGradeChange = (e) => {
        const selectedStatus = e.target.value;
        setGradeStatus(selectedStatus);

        // Update formData based on the selected status
        setFormData((prevFormData) => ({
            ...prevFormData,
            grade: selectedStatus,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
    
        // Check if phone numbers are valid
        if (formData.studentContact?.phoneNumber && formData.studentContact.phoneNumber.length < 10) {
            toast.error("Phone number must be at least 10 digits");
            return;
        }
        if (formData.studentContact?.whatsappNumber && formData.studentContact.whatsappNumber.length < 10) {
            toast.error("WhatsApp number must be at least 10 digits");
            return;
        }
    
        // Ensure the `id` is included in the `formData`
        if (!id) {
            toast.error("Query ID is missing. Cannot update the query.");
            return;
        }
    
        setLoading(true);
        setError("");
        setSuccess("");
    
        try {
            // Add `id` to `formData` before the API call
            const updatedFormData = { ...formData, id };
    
            // Make the API call
            const response = await axios.patch("/api/queries/updatedetails", updatedFormData);
    
            if (response.status === 200) {
                setSuccess("Query successfully updated!");
                toast.success("Query successfully updated!");
            } else {
                throw new Error("Update failed");
            }
        } catch (err) {
            setError("Failed to update the query. Please try again.");
            console.error("Error updating query:", err);
        } finally {
            setLoading(false);
        }
    };
    

    return (
        <div className="container lg:w-[90%] mx-auto py-5">
            <Toaster />
            <div
                className=" shadow-lg overflow-hidden border border-gray-200"
            >

                <div className="bg-[#29234b] text-white px-7 py-3 flex justify-between w-full">
                    <h1 className="text-lg font-bold">Add New Query</h1>
                </div>


                {/* {error && <div className="text-red-500">{error}</div>}
                {success && <div className="text-green-500">{success}</div>} */}
                {formData.referenceid === 'Online' && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-2 rounded-md shadow-md  inline-block animate-bounce">
                        <div className="flex items-center">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6 mr-2 text-red-500"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 16h-1v-4h-1m-1-4h.01M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7m16-5h-6m-6 5h.01M12 8v4m0 4h.01m-6-8h6m-6 4h6"
                                />
                            </svg>
                            <p className="font-semibold">On-line Admission Form</p>
                        </div>

                    </div>
                )}

                {formData.referenceid === 'offline' && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-2 rounded-md shadow-md  inline-block animate-bounce">
                        <div className="flex items-center">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6 mr-2 text-red-500"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 16h-1v-4h-1m-1-4h.01M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7m16-5h-6m-6 5h.01M12 8v4m0 4h.01m-6-8h6m-6 4h6"
                                />
                            </svg>
                            <p className="font-semibold">Off-line Admission Form</p>
                        </div>

                    </div>
                )}

                <form onSubmit={handleSubmit} className="px-5 py-3 space-y-3">
                    <div className="grid grid-cols-12 gap-4">




                        <div className="sm:col-span-6 col-span-12">
                            <label htmlFor="referenceid" className="block text-[15px] text-gray-700">
                                Reference Type
                            </label>
                            <select name="referenceid" ref={(el) => (inputRefs.current[0] = el)} // Assign ref
                                onKeyDown={(e) => handleKeyDown(e, 0)} value={formData.referenceid} id="" onChange={handleChange} className="block w-full px-2 py-2 text-gray-500 bg-white border border-gray-200  placeholder:text-gray-400 focus:border-[#6cb049] focus:outline-none focus:ring-[#6cb049] sm:text-sm">
                                <option value="" disabled selected>Select Reference</option>
                                {referenceData.map((data, index) => (
                                    <option key={index} value={data.referencename}>{data.referencename}</option>
                                ))}
                            </select>

                        </div>


                        {formData.referenceid === 'Online' && (
                            <div className="sm:col-span-6 col-span-12">
                                <label htmlFor="suboption" className="block text-[15px] text-gray-700">
                                    Online Type
                                </label>
                                <select name="suboption" value={formData.suboption} id="" onChange={handleChange} className="block w-full px-2 py-2 text-gray-500 bg-white border border-gray-200  placeholder:text-gray-400 focus:border-[#6cb049] focus:outline-none focus:ring-[#6cb049] sm:text-sm">
                                    <option value="" disabled selected>Select Reference name</option>
                                    {referenceData
                                        .find(data => data.referencename === formData.referenceid)?.suboptions
                                        .map((suboption, subIndex) => (
                                            <option key={subIndex} value={suboption.name}>
                                                {suboption.name}
                                            </option>
                                        ))
                                    }

                                </select>

                            </div>
                        )}

                        {formData.referenceid === 'offline' && (
                            <div className="sm:col-span-6 col-span-12">
                                <label htmlFor="reference_name" className="block text-[15px] text-gray-700">
                                    Reference Name
                                </label>
                                <select name="reference_name" value={formData.reference_name} id="" onChange={handleChange} className="block w-full px-2 py-2 text-gray-500 bg-white border border-gray-200  placeholder:text-gray-400 focus:border-[#6cb049] focus:outline-none focus:ring-[#6cb049] sm:text-sm">
                                    <option value="" disabled selected>Select Reference name</option>
                                    <option value= {adminData?.name ? adminData.name : 'Loading...'}>Self</option>
                                    {user.map((user, index) => (
                                        <option key={index} value={user.name}>{user.name}</option>
                                    ))}
                                </select>

                            </div>
                        )}







                        <div className="sm:col-span-6 col-span-12">
                            <label htmlFor="studentName" className="block text-[15px] text-gray-700">
                                Student Name
                            </label>
                            <input
                                type="text"
                                name="studentName"
                                placeholder="Enter Student Name"
                                value={formData.studentName}
                                onChange={handleChange}
                                ref={(el) => (inputRefs.current[1] = el)} // Assign ref
                                onKeyDown={(e) => handleKeyDown(e, 1)}
                                className="block capitalize w-full px-2 py-2 text-gray-500 bg-white border border-gray-200  placeholder:text-gray-400 focus:border-[#6cb049] focus:outline-none focus:ring-[#6cb049] sm:text-sm"
                            />
                        </div>

                        <div className="sm:col-span-6 col-span-12">
                            <label htmlFor="gender" className="block text-[15px] text-gray-700">
                                Student Gender
                            </label>
                            <div className="mt-2 flex items-center gap-4">
                                <label className="flex items-center text-gray-600">
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="Male"
                                        checked={formData.gender === "Male"}
                                        onChange={handleChange}
                                        ref={(el) => (inputRefs.current[2] = el)} // Assign ref
                                        onKeyDown={(e) => handleKeyDown(e, 2)}
                                        className="h-4 w-4 text-[#6cb049] border-gray-300 focus:ring-[#6cb049]"
                                    />
                                    <span className="ml-2 text-sm">Male</span>
                                </label>
                                <label className="flex items-center text-gray-600">
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="Female"
                                        checked={formData.gender === "Female"}
                                        onChange={handleChange}
                                        className="h-4 w-4 text-[#6cb049] border-gray-300 focus:ring-[#6cb049]"
                                    />
                                    <span className="ml-2 text-sm">Female</span>
                                </label>
                                <label className="flex items-center text-gray-600">
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="Other"
                                        checked={formData.gender === "Other"}
                                        onChange={handleChange}
                                        className="h-4 w-4 text-[#6cb049] border-gray-300 focus:ring-[#6cb049]"
                                    />
                                    <span className="ml-2 text-sm">Other</span>
                                </label>
                            </div>
                        </div>



                        <div className="sm:col-span-6 col-span-12">
                            <label className="block text-[15px] text-gray-700">Phone Number <span className=" text-red-700">*</span></label>
                            <PhoneInput
                                country={"in"}
                                value={formData.studentContact.phoneNumber}
                                inputProps={{
                                    ref: (el) => (inputRefs.current[3] = el), // Assign ref
                                    onKeyDown: (e) => handleKeyDown(e, 3),
                                }}
                                onChange={(phone) =>
                                    setFormData({
                                        ...formData,
                                        studentContact: { ...formData.studentContact, phoneNumber: phone },
                                    })
                                }
                                className="w-full rounded-0"
                            />
                        </div>

                        <div className="sm:col-span-6 col-span-12">
                            <label className="block text-[15px] text-gray-700">Whatsapp Number</label>
                            <PhoneInput
                                country={"in"}
                                value={formData.studentContact.whatsappNumber}
                                inputProps={{
                                    ref: (el) => (inputRefs.current[4] = el), // Assign ref
                                    onKeyDown: (e) => handleKeyDown(e, 4),
                                }}
                                onChange={(phone) =>
                                    setFormData({
                                        ...formData,
                                        studentContact: { ...formData.studentContact, whatsappNumber: phone },
                                    })
                                }
                                className="w-full rounded-0"
                            />
                        </div>
                        <div className="sm:col-span-6 col-span-12">
                            <label htmlFor="assignedToreq" className="block text-[15px] text-gray-700">
                                Assigned To
                            </label>
                            <select name="assignedToreq" value={formData.assignedToreq} id="" onChange={handleChange} className="block w-full px-2 py-2 text-gray-500 bg-white border border-gray-200  placeholder:text-gray-400 focus:border-[#6cb049] focus:outline-none focus:ring-[#6cb049] sm:text-sm">
                            <option value=""  >Select name (Not Assign)</option>

                                {user
                                    .filter((user) => user.usertype !== "2" && user._id !== adminid)
                                    .map((filteredUser) => (
                                        <option key={filteredUser._id} value={filteredUser._id}>
                                            {filteredUser.name}
                                        </option>
                                    ))
                                }
                            </select>

                        </div>


                        <div className="sm:col-span-6 col-span-12">
                            <label htmlFor="lastgrade" className="block text-[15px] text-gray-700">
                                Grade
                            </label>
                            <select
                                name="lastgrade"
                                value={formData.lastgrade}
                                id="lastgrade"
                                onChange={handleChange}
                                className="block w-full px-2 py-2 text-gray-500 bg-white border border-gray-200 placeholder:text-gray-400 focus:border-[#6cb049] focus:outline-none focus:ring-[#6cb049] sm:text-sm"
                            >
                                <option value="" disabled>
                                    Select Grade
                                </option>
                                <option value="Null">Not Defined</option>
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                            </select>
                        </div>

                        {formData.studentContact.city === 'Jaipur' ? (
                            <div className="sm:col-span-6 col-span-12">
                                <label htmlFor="city" className="block text-[15px] text-gray-700">
                                    City
                                </label>
                                <select name="studentContact.city" ref={(el) => (inputRefs.current[9] = el)} // Assign ref
                                    onKeyDown={(e) => handleKeyDown(e, 9)} value={formData.studentContact.city} onChange={handleChange} className="block w-full px-2 py-2 text-gray-500 bg-white border border-gray-200  placeholder:text-gray-400 focus:border-[#6cb049] focus:outline-none focus:ring-[#6cb049] sm:text-sm">
                                    <option value="" disabled selected>Select City</option>
                                    <option value="Jaipur" >Jaipur</option>
                                    <option value="Out of Jaipur" >Out of Jaipur</option>

                                </select>

                            </div>

                        ) : (

                            <div className="sm:col-span-6 col-span-12">
                                <label htmlFor="city" className="block text-[15px] text-gray-700">
                                    City
                                </label>
                                <select name="studentContact.city" ref={(el) => (inputRefs.current[10] = el)} // Assign ref
                                    onKeyDown={(e) => handleKeyDown(e, 10)} value={formData.studentContact.city} onChange={handleChange} className="block w-full px-2 py-2 text-gray-500 bg-white border border-gray-200  placeholder:text-gray-400 focus:border-[#6cb049] focus:outline-none focus:ring-[#6cb049] sm:text-sm">
                                    <option value="" disabled selected>Select City</option>
                                    {Citylist.map((stateItem, index) =>
                                        stateItem.cities.map((city, cityIndex) => (
                                            <option key={cityIndex} value={city}>
                                                {city}
                                            </option>
                                        ))
                                    )}
                                </select>

                            </div>
                        )}


                        <div className="sm:col-span-6 col-span-12">
                            <label htmlFor="studentContact.address" className="block text-[15px] text-gray-700">
                                Address
                            </label>
                            <Address
                                value={formData.studentContact.address}
                                onChange={handleChange}
                                ref={(el) => (inputRefs.current[10] = el)} // Assign ref
                                onKeyDown={(e) => handleKeyDown(e, 10)}
                            />
                        </div>



                        {formData.referenceid !== 'Online' || interestStatus === 'Interested' ? (
                            <>





                                <div className="sm:col-span-6 col-span-12">
                                    <label htmlFor="qualification" className="block text-[15px] text-gray-700">
                                        Qualification
                                    </label>
                                    <input
                                        type="text"
                                        name="qualification"
                                        placeholder="Enter Qualification"
                                        value={formData.qualification}
                                        ref={(el) => (inputRefs.current[5] = el)} // Assign ref
                                        onKeyDown={(e) => handleKeyDown(e, 5)}
                                        onChange={handleChange}
                                        className="block w-full px-2 py-2 text-gray-500 bg-white border border-gray-200  placeholder:text-gray-400 focus:border-[#6cb049] focus:outline-none focus:ring-[#6cb049] sm:text-sm"
                                    />
                                </div>


                                <div className="sm:col-span-6 col-span-12">
                                    <label htmlFor="profession" className="block text-[15px] text-gray-700">
                                        Profession
                                    </label>
                                    <select
                                        name="profession"
                                        value={formData.profession}
                                        onChange={handleChange}
                                        ref={(el) => (inputRefs.current[6] = el)} // Assign ref
                                        onKeyDown={(e) => handleKeyDown(e, 6)}
                                        className="block w-full px-2 py-2 text-gray-500 bg-white border border-gray-200 placeholder:text-gray-400 focus:border-[#6cb049] focus:outline-none focus:ring-[#6cb049] sm:text-sm"
                                    >
                                        <option value="" disabled>Select Profession</option>
                                        <option value="Student">Student</option>
                                        <option value="Working">Working</option>
                                    </select>
                                </div>

                                {formData.profession === 'Working' && (
                                    <div className="sm:col-span-6 col-span-12">
                                        <label htmlFor="professiontype" className="block text-[15px] text-gray-700">
                                            Work
                                        </label>
                                        <input
                                            type="text"
                                            name="professiontype"
                                            placeholder="Enter work type"
                                            value={formData.professiontype}
                                            onChange={handleChange}
                                            className="block w-full px-2 py-2 text-gray-500 bg-white border border-gray-200 placeholder:text-gray-400 focus:border-[#6cb049] focus:outline-none focus:ring-[#6cb049] sm:text-sm"
                                        />
                                    </div>
                                )}


                                <div className="sm:col-span-6 col-span-12">
                                    <label htmlFor="category" className="block text-[15px] text-gray-700">
                                        Category
                                    </label>
                                    <select name="category" ref={(el) => (inputRefs.current[7] = el)} // Assign ref
                                        onKeyDown={(e) => handleKeyDown(e, 7)} value={formData.category} id="" onChange={handleChange} className="block w-full px-2 py-2 text-gray-500 bg-white border border-gray-200  placeholder:text-gray-400 focus:border-[#6cb049] focus:outline-none focus:ring-[#6cb049] sm:text-sm">
                                        <option value="" selected>Select category</option>
                                        <option value="General">General</option>
                                        <option value="ST">ST</option>
                                        <option value="SC">SC</option>
                                        <option value="OBC">OBC</option>
                                        <option value="Other">Other</option>
                                    </select>

                                </div>

                                <div className="sm:col-span-6 col-span-12">
                                    <label htmlFor="courseInterest" className="block text-[15px] text-gray-700">
                                        Course Interest
                                    </label>
                                    <select name="courseInterest" ref={(el) => (inputRefs.current[8] = el)} // Assign ref
                                        onKeyDown={(e) => handleKeyDown(e, 8)} value={formData.courseInterest} id="" onChange={handleChange} className="block w-full px-2 py-2 text-gray-500 bg-white border border-gray-200  placeholder:text-gray-400 focus:border-[#6cb049] focus:outline-none focus:ring-[#6cb049] sm:text-sm">
                                        <option value="" disabled selected>Select Course</option>
                                        <option value="All Courses">All Course</option>
                                        {allCourses.map((allCourses, index) => (
                                            <option key={index} value={allCourses._id}>{allCourses.course_name}</option>
                                        ))}
                                    </select>

                                </div>




                                <div className="sm:col-span-6 col-span-12">
                                    <label htmlFor="deadline" className="block text-[15px] text-gray-700">
                                        Deadline
                                    </label>
                                    <div className=" relative">
                                        <input
                                            type="date"
                                            name="deadline"
                                            value={formData.deadline}
                                            onChange={handleChange}
                                       
                                            ref={(el) => (inputRefs.current[11] = el)} // Assign ref
                                            onKeyDown={(e) => handleKeyDown(e, 11)}
                                            className="block w-full px-2 py-2 text-gray-500 bg-white border border-gray-200 placeholder:text-gray-400 focus:border-[#6cb049] focus:outline-none focus:ring-[#6cb049] sm:text-sm"
                                        />
                                        <span className="absolute top-0 left-0  bottom-0 flex items-center justify-center px-2 py-2 text-gray-500 bg-white border border-r-0  text-sm">
                                            {displayDate ? displayDate : "select deadline"}
                                        </span>
                                    </div>
                                </div>


                                <div className="sm:col-span-6 col-span-12">
                                    <label htmlFor="branch" className="block text-[15px] text-gray-700">
                                        Branch
                                    </label>
                                    <select name="branch" disabled ref={(el) => (inputRefs.current[12] = el)} // Assign ref
                                        onKeyDown={(e) => handleKeyDown(e, 12)} value={formData.branch} id="" onChange={handleChange} className="block w-full px-2 py-2 text-gray-500 bg-white border border-gray-200  placeholder:text-gray-400 focus:border-[#6cb049] focus:outline-none focus:ring-[#6cb049] sm:text-sm">
                                        <option value={adminbranch} disabled selected>{adminbranch}</option>

                                    </select>

                                </div>

                                <div className="sm:col-span-6 col-span-12">
                                    <label htmlFor="interestStatus" className="block text-[15px] text-gray-700">
                                        Status <span className=" text-xs bg-blue-200 px-2 rounded-md text-white">Only fill out if you are calling the user.</span>
                                    </label>
                                    <select
                                        id="interestStatus"
                                        value={interestStatus}
                                        onChange={handleInterestChange}
                                        ref={(el) => (inputRefs.current[13] = el)} // Assign ref
                                        onKeyDown={(e) => handleKeyDown(e, 13)}
                                        className="block w-full px-2 py-2 text-gray-500 bg-white border border-gray-200 placeholder:text-gray-400 focus:border-[#6cb049] focus:outline-none focus:ring-[#6cb049] sm:text-sm"
                                    >
                                        <option value="" disabled>Select Interest Status</option>

                                        <option value="interested">Interested</option>
                                        <option value="not_interested">Not Interested</option>

                                        <option value="not_connected">Not Connected</option>
                                        <option value="not_lifting">Not Lifting</option>
                                        <option value="wrong_no">Wrong Number</option>
                                    </select>
                                </div>




                                <div className="col-span-12">
                                    <label htmlFor="notes" className="block text-[15px] text-gray-700">
                                        Notes
                                    </label>
                                    <textarea
                                        type="text"
                                        name="notes"
                                        placeholder="Write Note"
                                        value={formData.notes}
                                        ref={(el) => (inputRefs.current[14] = el)} // Assign ref
                                        onKeyDown={(e) => handleKeyDown(e, 14)}
                                        onChange={handleChange}
                                        className="block w-full px-2 py-2 text-gray-500 bg-white border border-gray-200  placeholder:text-gray-400 focus:border-[#6cb049] focus:outline-none focus:ring-[#6cb049] sm:text-sm"
                                    />
                                </div>

                            </>
                        ) : (
                            <div className="sm:col-span-6 col-span-12">
                                <label htmlFor="interestStatus" className="block text-[15px] text-gray-700">
                                    Status
                                </label>
                                <select
                                    id="interestStatus"
                                    value={interestStatus}
                                    onChange={handleInterestChange}
                                    className="block w-full px-2 py-2 text-gray-500 bg-white border border-gray-200 placeholder:text-gray-400 focus:border-[#6cb049] focus:outline-none focus:ring-[#6cb049] sm:text-sm"
                                >
                                    <option value="" disabled>Select Interest Status</option>
                                    <option value="Interested">Interested</option>

                                    <option value="not_interested">Not Interested</option>

                                    <option value="not_connected">Not Connected</option>
                                    <option value="not_lifting">Not Lifting</option>
                                    <option value="wrong_no">Wrong Number</option>
                                </select>
                            </div>
                        )}

                    </div>



                    {/* Submit button */}
                    <div>
                        <button
                            type="submit"
                            disabled={!isFormValid || loading}
                            className={`${!isFormValid || loading ? "bg-gray-400" : "bg-[#6cb049]"
                                } text-white w-full font-bold py-2 px-4 rounded-md`}
                        >
                            {loading ? "Submitting..." : "Update Query"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
