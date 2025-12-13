"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Download, Users, CheckCircle, BarChart3, Target, Filter } from "lucide-react";

export default function Performance() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ branches: [], admins: [] }); 
  const [loading, setLoading] = useState(false);
  
  const [branch, setBranch] = useState("all");
  const [adminName, setAdminName] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  
  const filteredAdminList = useMemo(() => {
    if (branch === "all") return meta.admins;
    return meta.admins.filter((a) => a.branch === branch);
  }, [branch, meta.admins]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { branch, adminName, startDate, endDate };
      const res = await axios.get("/api/FranPerformance/data", { params });
      setData(res.data?.data || []);
      if (res.data?.meta) setMeta(res.data.meta);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset admin selection if it's not in the new filtered list
    if (branch !== "all" && adminName !== "all") {
      const isValid = filteredAdminList.some((a) => a.name === adminName);
      if (!isValid) setAdminName("all");
    }
    fetchData();
  }, [branch, adminName]);

  const stats = useMemo(() => {
    const total = data.reduce((acc, curr) => acc + (Number(curr.totalcount) || 0), 0);
    const enrolls = data.reduce((acc, curr) => acc + (Number(curr.enrollcount) || 0), 0);
    const done = data.reduce((acc, curr) => acc + (Number(curr.workcount) || 0), 0);
    const pending = data.reduce((acc, curr) => acc + (Number(curr.pendingcount) || 0), 0);
    return { total, enrolls, done, req: done + pending };
  }, [data]);

  return (
    <div className="p-6 bg-[#f8fafc] min-h-screen text-slate-900 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 border-b pb-4 border-slate-200">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Performance Analytics</h1>
          <p className="mt-1 text-[11px] text-slate-500 font-medium uppercase tracking-[0.2em]">Branch & Staff Productivity Overview</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 bg-white border border-slate-300 px-3 py-1.5 rounded-md text-[11px] font-semibold hover:bg-slate-50 shadow-sm text-slate-700">
          <Download size={14} />
          <span>Export report</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Leads" value={stats.total} color="blue" icon={<Users size={16}/>} />
        <StatCard title="Target" value={stats.req} color="orange" icon={<Target size={16}/>} />
        <StatCard title="Enrollments" value={stats.enrolls} color="emerald" icon={<CheckCircle size={16}/>} />
        <StatCard title="Work Done" value={stats.done} color="indigo" icon={<BarChart3 size={16}/>} />
      </div>

      {/* Dynamic Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex items-center gap-2 pr-3 mr-1 border-r border-slate-100 text-slate-500">
            <Filter size={14} className="text-slate-400" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Filters</span>
          </div>
          <p className="text-[11px] text-slate-400">Refine by branch, staff and date range to focus on specific performance.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          {/* Branch Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
              Branch
            </label>
            <select 
              className="text-xs border border-slate-200 rounded-md px-2.5 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 font-medium text-slate-700"
              value={branch}
              onChange={(e) => {
                setBranch(e.target.value);
                setAdminName("all"); // Reset admin when branch changes
              }}
            >
              <option value="all">
                🏢 All Branches
              </option>
              {meta.branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Admin Selector - Dependency Logic here */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
              Staff
            </label>
            <select 
              className="text-xs border border-slate-200 rounded-md px-2.5 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 font-medium text-slate-700"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
            >
              <option value="all">👤 All Staff ({branch === 'all' ? 'Global' : branch})</option>
              {filteredAdminList.map((a) => (
                <option key={a._id} value={a.name}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
              Start Date
            </label>
            <input 
              type="date" 
              className="text-xs border border-slate-200 rounded-md px-2.5 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-700 bg-white"
              onChange={(e) => setStartDate(e.target.value)} 
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
              End Date
            </label>
            <div className="flex gap-2">
              <input 
                type="date" 
                className="flex-1 text-xs border border-slate-200 rounded-md px-2.5 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-700 bg-white"
                onChange={(e) => setEndDate(e.target.value)} 
              />
              <button 
                onClick={fetchData} 
                className="whitespace-nowrap bg-slate-900 text-white px-4 py-2 rounded-md text-[11px] font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center"
              >
                REFRESH
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-bold text-slate-500 uppercase">Admin / Branch</th>
              <th className="px-4 py-3 font-bold text-slate-500 uppercase text-center">Inquiry</th>
              <th className="px-4 py-3 font-bold text-slate-500 uppercase text-center">Enrolled</th>
              <th className="px-4 py-3 font-bold text-slate-500 uppercase text-center">Work Status</th>
              <th className="px-4 py-3 font-bold text-slate-500 uppercase w-48">Efficiency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-10 text-center animate-pulse text-slate-400 font-semibold tracking-wide">
                  Updating performance data...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-400 text-[11px]">
                  No performance records found for the selected filters.
                </td>
              </tr>
            ) : data.map((item, index) => {
              const done = Number(item.workcount || 0);
              const pend = Number(item.pendingcount || 0);
              const perf = (done + pend) > 0 ? Math.round((done / (done + pend)) * 100) : 0;
              return (
                <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800">{item.adminName}</div>
                    <div className="text-[9px] text-blue-500 font-extrabold uppercase">{item.adminBranch}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-600">{item.totalcount}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black border border-emerald-200">
                      {item.enrollcount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[10px] font-bold text-slate-500">
                      {done} ✅ / {pend} ⏳
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${perf > 70 ? 'bg-emerald-500' : perf > 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${perf}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 w-8 text-right">{perf}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  const styles = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
  };
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={`p-2.5 rounded-lg border ${styles[color]}`}>{icon}</div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-lg font-black text-slate-800 leading-tight">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}