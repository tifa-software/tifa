import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Queryadd() {
  const [totalQueries, setTotalQueries] = useState(0);
  const [totalEnrolled, setTotalEnrolled] = useState(0);
  const [totalDemo, setTotalDemo] = useState(0);
  const [totalAutoClosedOpen, setTotalAutoClosedOpen] = useState(0);
  const [totalAutoClosedClose, setTotalAutoClosedClose] = useState(0);

  const [groupedData, setGroupedData] = useState([]);
  const [allClosedQueries, setAllClosedQueries] = useState([]);
  const [allOpenQueries, setAllOpenQueries] = useState([]);
  const [allunderdemoQueries, setAllunderdemoQueries] = useState([]);
  const [allEnrolledQueries, setAllEnrolledQueries] = useState([]);

  const [activeData, setActiveData] = useState([]);
  const [activeLabel, setActiveLabel] = useState("Grouped Data");
  const [activeCard, setActiveCard] = useState("Total Queries");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get("/api/report/addData");
        const data = response.data.data;

        setTotalQueries(data.totalQueries);
        setTotalEnrolled(data.totalEnrolled);
        setTotalDemo(data.totalDemo);
        setTotalAutoClosedOpen(data.totalAutoClosed.open);
        setTotalAutoClosedClose(data.totalAutoClosed.close);

        setGroupedData(data.groupedData);
        setAllClosedQueries(data.allClosedQueries);
        setAllOpenQueries(data.allOpenQueries);
        setAllunderdemoQueries(data.allunderdemoQueries);
        setAllEnrolledQueries(data.allEnrolledQueries);

        setActiveData(data.groupedData); // Default data to display
        setLoading(false);
      } catch (err) {
        setError("Error fetching data");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCardClick = (label) => {
    setActiveCard(label);
    switch (label) {
      case "Total Queries":
        setActiveData(groupedData);
        setActiveLabel("Grouped Data");
        break;
      case "Total Enrolled":
        setActiveData(allEnrolledQueries);
        setActiveLabel("Enrolled Queries");
        break;
      case "Total Demo":
        setActiveData(allunderdemoQueries);
        setActiveLabel("Under Demo Queries");
        break;
      case "Total Open":
        setActiveData(allOpenQueries);
        setActiveLabel("Open Queries");
        break;
      case "Total Closed":
        setActiveData(allClosedQueries);
        setActiveLabel("Closed Queries");
        break;
      default:
        setActiveData([]);
        setActiveLabel("Unknown Data");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-b from-indigo-50 to-indigo-100">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-t-indigo-500 border-indigo-300 rounded-full animate-spin"></div>
          <p className="mt-4 text-lg font-semibold text-indigo-700">
            Loading data, please wait...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-red-50">
        <p className="text-center text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-10 px-6">
      <div className="grid md:grid-cols-4 gap-8">
        {/* Summary Cards */}
        <div className="space-y-6 md:col-span-1">
          {[
            { label: "Total Queries", value: totalQueries },
            { label: "Total Enrolled", value: totalEnrolled },
            { label: "Total Demo", value: totalDemo },
            { label: "Total Open", value: totalAutoClosedOpen },
            { label: "Total Closed", value: totalAutoClosedClose },
          ].map((card, idx) => (
            <div
            key={idx}
            role="button"
            tabIndex={0}
            aria-pressed={activeCard === card.label}
            className={`p-4 shadow-lg transition-all cursor-pointer border-2 rounded-lg ${
              activeCard === card.label
                ? "bg-indigo-600 text-white border-indigo-800 scale-105"
                : "bg-indigo-50 text-gray-700 border-gray-300 "
            }`}
            onClick={() => handleCardClick(card.label)}
            onKeyDown={(e) => e.key === "Enter" && handleCardClick(card.label)}
          >
            <h3 className="text-sm font-medium">{card.label}</h3>
            <p className="text-2xl font-extrabold">{card.value}</p>
          </div>
          
          ))}
        </div>

        {/* Data Display Section */}
        <div className="md:col-span-3">
          <h3 className="text-3xl font-semibold text-indigo-900 mb-6 border-b-2 border-indigo-200 pb-2">
            {activeLabel}
          </h3>
          {activeData.length > 0 ? (
            <ul className="space-y-4 max-h-[500px] overflow-y-auto">
              {activeData.map((item, index) => (
                <li
                  key={index}
                  className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all border border-gray-100"
                >
                  <h4 className="text-xl font-bold text-indigo-800">
                    {item.userName || item.studentName || "Unknown Name"}{" "}
                    {item.userBranch && (
                      <span className="text-sm text-gray-500">
                        ({item.userBranch})
                      </span>
                    )}
                  </h4>
                  <p className="mt-2 text-gray-700">
                    Total Queries: <span className="font-medium">{item.totalQueries || 0}</span>
                  </p>
                  {item.queries && (
                    <table className="mt-4 w-full border-collapse border border-gray-200 text-sm">
                      <thead>
                        <tr className="bg-indigo-100">
                          <th className="border px-4 py-2 text-left text-gray-600">S/N</th>
                          <th className="border px-4 py-2 text-left text-gray-600">Student Name</th>
                          <th className="border px-4 py-2 text-left text-gray-600">Current Branch</th>
                          <th className="border px-4 py-2 text-left text-gray-600">Mobile Number</th>
                          <th className="border px-4 py-2 text-left text-gray-600">Assigned To</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.queries.map((query, idx) => (
                          <tr
                            key={idx}
                            className={`${
                              idx % 2 === 0 ? "bg-gray-50" : "bg-white"
                            }`}
                          >
                            <td className="border px-4 py-2 text-gray-600">{idx + 1}</td>
                            <td className="border px-4 py-2 text-gray-600">{query.studentName}</td>
                            <td className="border px-4 py-2 text-gray-600">{query.branch}</td>
                            <td className="border px-4 py-2 text-gray-600">{query.studentContact.phoneNumber}</td>
                            <td className="border px-4 py-2 text-gray-600">{query.assignedTo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No data available for this category.</p>
          )}
        </div>
      </div>
    </div>
  );
}
