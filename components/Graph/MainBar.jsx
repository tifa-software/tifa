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

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 600,
      easing: "easeOutCubic",
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#29234b",
        titleColor: "#fff",
        bodyColor: "#fff",
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#29234b" },
      },
      y: {
        grid: { color: "rgba(0,0,0,0.05)" },
        ticks: { color: "#29234b" },
      },
    },
  }), []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/Graph/comequeries/default?year=${year}`);
        const result = res.data.data || [];

        const formatted = monthNames.map((m, i) => {
          const found = result.find((r) => r.month === i + 1);
          return found ? found.totalQueries : 0;
        });

        setData(formatted);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [year, monthNames]);

  const chartData = useMemo(
    () => ({
      labels: monthNames,
      datasets: [
        {
          label: `Queries (${year})`,
          data,
          backgroundColor: "#6cb049",
          borderRadius: 6,
          barPercentage: 0.6,
        },
      ],
    }),
    [data, year, monthNames]
  );

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
          {[0, 1, 2].map((i) => {
            const y = new Date().getFullYear() - i;
            return <option key={y} value={y}>{y}</option>;
          })}
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
