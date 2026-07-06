// src/pages/student/ProfilePage.jsx

import React, { useEffect, useState } from "react";
import Card from "../../components/UI/Card";
import studentApi from "../../api/studentApi";

const SEMESTER_LABEL_KEY = "edusmart_selected_semester_label";

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [semester, setSemester] = useState(null);
  const [selectedSemesterLabel, setSelectedSemesterLabel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const formatGpa = (gpa) => {
    if (gpa === null || gpa === undefined) return "--";
    const n = Number(gpa);
    if (Number.isNaN(n)) return gpa;
    return n.toFixed(2);
  };

  const formatGender = (gender) => {
    if (!gender) return "--";
    const g = String(gender).toLowerCase();
    if (g === "male") return "Male (ذكر)";
    if (g === "female") return "Female (أنثى)";
    return gender;
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        setError("");

        const [meRes, semRes] = await Promise.all([
          studentApi.getMe(),
          studentApi
            .getCurrentSemester()
            .catch((err) => {
              console.warn("Current semester fetch failed", err);
              return null;
            }),
        ]);

        setProfile(meRes);
        setSemester(semRes);

        try {
          const lbl = localStorage.getItem(SEMESTER_LABEL_KEY);
          if (lbl) setSelectedSemesterLabel(lbl);
        } catch {
          // ignore localStorage failure
        }
      } catch (err) {
        console.error("Failed to load profile data", err);
        setError("Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, []);

  // ---------- Loading / error states ----------

  if (loading && !profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
          <span className="h-3 w-3 animate-ping rounded-full bg-primary/70" />
          <p className="text-sm text-slate-500">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 shadow-sm">
          {error || "Unable to load profile."}
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 shadow-sm">
          No profile data available. Please try again later.
        </p>
      </div>
    );
  }

  const initials = getInitials(profile.name);
  const displayGpa = formatGpa(profile.gpa);
  const displayGender = formatGender(profile.gender);

  // Department label logic
  const departmentLabel =
    profile.department_name ||
    (profile.department && profile.department.name) ||
    (profile.department_id ? `Department #${profile.department_id}` : "--");

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <span role="img" aria-label="profile">
              👤
            </span>
            Profile{" "}
            <span className="text-slate-400 text-base">(الملف الشخصي)</span>
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            View your personal and academic information in one place.
          </p>
        </div>

        {semester?.name && (
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary border border-primary/10">
            <span role="img" aria-label="calendar">
              📅
            </span>
            <span>Current System Semester: </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px]">
              {semester.name}
            </span>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-flex items-center gap-2">
          <span role="img" aria-label="warning">
            ⚠️
          </span>
          {error}
        </p>
      )}

      {/* Top Profile Header */}
      <div className="flex flex-col gap-4 md:flex-row">
        {/* Main profile header card */}
        <Card className="relative flex-1 overflow-hidden border-0 bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 text-white shadow-lg">
          <div className="absolute inset-0 opacity-30">
            <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-white/20 blur-3xl" />
            <div className="pointer-events-none absolute -right-16 bottom-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col items-start gap-4 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-xl font-semibold shadow-inner">
                {initials}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold leading-tight">
                    {profile.name}
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium">
                    <span role="img" aria-label="student">
                      🎓
                    </span>
                    Student
                  </span>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-white/80">
                  {profile.email}
                </p>
                <p className="mt-1 text-xs text-white/70">
                  ID:{" "}
                  <span className="font-mono">
                    {profile.student_number || "--"}
                  </span>
                </p>
              </div>
            </div>

            {/* Quick stats on right */}
            <div className="mt-3 grid w-full grid-cols-3 gap-2 text-xs sm:w-auto sm:text-sm md:mt-0">
              <div className="rounded-2xl bg-white/15 px-3 py-2 text-center shadow-sm">
                <p className="text-[11px] uppercase tracking-wide text-white/80">
                  GPA
                </p>
                <p className="mt-1 text-base font-semibold">{displayGpa}</p>
              </div>
              <div className="rounded-2xl bg-white/15 px-3 py-2 text-center shadow-sm">
                <p className="text-[11px] uppercase tracking-wide text-white/80">
                  Region
                </p>
                <p className="mt-1 text-xs font-medium">
                  {profile.region || "--"}
                </p>
              </div>
              <div className="rounded-2xl bg-white/15 px-3 py-2 text-center shadow-sm">
                <p className="text-[11px] uppercase tracking-wide text-white/80">
                  Semester
                </p>
                <p className="mt-1 text-xs font-medium">
                  {semester?.name || "Not set"}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Semester filter info card */}
        <Card className="w-full md:w-72 border-dashed border-slate-200 bg-slate-50/80">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-lg">
              <span role="img" aria-label="filter">
                🎛️
              </span>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-slate-800">
                Dashboard Semester Filter
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Courses in your main dashboard are currently filtered by:
              </p>
              <p className="mt-1 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-700 shadow-sm border border-slate-200">
                  <span role="img" aria-label="bookmark">
                    🔖
                  </span>
                  {selectedSemesterLabel || "All semesters (no filter)"}
                </span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                You can change this from the dashboard header to quickly switch
                between semesters.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Stats strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Department */}
        <Card className="flex items-center gap-3 border-slate-100 bg-white/80">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-lg">
            <span role="img" aria-label="department">
              🏫
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Department</p>
            <p className="text-sm font-semibold text-slate-800">
              {departmentLabel}
            </p>
          </div>
        </Card>

        {/* Gender */}
        <Card className="flex items-center gap-3 border-slate-100 bg-white/80">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-lg">
            <span role="img" aria-label="gender">
              🧑
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Gender</p>
            <p className="text-sm font-semibold text-slate-800">
              {displayGender}
            </p>
          </div>
        </Card>

        {/* Highest education */}
        <Card className="flex items-center gap-3 border-slate-100 bg-white/80">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-lg">
            <span role="img" aria-label="education">
              📚
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">
              Highest Education (أعلى مؤهل)
            </p>
            <p className="text-sm font-semibold text-slate-800">
              {profile.highest_education || "--"}
            </p>
          </div>
        </Card>

        {/* Region */}
        <Card className="flex items-center gap-3 border-slate-100 bg-white/80">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-lg">
            <span role="img" aria-label="region">
              📍
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">
              Region (المنطقة)
            </p>
            <p className="text-sm font-semibold text-slate-800">
              {profile.region || "--"}
            </p>
          </div>
        </Card>
      </div>

      {/* Detailed sections */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Personal Info */}
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-sm">
              👤
            </span>
            <h3 className="text-sm font-semibold text-slate-800">
              Personal Information
            </h3>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-slate-500">Full Name</dt>
              <dd className="font-medium text-slate-800 text-right">
                {profile.name}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-slate-500">Student Number</dt>
              <dd className="font-mono text-xs sm:text-sm font-semibold text-slate-900 text-right">
                {profile.student_number}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-slate-500">Email</dt>
              <dd className="text-right break-all text-slate-800">
                {profile.email}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-slate-500">Gender</dt>
              <dd className="text-right text-slate-800">{displayGender}</dd>
            </div>
          </dl>
        </Card>

        {/* Academic Info */}
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-sm">
              🎓
            </span>
            <h3 className="text-sm font-semibold text-slate-800">
              Academic Details
            </h3>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-slate-500">GPA</dt>
              <dd className="text-right font-semibold text-indigo-600">
                {displayGpa}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-slate-500">Department</dt>
              <dd className="text-right text-slate-800">
                {departmentLabel}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-slate-500">
                Highest Education (أعلى مؤهل)
              </dt>
              <dd className="text-right text-slate-800">
                {profile.highest_education || "--"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-slate-500">System Semester</dt>
              <dd className="text-right text-slate-800">
                {semester?.name || "--"}
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
