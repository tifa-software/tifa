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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("/api/Graph/Work/default");
        const { dateWiseUpdates } = res.data.data;

        const monthNames = [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];

        const labels = dateWiseUpdates.map(
          (item) => `${monthNames[item.month - 1]} ${item.year} — Week ${item.week}`
        );
        const data = dateWiseUpdates.map((item) => item.updatedCount);

        setLineData({
          labels,
          datasets: [
            {
              label: "Weekly Updates",
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

    fetchData();
  }, []);

  return (
    <div className="p-4 bg-white/70 backdrop-blur-md shadow-xl rounded-xl">
      <h3 className="text-lg font-semibold text-center text-[#6cb049] mb-4">
        Weekly Data Analysis
      </h3>
      <div className="h-72 transition-all duration-500">
        <Line data={lineData} options={options} />
      </div>
    </div>
  );
}
