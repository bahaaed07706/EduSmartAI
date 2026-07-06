// src/pages/Admin/AdminDashboard.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  RefreshCcw,
  AlertTriangle,
} from "lucide-react";

import adminApi from "../../api/adminApi";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState("");
  const navigate = useNavigate();

  const loadStats = async () => {
    try {
      setLoading(true);
      setNetworkError("");

      // assuming adminApi.getDashboard() returns response.data directly
      const data = await adminApi.getDashboard();
      setStats(data);
    } catch (err) {
      console.error("Failed to load admin dashboard", err);
      if (!err.response) {
        setNetworkError(
          "Cannot reach the backend API (possible CORS / network issue)."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const safeValue = (v) =>
    typeof v === "number" && !Number.isNaN(v) ? v : 0;

  const tiles = stats
    ? [
        {
          label: "Departments",
          value: safeValue(stats.departments_count),
          icon: Building2,
          accent: "bg-indigo-50 text-indigo-600",
        },
        {
          label: "Lecturers",
          value: safeValue(stats.lecturers_count),
          icon: GraduationCap,
          accent: "bg-emerald-50 text-emerald-600",
        },
        {
          label: "Students",
          value: safeValue(stats.students_count),
          icon: Users,
          accent: "bg-sky-50 text-sky-600",
        },
        {
          label: "Courses",
          value: safeValue(stats.courses_count),
          icon: BookOpen,
          accent: "bg-amber-50 text-amber-600",
        },
        {
          label: "Semesters",
          value: safeValue(stats.semesters_count),
          icon: CalendarDays,
          accent: "bg-rose-50 text-rose-600",
        },
      ]
    : [];

  // Initial loading state (before we have any stats)
  if (loading && !stats) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100">
            <LayoutDashboard className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
              Admin
            </p>
            <h2 className="text-xl font-semibold text-slate-800">
              Admin Dashboard
            </h2>
            <p className="text-xs text-slate-500">
              Loading overview of your system...
            </p>
          </div>
        </div>

        <Card className="border border-slate-100 bg-white/70">
          <div className="space-y-3 text-sm text-slate-500">
            <p>Loading dashboard statistics...</p>
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 animate-pulse"
                >
                  <div className="mb-2 h-4 w-20 rounded bg-slate-200" />
                  <div className="h-6 w-16 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // If still no stats (error case)
  if (!stats) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-50">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-800">
              Admin Dashboard
            </h2>
            <p className="text-xs text-slate-500">
              We couldn&apos;t load the statistics right now.
            </p>
          </div>
        </div>

        {networkError && (
          <Card className="border border-amber-300 bg-amber-50">
            <p className="text-xs text-amber-800">
              {networkError} Make sure your backend is running at{" "}
              <span className="font-mono">http://localhost:8000</span> and CORS
              is configured.
            </p>
          </Card>
        )}

        <Card className="border border-rose-200 bg-rose-50">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-rose-700">
              Failed to load dashboard statistics.
            </p>
            <Button size="sm" variant="outline" onClick={loadStats}>
              <RefreshCcw className="mr-1 h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Normal state
  return (
    <div className="p-6 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 via-sky-50 to-primary/5 ring-1 ring-primary/20">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">
              System overview
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Admin Dashboard
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              High-level snapshot of departments, lecturers, students, courses,
              and semesters.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={loadStats}
          >
            <RefreshCcw className="mr-1 h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            className="text-xs"
            onClick={() => navigate("/admin/students")}
          >
            Manage Students
          </Button>
          <Button
            size="sm"
            className="text-xs"
            onClick={() => navigate("/admin/courses")}
          >
            Manage Courses
          </Button>
        </div>
      </div>

      {/* Network warning (if any) */}
      {networkError && (
        <Card className="border border-amber-300 bg-amber-50">
          <p className="text-xs text-amber-800">
            {networkError} Make sure your backend is running at{" "}
            <span className="font-mono">http://localhost:8000</span> and CORS
            is configured.
          </p>
        </Card>
      )}

      {/* STATS TILES */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Card
              key={t.label}
              className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    {t.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {t.value}
                  </p>
                </div>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-2xl ${t.accent}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Total number of {t.label.toLowerCase()} in the system.
              </p>
            </Card>
          );
        })}
      </div>

      {/* INFO CARD */}
      <Card className="mt-2 border border-slate-100 bg-slate-50/70">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-slate-600">
          <p>
            Use the{" "}
            <span className="font-semibold text-slate-800">
              Admin navigation
            </span>{" "}
            to create and manage departments, semesters, courses, and student
            enrollments.
          </p>
          <p className="text-[11px] text-slate-500">
            Tip: Refresh this page after large imports or bulk updates to see
            the latest counts.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;
