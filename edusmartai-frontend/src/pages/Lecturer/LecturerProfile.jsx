// src/pages/Lecturer/LecturerProfile.jsx
import React, { useEffect, useState } from "react";
import lecturerApi from "../../api/lecturerApi";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";

const formatDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const LecturerProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const loadProfile = async () => {
    try {
      setLoading(true);
      setErr("");
      const data = await lecturerApi.getMyProfile();
      setProfile(data);
    } catch (e) {
      console.error("Failed to load lecturer profile", e);
      setErr("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  if (loading && !profile) {
    // Fancy skeleton while loading
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-primary/70 uppercase">
              Lecturer dashboard
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              My Profile
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Loading your teaching overview...
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr,2fr] animate-pulse">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-sky-50 to-indigo-50">
            <div className="absolute inset-0 pointer-events-none opacity-60">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/5" />
              <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-sky-100/40" />
            </div>
            <div className="relative flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-white/70" />
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded bg-white/60" />
                  <div className="h-3 w-40 rounded bg-white/60" />
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-3 w-full rounded bg-white/60" />
                <div className="h-3 w-11/12 rounded bg-white/60" />
                <div className="h-3 w-10/12 rounded bg-white/60" />
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="space-y-2">
                  <div className="h-3 w-16 rounded bg-slate-100" />
                  <div className="h-6 w-10 rounded bg-slate-100" />
                </Card>
              ))}
            </div>
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-28 rounded bg-slate-100" />
                <div className="h-3 w-16 rounded bg-slate-100" />
              </div>
              <div className="h-40 w-full rounded bg-slate-50" />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (err && !profile) {
    return (
      <div className="p-6">
        <Card className="border border-red-100 bg-red-50/60">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-sm">
              ⚠️
            </div>
            <div>
              <p className="text-sm font-semibold text-red-700">
                Something went wrong
              </p>
              <p className="mt-1 text-xs text-red-600">{err}</p>
              <Button
                className="mt-3 text-xs"
                onClick={loadProfile}
              >
                Try again
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const firstLetter = profile.name?.charAt(0)?.toUpperCase() || "L";
  const totalCourses =
    profile.total_courses ??
    (Array.isArray(profile.courses) ? profile.courses.length : 0) ??
    0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-primary/80 uppercase">
            Lecturer dashboard
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            My Profile
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Overview of your teaching profile, department and active courses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadProfile} className="text-xs">
            🔄 Refresh profile
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,2fr]">
        {/* LEFT: Profile & Contact card */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-sky-50 via-white to-indigo-50 shadow-sm">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/5" />
            <div className="absolute -left-16 -bottom-16 h-40 w-40 rounded-full bg-sky-100/60" />
          </div>

          <div className="relative flex flex-col gap-5">
            {/* Avatar + basic info */}
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/80 text-3xl font-semibold text-primary shadow-sm ring-2 ring-primary/10">
                {firstLetter}
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-primary shadow-sm">
                  <span className="text-sm">🎓</span>
                  <span>Lecturer</span>
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {profile.name}
                </h2>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <span className="text-sm">✉️</span>
                  <span>{profile.email}</span>
                </p>
              </div>
            </div>

            {/* Info sections */}
            <div className="mt-2 grid gap-3 text-xs sm:grid-cols-2">
              <div className="rounded-xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-100">
                <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <span>🆔</span>
                  <span>Lecturer details</span>
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Lecturer ID</span>
                    <span className="font-semibold text-slate-800">
                      {profile.lecturer_id}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Joined</span>
                    <span className="font-medium text-slate-800">
                      {formatDate(profile.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-100">
                <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <span>🏫</span>
                  <span>Department</span>
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Name</span>
                    <span className="max-w-[150px] truncate text-right text-xs font-semibold text-slate-800">
                      {profile.department_name || `#${profile.department_id}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Total Courses</span>
                    <span className="font-semibold text-slate-800">
                      {totalCourses}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Small footer tag */}
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 shadow-sm ring-1 ring-slate-100">
                <span>📚</span> <span>Active lecturer</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 shadow-sm ring-1 ring-slate-100">
                <span>⏱️</span> <span>Real-time teaching data</span>
              </span>
            </div>
          </div>
        </Card>

        {/* RIGHT: Stats + Courses */}
        <div className="space-y-6">
          {/* Stats section */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="flex flex-col gap-2 border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <span>📘</span>
                  <span>Total Courses</span>
                </div>
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                  Teaching load
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {totalCourses}
              </p>
              <p className="text-[11px] text-slate-500">
                Number of courses you are currently assigned to.
              </p>
            </Card>

            <Card className="flex flex-col gap-2 border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <span>🏛️</span>
                  <span>Department</span>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  Faculty
                </span>
              </div>
              <p className="truncate text-sm font-semibold text-slate-900">
                {profile.department_name || `#${profile.department_id}`}
              </p>
              <p className="text-[11px] text-slate-500">
                Department you belong to in the institution.
              </p>
            </Card>

            <Card className="flex flex-col gap-2 border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <span>📅</span>
                  <span>Account created</span>
                </div>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                  Since
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-900">
                {formatDate(profile.created_at)}
              </p>
              <p className="text-[11px] text-slate-500">
                Date when your lecturer account was first created.
              </p>
            </Card>
          </div>

          {/* Courses section */}
          <Card className="space-y-4 border border-slate-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <span className="text-base">📚</span>
                  <h3>My Courses</h3>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  A quick view of the courses you are teaching this semester.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>{totalCourses} course(s)</span>
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-100">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Code</th>
                    <th className="py-2.5 px-3 text-left">Course name</th>
                    <th className="py-2.5 px-3 text-left">Semester</th>
                    <th className="py-2.5 px-3 text-left">Schedule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(profile.courses || []).map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[11px]">
                          <span>📘</span>
                          <span>{c.course_code}</span>
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-800">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">{c.name}</span>
                          {c.section && (
                            <span className="text-[11px] text-slate-500">
                              Section {c.section}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-slate-800">
                        {c.semester_year && c.semester_name ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700">
                            <span>📅</span>
                            <span>{`${c.semester_name} ${c.semester_year}`}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            #{c.semester_id}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-800">
                        {c.days_and_times ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-slate-600 whitespace-pre-wrap">
                              {c.days_and_times}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            Not scheduled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {(!profile.courses || profile.courses.length === 0) && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-6 text-center text-sm text-slate-400"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-lg">📭</span>
                          <span>No courses assigned yet.</span>
                          <span className="text-[11px] text-slate-400">
                            Once you are assigned to courses, they will appear
                            here automatically.
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LecturerProfile;
