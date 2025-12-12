"use client";

import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Calendar, Trash2, Users, Database } from "lucide-react";

export default function QueryCountsPanel({ endpoint = "/api/democountall/data" }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [branch, setBranch] = useState(""); // selected branch (id or name)
  const [branches, setBranches] = useState([]); // branch list from server
  const [counts, setCounts] = useState({ total: 0, totalTrash: 0, totalEnroll: 0 });
  const [displayCounts, setDisplayCounts] = useState({ total: 0, totalTrash: 0, totalEnroll: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const mountedRef = useRef(false);

  // fetch counts from server
  const fetchCounts = async (opts = {}) => {
    try {
      setLoading(true);
      setError("");

      const params = {};
      if (opts.fromDate ?? fromDate) params.fromDate = opts.fromDate ?? fromDate;
      if (opts.toDate ?? toDate) params.toDate = opts.toDate ?? toDate;
      if (opts.branch ?? branch) params.branch = opts.branch ?? branch;

      const res = await axios.get(endpoint, { params });
      if (res?.data?.success) {
        const next = {
          total: Number(res.data.total ?? 0),
          totalTrash: Number(res.data.totalTrash ?? 0),
          totalEnroll: Number(res.data.totalEnroll ?? 0),
        };
        setCounts(next);

        // update branches list if server sent it
        if (Array.isArray(res.data.branches)) {
          setBranches(res.data.branches);
        }
      } else {
        setError(res?.data?.message || "Unexpected response from server");
      }
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || e.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  // initial load: fetch counts + branches
  useEffect(() => {
    fetchCounts({ fromDate: "", toDate: "" });
    mountedRef.current = true;
  }, []);

  // smooth counter animation
  useEffect(() => {
    let raf;
    const duration = 600; // ms
    const start = performance.now();
    const from = { ...displayCounts };
    const to = { ...counts };

    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOut
      setDisplayCounts({
        total: Math.round(from.total + (to.total - from.total) * ease),
        totalTrash: Math.round(from.totalTrash + (to.totalTrash - from.totalTrash) * ease),
        totalEnroll: Math.round(from.totalEnroll + (to.totalEnroll - from.totalEnroll) * ease),
      });
      if (t < 1) raf = requestAnimationFrame(step);
    };

    if (mountedRef.current) raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [counts]);

  const onApply = (e) => {
    e.preventDefault();
    fetchCounts();
  };

  const onClear = () => {
    setFromDate("");
    setToDate("");
    setBranch("");
    fetchCounts({ fromDate: "", toDate: "", branch: "" });
  };

  // optionally auto-fetch when branch changes:
  useEffect(() => {
    // avoid initial double-fetch (we already fetched on mount)
    if (!mountedRef.current) return;
    fetchCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Query counts — <span className="text-indigo-600">demo</span></h2>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
          <Database className="w-5 h-5" />
        </div>
      </div>

      <form className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6 items-end">
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-gray-600">From</span>
          <div className="relative">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border rounded-xl px-3 py-2 shadow-sm w-full bg-white"
            />
          </div>
        </label>

        <label className="flex flex-col text-sm">
          <span className="mb-1 text-gray-600">To</span>
          <div className="relative">
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border rounded-xl px-3 py-2  shadow-sm w-full bg-white"
            />
          </div>
        </label>

        <label className="flex flex-col text-sm">
          <span className="mb-1 text-gray-600">Branch</span>
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="border rounded-xl px-3 py-2 shadow-sm w-full bg-white"
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b.branch_name}>
                {b.branch_name}
              </option>
            ))}
          </select>
        </label>

        <div className="md:col-span-2 flex gap-2 justify-start md:justify-end">
          <button
            onClick={onApply}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl shadow-md disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Loading..." : "Apply"}
          </button>

          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl shadow-sm"
            disabled={loading}
          >
            Clear
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-100 text-red-700 p-4 flex items-start gap-3">
          <div className="font-medium">Error</div>
          <div className="text-sm">{error}</div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total" value={displayCounts.total} icon={<Database className="w-6 h-6" />} loading={loading} />
        <StatCard title="Enrolled" value={displayCounts.totalEnroll} icon={<Users className="w-6 h-6" />} loading={loading} accent="indigo" />
        <StatCard title="Trash" value={displayCounts.totalTrash} icon={<Trash2 className="w-6 h-6" />} loading={loading} accent="rose" />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, loading, accent = "gray" }) {
  return (
    <div className={`p-5 rounded-2xl shadow-md bg-gradient-to-br from-white to-gray-50 border border-gray-100`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-${accent}-100/60 border ${accent === 'gray' ? 'border-gray-100' : ''}`}>
            {icon}
          </div>
          <div>
            <div className="text-sm text-gray-500">{title}</div>
            <div className="text-2xl md:text-3xl font-extrabold mt-1">{loading ? <SkeletonNumber /> : value.toLocaleString()}</div>
          </div>
        </div>
        <div className="text-sm text-gray-400">{/* reserved for sparkline or delta */}</div>
      </div>
    </div>
  );
}

function SkeletonNumber() {
  return (
    <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
  );
}
