// src/pages/Lecturer/LecturerDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  Layers,
  ArrowRight,
  User,
  Loader2,
} from "lucide-react";
import lecturerApi from "../../api/lecturerApi";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";

const LecturerDashboard = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [currentSemester, setCurrentSemester] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [profileRes, semesterRes, coursesRes] = await Promise.all([
          lecturerApi
            .getMyProfile()
            .catch((e) => {
              console.warn("getMyProfile failed", e);
              return null;
            }),
          lecturerApi
            .getMyCurrentSemester()
            .catch((e) => {
              console.warn("getMyCurrentSemester failed", e);
              return null;
            }),
          lecturerApi
            .getMyCourses()
            .catch((e) => {
              console.warn("getMyCourses failed", e);
              return [];
            }),
        ]);

        setProfile(profileRes);
        setCurrentSemester(semesterRes);
        setCourses(Array.isArray(coursesRes) ? coursesRes : []);
      } catch (e) {
        console.error("Failed to load lecturer dashboard data", e);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const totalCourses = courses.length;
  const hasCurrentSemester = currentSemester && currentSemester.id;

  const currentSemesterCourses = hasCurrentSemester
    ? courses.filter((c) => c.semester_id === currentSemester.id)
    : [];

  const currentSemesterCoursesCount = currentSemesterCourses.length;

  const semesterLabel = currentSemester
    ? currentSemester.year
      ? `${currentSemester.name} ${currentSemester.year}`
      : currentSemester.name
    : "Not detected";

  const firstName = profile?.name?.split(" ")[0] ?? "Lecturer";
  const initial = profile?.name?.[0]?.toUpperCase() ?? "L";

  // ---------- Loading state ----------

  if (loading && !profile && totalCourses === 0) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
          <p className="text-sm text-slate-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // ---------- Main render ----------

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100">
      <div className="w-full max-w-6xl mx-auto px-3 md:px-6 py-6 space-y-6">
        {/* Hero / header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
              <span className="text-lg font-semibold">{initial}</span>
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold text-slate-900">
                Welcome back, {firstName}
              </h2>
              <p className="text-xs md:text-sm text-slate-500 mt-1">
                Here&apos;s a quick snapshot of your teaching activity.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-xs"
              type="button"
              onClick={() => navigate("/lecturer/courses")}
            >
              <BookOpen className="h-4 w-4" />
              <span>Go to My Courses</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              className="flex items-center gap-2 text-xs"
              type="button"
              onClick={() => navigate("/lecturer/profile")}
            >
              <User className="h-4 w-4" />
              <span>View Profile</span>
            </Button>
          </div>
        </div>

        {error && (
          <Card className="border border-amber-200 bg-amber-50">
            <p className="text-xs text-amber-800">{error}</p>
          </Card>
        )}

        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="relative overflow-hidden bg-white/90 backdrop-blur-sm border border-slate-100">
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/5" />
            <div className="relative space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  Total Courses
                </p>
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Layers className="h-3.5 w-3.5" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-primary">
                {totalCourses}
              </p>
              <p className="text-[11px] text-slate-400">
                All courses assigned to you in the system.
              </p>
            </div>
          </Card>

          <Card className="relative overflow-hidden bg-white/90 backdrop-blur-sm border border-slate-100">
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-sky-50" />
            <div className="relative space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  Current Semester
                </p>
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <CalendarDays className="h-3.5 w-3.5" />
                </div>
              </div>
              <p className="text-base font-semibold text-slate-800">
                {semesterLabel}
              </p>
              <p className="text-[11px] text-slate-400">
                Based on semester dates linked to your courses.
              </p>
            </div>
          </Card>

          <Card className="relative overflow-hidden bg-white/90 backdrop-blur-sm border border-slate-100">
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-50" />
            <div className="relative space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  Courses this Semester
                </p>
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <BookOpen className="h-3.5 w-3.5" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-slate-800">
                {currentSemesterCoursesCount}
              </p>
              <p className="text-[11px] text-slate-400">
                Your teaching load for the active semester.
              </p>
            </div>
          </Card>
        </div>

        {/* Lower section: quick help + current semester courses */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Quick guidance card */}
          <Card className="lg:col-span-1 bg-white/90 backdrop-blur-sm border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">
              Getting things done
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Use the sidebar and course pages to:
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
              <li>
                • Set up{" "}
                <span className="font-semibold">assignments, quizzes</span> and{" "}
                <span className="font-semibold">projects</span>.
              </li>
              <li>
                • Record{" "}
                <span className="font-semibold">attendance</span> for each
                session.
              </li>
              <li>
                • Enter and review{" "}
                <span className="font-semibold">grades</span> for your students.
              </li>
              <li>• Share course materials like slides and notes.</li>
            </ul>
            <p className="mt-3 text-[11px] text-slate-400">
              Tip: Open a course from{" "}
              <span className="font-semibold">My Courses</span> to manage
              everything related to it from one place.
            </p>
          </Card>

          {/* Current semester courses list */}
          <Card className="lg:col-span-2 bg-white/90 backdrop-blur-sm border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-800">
                Courses this semester
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs flex items-center gap-1"
                type="button"
                onClick={() => navigate("/lecturer/courses")}
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {currentSemesterCoursesCount === 0 ? (
              <p className="text-xs text-slate-500">
                No active courses detected for the current semester, or the
                semester is not configured yet.
              </p>
            ) : (
              <div className="mt-1 max-h-72 overflow-auto rounded-lg border border-slate-100">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="text-left py-1.5 px-2">Course</th>
                      <th className="text-left py-1.5 px-2 hidden sm:table-cell">
                        Code
                      </th>
                      <th className="text-left py-1.5 px-2 hidden md:table-cell">
                        Department
                      </th>
                      <th className="text-right py-1.5 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSemesterCourses.map((c) => (
                      <tr
                        key={c.id}
                        className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-1.5 px-2">
                          <span className="font-medium text-slate-800">
                            {c.name || `Course #${c.id}`}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-slate-600 hidden sm:table-cell">
                          {c.course_code || "—"}
                        </td>
                        <td className="py-1.5 px-2 text-slate-600 hidden md:table-cell">
                          {c.department_name ||
                            (c.department_id
                              ? `Dept #${c.department_id}`
                              : "—")}
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/lecturer/courses/${c.id}`)
                            }
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:border-primary/40 hover:text-primary"
                          >
                            Open
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LecturerDashboard;
