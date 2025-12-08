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
  const [adminbranch, setAdminbranch] = useState(null);
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
        setAdminbranch(response.data?.branch || null);

        if (!response.data?._id) {
          setError("Unable to find branch profile for this account.");
        }
      } catch (err) {
        console.error("Error fetching admin data:", err);
        setError("Failed to load branch profile. Please try again.");
      } finally {
        setLoadingAdmin(false);
      }
    };

    fetchAdminData();
  }, [status, session]);

  // Fetch stats (reusable for retry)
  const fetchStats = useCallback(async () => {
    if (!adminId || !adminbranch) return;

    try {
      setLoadingStats(true);
      setError("");

      const res = await axios.get(`/api/branchdash/${adminId}/${adminbranch}`);

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
  }, [adminId, adminbranch]);

  useEffect(() => {
    if (adminId && adminbranch) {
      fetchStats();
    }
  }, [adminId, adminbranch, fetchStats]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#05041f] via-[#17103a] to-[#5d1ea4] text-white px-4 py-6 sm:px-6 lg:px-10">
      {/* Top section */}
      <header className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: title / subtitle */}
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300/80">
              <span className="h-6 rounded-full bg-white/10 px-3 flex items-center justify-center">
                Branch Panel
              </span>
            </p>
            <h1 className="mt-3 text-[2.1rem] sm:text-[2.4rem] font-extrabold tracking-tight leading-tight">
              Query Dashboard
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-200/85 max-w-xl">
              Get a quick snapshot of all your queries, demos, enrollments and
              priorities in one clean view.
            </p>
          </div>

          {/* Right: profile / branch */}
          <div className="flex flex-col items-end gap-3">
            {adminName && (
              <div className="text-right">
                <p className="text-xs text-slate-200/80">Welcome back,</p>
                <p className="text-sm font-semibold">{adminName}</p>
              </div>
            )}

            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.35)] animate-pulse" />
              <span className="text-[11px] uppercase tracking-wide text-slate-200/80">
                Branch
              </span>
              <span className="text-xs sm:text-sm font-semibold">
                {adminbranch || "—"}
              </span>
            </div>

            {loadingStats && (
              <p className="text-[11px] text-slate-200/75 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Refreshing stats…
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Error state */}
      {error && !loading && (
        <div className="max-w-xl mb-6">
          <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-50 flex items-start justify-between gap-3 shadow-lg shadow-red-900/25">
            <div>
              <p className="font-semibold">Something went wrong</p>
              <p className="mt-1 text-xs text-red-100/90">{error}</p>
            </div>
            {adminId && (
              <button
                onClick={fetchStats}
                className="ml-2 inline-flex items-center gap-1 rounded-full border border-red-300/70 bg-red-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-50 hover:bg-red-500/30 transition"
              >
                <Loader2
                  className={`h-3 w-3 ${
                    loadingStats ? "animate-spin" : "opacity-70"
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
          {/* Hint row */}
          <div className="mb-4 text-xs sm:text-sm text-slate-200/80 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1">
              <span className="mr-2 h-2 w-2 rounded-full bg-emerald-400" />
              Tap any card to see full details.
            </span>
          </div>

          {/* Summary Cards */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard
              title="Total Queries"
              value={stats.totalQueries}
              subtitle="All active leads in this branch."
              icon={Inbox}
              badge="Active"
              bgGradient="from-[#ffb347] via-[#ff9800] to-[#ff6b00]"
              href={`/branch/page/allquery`}
            />

            <StatCard
              title="Demo Queries"
              value={stats.totalDemoQueries}
              subtitle="Leads scheduled or marked for demo."
              icon={Presentation}
              badge="Demo"
              bgGradient="from-[#45c4ff] via-[#3b82f6] to-[#1d4ed8]"
              href={`/branch/page/demo`}
            />

            <StatCard
              title="Enroll Queries"
              value={stats.totalEnrollQueries}
              subtitle="Students successfully enrolled."
              icon={CheckCircle2}
              badge="Enrolled"
              bgGradient="from-[#4ade80] via-[#22c55e] to-[#15803d]"
              href={`/branch/page/enroll`}
            />

            <StatCard
              title="Important"
              value={stats.totalImportantQueries}
              subtitle="High priority follow-up required."
              icon={Star}
              badge="High Priority"
              bgGradient="from-[#a855f7] via-[#ec4899] to-[#f97316]"
              href={`/branch/page/important`}
            />

            <StatCard
              title="Trash"
              value={stats.totalTrashQueries}
              subtitle="Closed, spam or discarded queries."
              icon={Trash2}
              badge="Trash"
              bgGradient="from-[#fb2776] via-[#e11d48] to-[#7f1d1d]"
              href={`/branch/page/trash`}
            />

              <StatCard
              title="Last Day Pending Count"
              value={stats.lastDayPendingCount}
              subtitle="Last Day Pending Count"
              icon={Loader2}
              badge="Loader2"
              bgGradient="from-[#fb2776] via-[#e11d48] to-[#7f1d1d]"
              href={`/branch`}
            />
          </section>
        </>
      )}
    </div>
  );
}

/**
 * Vibrant stat card – user-friendly and touch-friendly
 */
function StatCard({ title, value, subtitle, icon: Icon, badge, bgGradient, href }) {
  return (
    <Link
      href={href}
      className={`
        group relative overflow-hidden rounded-3xl
        bg-gradient-to-br ${bgGradient}
        px-5 pt-5 pb-4 flex flex-col gap-3
        shadow-[0_18px_45px_rgba(0,0,0,0.45)]
        transition-transform transition-shadow
        hover:-translate-y-1.5 hover:shadow-[0_24px_60px_rgba(0,0,0,0.7)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#17103a] focus-visible:ring-white/70
      `}
    >
      {/* soft highlight */}
      <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-soft-light bg-[radial-gradient(circle_at_0_0,#ffffff,transparent_55%),radial-gradient(circle_at_100%_0,#ffffff,transparent_55%)]" />

      <div className="relative z-10 flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
            {title}
          </p>
          <p className="mt-2 text-[2rem] font-extrabold leading-none drop-shadow-sm">
            {typeof value === "number" ? value : 0}
          </p>
        </div>
        <div className="inline-flex items-center justify-center rounded-2xl bg-white/15 p-2 backdrop-blur-sm group-hover:bg-white/20">
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>

      {subtitle && (
        <p className="relative z-10 text-xs text-white/85 leading-snug mt-1">
          {subtitle}
        </p>
      )}

      {badge && (
        <div className="relative z-10 mt-4 flex justify-center">
          <span className="inline-flex items-center justify-center rounded-full bg-black/15 px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
            {badge}
          </span>
        </div>
      )}
    </Link>
  );
}

/**
 * Skeleton card for loading state – matches dark theme
 */
function StatCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 px-5 pt-5 pb-4 animate-pulse shadow-[0_18px_45px_rgba(0,0,0,0.45)]">
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/25 opacity-40" />
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="space-y-3">
          <div className="h-3 w-20 rounded-full bg-white/20" />
          <div className="h-7 w-16 rounded-full bg-white/20" />
        </div>
        <div className="h-9 w-9 rounded-2xl bg-white/15" />
      </div>
      <div className="relative z-10 mt-3 h-3 w-32 rounded-full bg-white/15" />
      <div className="relative z-10 mt-5 h-4 w-20 rounded-full bg-white/20 mx-auto" />
    </div>
  );
}
