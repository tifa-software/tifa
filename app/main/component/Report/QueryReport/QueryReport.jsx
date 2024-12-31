"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Loader from "@/components/Loader/Loader";
import Table from "../../Table/Table";
import * as XLSX from "xlsx";

export default function QueryReport() {
  const [allquery, setAllquery] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [referenceId, setReferenceId] = useState("");
  const [suboption, setSuboption] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [admission, setAdmission] = useState("");
  const [grade, setGrade] = useState("");
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [assignedName, setAssignedName] = useState("");
  const [referenceData, setReferenceData] = useState([]);
  const [branches, setBranches] = useState([]);
  const [user, setuser] = useState([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedReference, setSelectedReference] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const userResponse = await axios.get("/api/admin/fetchall/admin");
        setuser(userResponse.data.fetch);
        const branchesResponse = await axios.get("/api/branch/fetchall/branch");
        setBranches(branchesResponse.data.fetch);
        const referenceResponse = await axios.get("/api/reference/fetchall/reference");
        setReferenceData(referenceResponse.data.fetch);
      } catch (error) {
        console.error("Error fetching data:", error);
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
          suboption,
          fromDate,
          toDate,
          admission,
          grade,
          location,
          city,
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
    setIsFilterModalOpen(false); // Close modal
    fetchFilteredData();
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(allquery);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Query Data");


    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().slice(0, 10);
    const fileName = `Report_${formattedDate}.xlsx`;

    XLSX.writeFile(wb, fileName);
  };


  const getFilterSummary = () => {
    const filters = [];
    if (referenceId) filters.push(`Reference: ${referenceId}`);
    if (suboption) filters.push(`Suboption: ${suboption}`);
    if (fromDate) filters.push(`From Date: ${fromDate}`);
    if (toDate) filters.push(`To Date: ${toDate}`);
    if (admission) filters.push(`Admission: ${admission === "true" ? "Enroll" : "Not Enroll"}`);
    if (grade) filters.push(`Grade: ${grade}`);
    if (location) filters.push(`Branch: ${location}`);
    if (city) filters.push(`City: ${city}`);
    if (assignedName) filters.push(`Assigned Name: ${assignedName}`);
    return filters.length > 0 ? filters.join(" | ") : "No filters applied.";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader />
      </div>
    );
  }



  const handleReferenceChange = (e) => {
    const selectedName = e.target.value;
    setReferenceId(selectedName);
    const reference = referenceData.find((data) => data.referencename === selectedName);
    setSelectedReference(reference || null);
  };
  return (
    <>
      <div className="mt-12 container lg:w-[90%] mx-auto">
        <div className="flex justify-between gap-5 items-center">

          <div className="py-3 px-4 flex-auto mb-4 bg-blue-100 text-blue-800 rounded-lg shadow-md flex justify-between items-center">
            <span className="text-sm font-medium">{getFilterSummary()}</span>

          </div>
          <div>
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="mb-4 bg-blue-500 text-white px-4 py-2 rounded shadow-md hover:bg-blue-600 transition duration-200"
            >
              Open Filters
            </button>
            <button
              onClick={exportToExcel}
              className="ml-4 bg-green-500 text-white px-4 py-2 rounded shadow-md hover:bg-green-600 transition duration-200"
            >
              Export to Excel
            </button>
          </div>
        </div>
        <Table data={allquery} />
      </div>

      {/* Filter Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 transition-opacity duration-300">
          <div className="bg-white rounded-lg shadow-lg p-6 w-[90%] md:w-[60%] lg:w-[40%] animate-fadeIn">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
              Filter Options
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reference</label>
                  <select
                    value={referenceId}
                    onChange={handleReferenceChange}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  >
                    <option value="">All</option>
                    {referenceData.map((data) => (
                      <option key={data._id} value={data.referencename}>
                        {data.referencename}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedReference?.referencename === "Online" && selectedReference.suboptions?.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">Suboptions</label>
                    <select
                      value={suboption}
                      onChange={(e) => setSuboption(e.target.value)}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                    >
                      <option value="">All</option>
                      {selectedReference.suboptions.map((suboption, index) => (
                        <option key={index} value={suboption.name}>
                          {suboption.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Admission</label>
                <select
                  value={admission}
                  onChange={(e) => setAdmission(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                >
                  <option value="">All</option>
                  <option value="true">Enroll</option>
                  <option value="false">Not Enroll</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Grade</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                >
                  <option value="">All</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Branch</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                >
                  <option value="">All</option>
                  {branches.map((data) => (
                    <option key={data._id} value={data.branch_name}>
                      {data.branch_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">City</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                >
                  <option value="">All</option>
                  <option value="Jaipur">Jaipur</option>
                  <option value="out">Out Of Jaipur</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Assigned Name</label>
                <select
                  value={assignedName}
                  onChange={(e) => setAssignedName(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                >
                  <option value="">All</option>
                  {user.map((data) => (
                    <option key={data._id} value={data.name}>
                      {data.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-4">
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="bg-gray-400 text-white px-4 py-2 rounded-lg shadow-md hover:bg-gray-500 transition duration-200"
              >
                Close
              </button>
              <button
                onClick={handleFilter}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600 transition duration-200"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
