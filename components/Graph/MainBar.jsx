"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Page() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState("");
  const [barData, setBarData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [loadingBar, setLoadingBar] = useState(true);
  const [loadingPie, setLoadingPie] = useState(true);

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];

  // Fetch Bar Data
  useEffect(() => {
    const fetchBarData = async () => {
      setLoadingBar(true);
      try {
        const res = await axios.get(
          `/api/Graph/comequeries/default?year=${year}${month ? `&month=${month}` : ""}`
        );
        const result = res.data.data || [];
        const refs = Array.from(new Set(result.map((r) => r.referenceid)));

        const colors = [
          "#6cb049", "#f59e0b", "#3b82f6",
          "#ef4444", "#8b5cf6", "#d946ef",
          "#10b981", "#0ea5e9"
        ];

        const datasets = refs.map((ref, i) => ({
          label: ref,
          data: month
            ? result.filter((d) => d.referenceid === ref).map((d) => d.totalQueries)
            : monthNames.map((_, idx) => {
                const item = result.find(
                  (d) => d.month === idx + 1 && d.referenceid === ref
                );
                return item ? item.totalQueries : 0;
              }),
          backgroundColor: colors[i % colors.length],
          borderRadius: 6,
        }));

        setBarData(datasets);
      } finally {
        setLoadingBar(false);
      }
    };
    fetchBarData();
  }, [year, month]);

  // Fetch Pie Data
  useEffect(() => {
    const fetchPieData = async () => {
      setLoadingPie(true);
      try {
        const res = await axios.get(
          `/api/Graph/Status/default?year=${year}${month ? `&month=${month}` : ""}`
        );
        setPieData(res.data.fetch || []);
      } finally {
        setLoadingPie(false);
      }
    };
    fetchPieData();
  }, [year, month]);

  const barLabels = month ? [monthNames[month - 1]] : monthNames;

  const barChartData = {
    labels: barLabels,
    datasets: barData,
  };

  const pieChartData = {
    labels: pieData.map((i) => i.label),
    datasets: [
      {
        data: pieData.map((i) => i.value),
        backgroundColor: ["#6cb049", "#3b82f6", "#ef4444"],
        borderWidth: 1,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { x: { stacked: true }, y: { stacked: true } },
  };

  const years = (() => {
    const arr = [];
    const curr = new Date().getFullYear();
    for (let y = curr; y >= 2024; y--) arr.push(y);
    return arr;
  })();

  return (
    <div className="p-6 bg-white/90 backdrop-blur-lg shadow-xl rounded-2xl space-y-8">

      <h3 className="text-2xl font-bold text-center text-[#6cb049] mb-2">
        Query Overview Dashboard
      </h3>

      {/* Filters */}
      <div className="flex gap-4 justify-center">
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="border px-4 py-2 rounded-lg shadow-sm focus:ring-[#6cb049] focus:border-[#6cb049]"
        >
          {years.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>

        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border px-4 py-2 rounded-lg shadow-sm focus:ring-[#6cb049] focus:border-[#6cb049]"
        >
          <option value="">All Months</option>
          {monthNames.map((m, i) => (
            <option key={i} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Same Height Chart Containers */}
        <div className="h-[400px] bg-white rounded-xl shadow-lg p-4 flex items-center justify-center">
          {loadingBar ? (
            <div className="text-gray-500 animate-pulse">Loading Bar Chart...</div>
          ) : (
            <Bar data={barChartData} options={barOptions} />
          )}
        </div>

        <div className="h-[400px] bg-white rounded-xl shadow-lg p-4 flex items-center justify-center">
          {loadingPie ? (
            <div className="text-gray-500 animate-pulse">Loading Pie Chart...</div>
          ) : (
            <Pie data={pieChartData} />
          )}
        </div>

      </div>
    </div>
  );
}
