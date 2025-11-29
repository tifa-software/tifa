"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend);

export default function Page() {
  const [lineData, setLineData] = useState({ labels: [], datasets: [] });
  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: "easeOutQuart" },
    plugins: {
      legend: { display: false },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: { ticks: { color: "#29234b" }, grid: { display: false } },
      y: { ticks: { color: "#29234b" }, grid: { color: "rgba(0,0,0,0.05)" } },
    },
  };

  const fetchData = async () => {
    try {
      const res = await axios.get("/api/Graph/Work/default");
      let { dateWiseUpdates } = res.data.data;

      // Filter by month/year if selected
      if (monthFilter) dateWiseUpdates = dateWiseUpdates.filter(d => d.month === parseInt(monthFilter));
      if (yearFilter) dateWiseUpdates = dateWiseUpdates.filter(d => d.year === parseInt(yearFilter));

      const labels = dateWiseUpdates.map(
        (item) => `${item.day} ${monthNames[item.month - 1]} ${item.year}`
      );
      const data = dateWiseUpdates.map((item) => item.updatedCount);

      setLineData({
        labels,
        datasets: [
          {
            label: "Daily Updates",
            data,
            borderColor: "#6cb049",
            backgroundColor: "rgba(108, 176, 73, 0.15)",
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
        ],
      });
    } catch (err) {
      console.error("Error fetching chart data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [monthFilter, yearFilter]);

  return (
    <div className="p-4 bg-white/70 backdrop-blur-md shadow-xl rounded-xl">
      <h3 className="text-lg font-semibold text-center text-[#6cb049] mb-4">
        Daily Data Analysis
      </h3>

      {/* Filters */}
      <div className="flex justify-center gap-4 mb-4">
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">All Months</option>
          {monthNames.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>

        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">All Years</option>
          {Array.from({ length: new Date().getFullYear() - 2024 + 1 }, (_, i) => 2024 + i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

      </div>

      <div className="h-72 transition-all duration-500">
        <Line data={lineData} options={options} />
      </div>
    </div>
  );
}
