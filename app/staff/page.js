"use client";

import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Loader2,
  Inbox,
  Presentation,
  CheckCircle2,
  Star,
  Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function Page() {
  const { data: session, status } = useSession();

  const [stats, setStats] = useState(null);
  const [adminId, setAdminId] = useState(null);
  const [adminName, setAdminName] = useState(null);

  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState("");

  const loading = loadingAdmin || loadingStats || status === "loading";

  // Fetch admin details
  useEffect(() => {
    if (!session?.user?.email) return;

    const fetchAdminData = async () => {
      try {
        setLoadingAdmin(true);
        setError("");

        const response = await axios.get(
          `/api/admin/find-admin-byemail/${session.user.email}`
        );

        setAdminId(response.data?._id || null);
        setAdminName(response.data?.name || null);

        if (!response.data?._id) {
          setError("Unable to find staff profile for this account.");
        }
      } catch (err) {
        console.error("Error fetching admin data:", err);
        setError("Failed to load staff profile. Please try again.");
      } finally {
        setLoadingAdmin(false);
      }
    };

    fetchAdminData();
  }, [status, session]);

  // Fetch stats (reusable for retry)
  const fetchStats = useCallback(async () => {
    if (!adminId) return;

    try {
      setLoadingStats(true);
      setError("");

      const res = await axios.get(`/api/staffdash/${adminId}`);

      if (res.data?.success) {
        setStats(res.data);
      } else {
        setError(res.data?.message || "Failed to load dashboard statistics.");
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
      setError("Something went wrong while loading statistics.");
    } finally {
      setLoadingStats(false);
    }
  }, [adminId]);

  useEffect(() => {
    if (adminId) {
      fetchStats();
    }
  }, [adminId, fetchStats]);


  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-6 sm:px-6 lg:px-10">
      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              Staff Panel
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900">
              Query Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Quick overview of your queries, demos, enrollments & priorities.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 bg-white px-3 py-2 rounded-xl shadow-sm border border-slate-100">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-1 animate-pulse" />
              <span>Staff:</span>
              <span className="font-semibold text-slate-800">
                {adminName || "--"}
              </span>
            </div>
            {loadingStats && (
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Refreshing stats...
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Error state */}
      {error && !loading && (
        <div className="max-w-xl mb-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">Something went wrong</p>
              <p className="mt-1 text-xs text-red-700/90">{error}</p>
            </div>
            {adminId && (
              <button
                onClick={fetchStats}
                className="ml-2 inline-flex items-center gap-1 rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 transition"
              >
                <Loader2
                  className={`h-3 w-3 ${loadingStats ? "animate-spin" : "opacity-60"
                    }`}
                />
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </section>
      )}

      {/* Dashboard Data */}
      {!loading && !error && stats && (
        <>
          {/* Summary Cards */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-6">
            <StatCard
              title="Total Queries"
              value={stats.totalQueries}
              subtitle="Normal active queries"
              icon={Inbox}
              badge="Active"
              badgeColor="bg-emerald-50 text-emerald-700"
              href={`/staff/page/allquery`}
            />

            <StatCard
              title="Demo Queries"
              value={stats.totalDemoQueries}
              subtitle="Marked as demo (non-trash)"
              icon={Presentation}
              badge="Demo"
              badgeColor="bg-blue-50 text-blue-700"
              href={`/staff/page/demo`}
            />

            <StatCard
              title="Enroll Queries"
              value={stats.totalEnrollQueries}
              subtitle="Confirmed admissions"
              icon={CheckCircle2}
              badge="Enrolled"
              badgeColor="bg-amber-50 text-amber-700"
              href={`/staff/page/enroll`}
            />

            <StatCard
              title="Important"
              value={stats.totalImportantQueries}
              subtitle="High priority follow-up"
              icon={Star}
              badge="High Priority"
              badgeColor="bg-fuchsia-50 text-fuchsia-700"
              href={`/staff/page/important`}
            />

            <StatCard
              title="Trash"
              value={stats.totalTrashQueries}
              subtitle="Closed / discarded queries"
              icon={Trash2}
              badge="Trash"
              badgeColor="bg-slate-100 text-slate-600"
              href={`/staff/page/trash`}
            />
          </section>

         
        </>
      )}
    </div>
  );
}

/**
 * Stat card component
 */
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  badgeColor,
  href = "#",
}) {
  return (
    <Link
      href={href}
      className="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-100 px-4 py-4 flex flex-col gap-3 transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400/40 via-sky-400/40 to-fuchsia-400/40" />
      <div className="flex items-start justify-between gap-2 mt-1">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {title}
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {typeof value === "number" ? value : 0}
          </p>
        </div>
        <div className="inline-flex items-center justify-center rounded-2xl bg-slate-50 p-2">
          <Icon className="h-5 w-5 text-slate-500" />
        </div>
      </div>
      {subtitle && (
        <p className="text-xs text-slate-500 leading-snug line-clamp-2">
          {subtitle}
        </p>
      )}
      {badge && (
        <span
          className={`mt-auto inline-flex w-fit rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${badgeColor}`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

/**
 * Skeleton card for loading state
 */
function StatCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-100 px-4 py-4 animate-pulse">
      <div className="absolute inset-x-0 top-0 h-1 bg-slate-100" />
      <div className="flex items-start justify-between gap-2 mt-1">
        <div className="space-y-2">
          <div className="h-3 w-16 rounded-full bg-slate-100" />
          <div className="h-6 w-12 rounded-full bg-slate-100" />
        </div>
        <div className="h-8 w-8 rounded-2xl bg-slate-100" />
      </div>
      <div className="mt-3 h-3 w-28 rounded-full bg-slate-100" />
      <div className="mt-4 h-4 w-16 rounded-full bg-slate-100" />
    </div>
  );
}
