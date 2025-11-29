"use client";
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Page() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const monthNames = useMemo(
    () => [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ],
    []
  );

  // Chart options (stacked)
  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      tooltip: {
        backgroundColor: "#29234b",
        titleColor: "#fff",
        bodyColor: "#fff",
      },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { color: "#29234b" } },
      y: { stacked: true, grid: { color: "rgba(0,0,0,0.05)" }, ticks: { color: "#29234b" } },
    },
    animation: { duration: 600, easing: "easeOutCubic" },
  }), []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/Graph/comequeries/default?year=${year}`);
        const result = res.data.data || [];

        // Get all unique references
        const references = Array.from(new Set(result.map(r => r.referenceid)));

        // Assign colors to references
        const colors = ["#6cb049", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#d946ef", "#10b981"];

        // Format datasets
        const datasets = references.map((ref, idx) => ({
          label: ref,
          data: monthNames.map((_, monthIdx) => {
            const found = result.find(d => d.month === monthIdx + 1 && d.referenceid === ref);
            return found ? found.totalQueries : 0;
          }),
          backgroundColor: colors[idx % colors.length],
          borderRadius: 6,
          barPercentage: 0.6,
        }));

        setData(datasets);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [year, monthNames]);

  const chartData = useMemo(() => ({
    labels: monthNames,
    datasets: data,
  }), [data, monthNames]);

  // Dynamic years for dropdown (from 2024 back to 5 years)
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const arr = [];
    for (let y = current; y >= 2024; y--) arr.push(y);
    return arr;
  }, []);

  return (
    <div className="p-4 bg-white/70 backdrop-blur-md shadow-xl rounded-xl transition-all duration-500">
      <h3 className="text-lg font-semibold text-center text-[#6cb049] mb-4">
        Monthly Queries Overview
      </h3>

      <div className="mb-4 flex justify-center">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="px-3 py-2 rounded-md border border-gray-200 text-gray-700 bg-white shadow-sm focus:border-[#6cb049] focus:ring-[#6cb049] outline-none"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-gray-400">
          <div className="animate-pulse">Loading chart...</div>
        </div>
      ) : (
        <div className="h-64">
          <Bar data={chartData} options={options} />
        </div>
      )}
    </div>
  );
}
