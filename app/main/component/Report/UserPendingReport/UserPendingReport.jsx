"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Loader from "@/components/Loader/Loader";
import Link from "next/link";
import Queryreport55 from "@/app/main/component/queryreport/Queryreport55"

export default function UserPendingReport() {
  const today = new Date(new Date().setDate(new Date().getDate() - 1))
    .toISOString()
    .split("T")[0];


  const [tasks, setTasks] = useState([]);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [todayActionsMap, setTodayActionsMap] = useState({});

  const [branchId, setBranchId] = useState("");
  const [userId, setUserId] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalInfo, setModalInfo] = useState(null);

  const fetchTodayActions = async () => {
    try {
      // 👉 This should be the route of the API we created earlier
      const res = await axios.get("/api/actiontoday");

      const list = res.data.data || [];
      const map = {};

      // map[adminId] = todayActions
      list.forEach((item) => {
        map[item.adminId] = item.todayActions || 0;
      });

      setTodayActionsMap(map);
      console.log(map)
    } catch (err) {
      console.error("Failed to fetch today actions", err);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await axios.get("/api/branch/fetchall/branch");
      setBranches(res.data.fetch || res.data.data || []);
    } catch {
      setError("Failed to fetch branches");
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get("/api/admin/fetchall/admin");
      const allUsers = res.data.fetch || res.data.data || [];
      setUsers(allUsers);
      setFilteredUsers(allUsers);
    } catch {
      setError("Failed to fetch users");
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const params = { branchId, userId, startDate, endDate };
      const res = await axios.get("/api/dailytaskget", { params });

      setTasks(res.data.data || []);
    } catch {
      setError("Failed to fetch report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchBranches(), fetchUsers(), fetchTodayActions()]).then(() =>
      setLoading(false)
    );
  }, []);


  useEffect(() => {
    if (!branchId) setFilteredUsers(users);
    else setFilteredUsers(users.filter((u) => u.branch === branchId));
    setUserId("");
  }, [branchId, users]);

  useEffect(() => {
    fetchData();
  }, [branchId, userId, startDate, endDate]);

  const openModal = (title, queries) => {
    setModalInfo({
      title,
      queries
    });
  };
  // 1️⃣ Group tasks by branch
  const groupedByBranch = tasks.reduce((acc, item) => {
    const branch = item.user?.branchName || "Unknown Branch";
    if (!acc[branch]) acc[branch] = [];
    acc[branch].push(item);
    return acc;
  }, {});
  const branchStats = Object.keys(groupedByBranch).map(branch => {
    const users = groupedByBranch[branch];

    let todayTotal = 0;
    let pastDueTotal = 0;

    users.forEach(t => {
      todayTotal += t.todayQueries?.length || 0;
      pastDueTotal += t.pastDueQueries?.length || 0;
    });

    return {
      branch,
      todayTotal,
      pastDueTotal
    };
  });

  const closeModal = () => setModalInfo(null);

  return (
    <div className="p-4 w-full">
      <h1 className="text-2xl font-bold mb-5 text-gray-800">
        📋 User Pending Report
      </h1>

      {error && <div className="bg-red-100 text-red-600 p-2 rounded-md mb-4">{error}</div>}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <select
            className="border p-2 rounded-md"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b._id} value={b.branch_name}>
                {b.branch_name}
              </option>
            ))}
          </select>

          <select
            className="border p-2 rounded-md"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="">All Users</option>
            {filteredUsers.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name} ({u.branch})
              </option>
            ))}
          </select>

          <input
            type="date"
            className="border p-2 rounded-md"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <input
            type="date"
            className="border p-2 rounded-md"
            min={startDate}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-9 order-2 lg:order-1">

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader />
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-center text-gray-500">No Data Found</p>
          ) : (
            <div className="space-y-10">

              {Object.keys(groupedByBranch).map((branch) => (
                <div key={branch} className="bg-white rounded-xl shadow-lg border p-6">

                  {/* Branch Title */}
                  <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-5">
                    {branch}
                  </h2>

                  {/* Table */}
                  <div className="overflow-hidden rounded-lg border">
                    <table className="min-w-full text-sm">

                      <thead className="bg-gray-900 text-white">
                        <tr>
                          <th className="px-6 py-3 text-left font-semibold">User</th>
                          <th className="px-6 py-3 text-center font-semibold">Branch</th>
                          <th className="px-6 py-3 text-center font-semibold text-blue-300">
                            Pending
                          </th>
                          <th className="px-6 py-3 text-center font-semibold text-yellow-300">
                            Past Due Pending
                          </th>
                          <th className="px-6 py-3 text-center font-semibold text-yellow-300">
                            Today Action
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y">
                        {groupedByBranch[branch].map((t) => (
                          <tr
                            key={t._id}
                            className="hover:bg-gray-100 transition"
                          >
                            {/* USER NAME */}
                            <td className="px-6 py-4">
                              <p className="font-semibold text-gray-900">{t.user?.name}</p>
                              <p className="text-xs text-gray-500">{t.user?.email}</p>
                            </td>

                            {/* BRANCH */}
                            <td className="px-6 py-4 text-center text-gray-700 font-medium">
                              {t.user?.branchName}
                            </td>

                            {/* TODAY PENDING */}
                            <td
                              className="px-6 py-4 text-blue-600 font-bold underline cursor-pointer text-center"
                              onClick={() => openModal("Today Queries", t.todayQueries)}
                            >
                              {t.todayQueries?.length}
                            </td>

                            {/* PAST DUE */}
                            <td
                              className="px-6 py-4 text-red-600 font-bold underline cursor-pointer text-center"
                              onClick={() => openModal("Past Due Queries", t.pastDueQueries)}
                            >
                              {t.pastDueQueries?.length}
                            </td>

                            <td
                              className="px-6 py-4 text-red-600 font-bold underline cursor-pointer text-center"

                            >
                              {todayActionsMap[t.user?._id] || 0}
                            </td>

                          </tr>
                        ))}
                        {(() => {
                          const totalToday = groupedByBranch[branch].reduce(
                            (sum, t) => sum + (t.todayQueries?.length || 0),
                            0
                          );

                          const totalPast = groupedByBranch[branch].reduce(
                            (sum, t) => sum + (t.pastDueQueries?.length || 0),
                            0
                          );
                          const totalTodayAction = groupedByBranch[branch].reduce(
                            (sum, t) => sum + (todayActionsMap[t.user?._id] || 0),
                            0
                          );

                          return (
                            <tr className="bg-gray-200 font-bold">
                              <td className="px-6 py-4 text-lg">Total</td>
                              <td></td>

                              <td className="px-6 py-4 text-center text-blue-700">
                                {totalToday}
                              </td>

                              <td className="px-6 py-4 text-center text-red-700">
                                {totalPast}
                              </td>

                              <td className="px-6 py-4 text-center text-red-700">
                                {totalTodayAction}
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>

                    </table>
                  </div>
                </div>
              ))}

            </div>
          )}

        </div>
        <div className="col-span-12 lg:col-span-3 order-1 lg:order-2">

          <div className="bg-white rounded-xl shadow-lg border p-6 sticky top-5">

            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Branch Summary
            </h2>

            <div className="space-y-5">
              {branchStats.map((b) => (
                <div
                  key={b.branch}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">
                    {b.branch}
                  </h3>

                  <div className="flex justify-between text-sm font-medium text-gray-700">
                    <span>Current Date Pending</span>
                    <span className="text-blue-600 font-bold">{b.todayTotal}</span>
                  </div>

                  <div className="flex justify-between text-sm font-medium text-gray-700 mt-2">
                    <span>Past Due Pending</span>
                    <span className="text-red-600 font-bold">{b.pastDueTotal}</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>
      {/* Table */}



      {/* Modal */}
      {modalInfo && (
        <QueryModal
          title={modalInfo.title}
          queries={modalInfo.queries}
          closeModal={closeModal}
        />
      )}
    </div>
  );
}


// ================== MODAL COMPONENT ==================
function QueryModal({ title, queries, closeModal }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeQuery, setActiveQuery] = useState(null);
  const handleOpenModal = (queryContent) => {
    setActiveQuery(queryContent);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setActiveQuery(null);
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={closeModal}
    >
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl overflow-hidden shadow-2xl border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 flex justify-between items-center">
          <h2 className="text-white text-lg font-semibold">
            {title} ({queries?.length || 0})
          </h2>
          <button
            onClick={closeModal}
            className="text-white hover:text-gray-200 transition transform hover:scale-110"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 max-h-[450px] overflow-y-auto">
          {queries?.length > 0 ? (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-gray-100 shadow-sm">
                <tr className="text-gray-700 font-medium">
                  <th className="border px-3 py-2 text-start">Name</th>
                  <th className="border px-3 py-2 text-center">Phone</th>
                  <th className="border px-3 py-2 text-center">City</th>
                  <th className="border px-3 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {queries.map((q) => (
                  <tr
                    key={q._id}
                    className="hover:bg-blue-50 transition-colors border-b last:border-none"
                  >
                    <td className="px-3 py-2 font-semibold text-gray-800">
                      {q.studentName}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-700">
                      {q.studentContact.phoneNumber}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-700">
                      {q.studentContact.city}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => handleOpenModal(`${q._id}`)}>
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500 py-8 text-sm">
              No Queries Available
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-100 border-t text-right">
          <button
            onClick={closeModal}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium shadow hover:bg-blue-700 transition active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
      {isModalOpen && (
        <div className="fixed bg-white inset-0 z-50 flex items-center justify-center  overflow-auto">
          <div className="   h-screen w-screen  relative">
            <button
              className="absolute top-0 text-3xl bg-red-200 hover:bg-red-600 rounded-bl-full w-16 flex justify-center items-center  right-0 border text-white"
              onClick={handleCloseModal}
            >
              &times;
            </button>
            <div><Queryreport55 id={activeQuery} /></div>
          </div>
        </div>
      )}
    </div>
  );
}

