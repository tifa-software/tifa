"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Page() {
  const [pieData, setPieData] = useState(null);
  const [loading, setLoading] = useState(true);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#333",
          font: {
            size: 14,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (tooltipItem) => {
            const label = tooltipItem.label || "";
            const value = tooltipItem.raw || 0;
            return `${label}: ${value}`;
          },
        },
      },
    },
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await axios.get("/api/Graph/Status/default");
        const result = data.fetch;

        if (!result?.length) {
          setPieData(null);
          return;
        }

        setPieData({
          labels: result.map((item) => item.label),
          datasets: [
            {
              label: "Queries Overview",
              data: result.map((item) => item.value),
              backgroundColor: ["#F7CB73", "#6cb049", "#C3615E"],
              borderWidth: 1,
              hoverOffset: 10,
            },
          ],
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        setPieData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-6 bg-white rounded-2xl shadow-md transition-all duration-300 hover:shadow-lg">
      <h3 className="text-lg font-semibold text-center text-[#333] mb-4">
        Query Status Overview
      </h3>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-[#6cb049] rounded-full" />
        </div>
      ) : pieData ? (
        <div className="h-80 flex items-center justify-center animate-fade-in">
          <Pie data={pieData} options={options} />
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-500 italic">
          No data available
        </div>
      )}
    </div>
  );
}
