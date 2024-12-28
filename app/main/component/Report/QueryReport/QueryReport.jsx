"use client";
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Loader from "@/components/Loader/Loader";
import Table from "../../Table/Table";

export default function QueryReport() {
  const [allquery, setAllquery] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [referenceId, setReferenceId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [admission, setAdmission] = useState("");
  const [grade, setGrade] = useState("");
  const [location, setLocation] = useState("");
  const [assignedName, setAssignedName] = useState("");
  const [referenceData, setReferenceData] = useState([]);
  const [branches, setBranches] = useState([]);
  const [user, setuser] = useState([]);
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const userResponse = await axios.get('/api/admin/fetchall/admin');
        setuser(userResponse.data.fetch);
        const branchesResponse = await axios.get('/api/branch/fetchall/branch');
        setBranches(branchesResponse.data.fetch);
        const referenceResponse = await axios.get('/api/reference/fetchall/reference');
        setReferenceData(referenceResponse.data.fetch);
      } catch (error) {
        console.error('Error fetching data:', error);
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
      const response = await axios.get("/api/report/fetchall/query", {
        params: {
          referenceId,
          fromDate,
          toDate,
          admission,
          grade,
          location,
          assignedName,
        },
      });
      setAllquery(response.data.fetch);
    } catch (error) {
      console.error("Error fetching filtered data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredData();
  }, []);

  const handleFilter = () => {
    fetchFilteredData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <>
      <div className="mt-12 container lg:w-[90%] mx-auto">
        {/* Filter UI */}
        <div className="mb-6 p-4 bg-gray-100 rounded shadow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Reference ID Filter */}
            <div>
              <label className="block text-sm font-medium">Reference</label>

              <select value={referenceId} className="w-full p-2 border rounded"
                onChange={(e) => setReferenceId(e.target.value)} name="" id="">
                <option value="">All</option>
                {referenceData.map((data) => (
                  <option key={data._id} value={data.referencename}>{data.referencename}</option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>

            {/* Admission Filter */}
            <div>
              <label className="block text-sm font-medium">Admission</label>
              <select
                value={admission}
                onChange={(e) => setAdmission(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">All</option>
                <option value="true">Enroll</option>
                <option value="false">Not Enroll</option>
              </select>
            </div>

            {/* Grade Filter */}
            <div>
              <label className="block text-sm font-medium">Grade</label>
              <select className="w-full p-2 border rounded" name="" id="" value={grade}
                onChange={(e) => setGrade(e.target.value)}>
                <option value="">All</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </div>


            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium">Branch</label>

              <select className="w-full p-2 border rounded" name="" id="" value={location}
                onChange={(e) => setLocation(e.target.value)}>
                <option value="">All</option>
                {branches.map((data) => (
                  <option key={data._id} value={data.branch_name}>{data.branch_name}</option>
                ))}
              </select>
            </div>

            {/* Assigned Name Filter */}
            <div>
              <label className="block text-sm font-medium">Assigned Name</label>

              <select value={assignedName} className="w-full p-2 border rounded"
                onChange={(e) => setAssignedName(e.target.value)} name="" id="">
                <option value="">All</option>
                {user.map((data) => (
                  <option key={data._id} value={data.name}>{data.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Apply Filter Button */}
          <button
            onClick={handleFilter}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Apply Filters
          </button>
        </div>

        {/* Table Component */}
        <Table data={allquery} />
      </div>
    </>
  );
}
