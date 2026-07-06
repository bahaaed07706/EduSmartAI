// src/pages/Student/StudentHome.jsx

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Calendar,
  BookOpen,
  TrendingUp,
  AlertTriangle,
  Building2,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import studentApi from "../../api/studentApi";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";

const SEMESTER_ID_KEY = "edusmart_selected_semester_id";
const SEMESTER_LABEL_KEY = "edusmart_selected_semester_label";

// Helper to avoid showing "null", "None", empty strings, etc.
const cleanNullable = (value) => {
  if (value === undefined || value === null) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      !trimmed ||
      trimmed.toLowerCase() === "null" ||
      trimmed.toLowerCase() === "none" ||
      trimmed.toLowerCase() === "n/a"
    ) {
      return null;
    }
    return trimmed;
  }

  return value;
};

const StudentHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [currentSemester, setCurrentSemester] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(null);

  // helper to set selection + localStorage + broadcast to chatbot
  const applySelectedSemester = (semestersList, currentSem) => {
    let storedId = null;
    try {
      const raw = localStorage.getItem(SEMESTER_ID_KEY);
      if (raw) {
        const n = Number(raw);
        if (!Number.isNaN(n)) storedId = n;
      }
    } catch {
      // ignore
    }

    // validate storedId
    if (storedId && !semestersList.some((s) => s.id === storedId)) {
      storedId = null;
    }

    let finalId = storedId;

    if (!finalId) {
      if (currentSem && semestersList.some((s) => s.id === currentSem.id)) {
        finalId = currentSem.id;
      } else if (semestersList[0]) {
        finalId = semestersList[0].id;
      } else {
        finalId = null;
      }
    }

    setSelectedSemesterId(finalId);

    const sem =
      finalId && semestersList.find((s) => s.id === finalId)
        ? semestersList.find((s) => s.id === finalId)
        : null;

    try {
      if (sem) {
        const label = sem.year ? `${sem.name} ${sem.year}` : sem.name;
        localStorage.setItem(SEMESTER_ID_KEY, String(sem.id));
        localStorage.setItem(SEMESTER_LABEL_KEY, label);

        // notify chatbot / other listeners
        window.dispatchEvent(
          new CustomEvent("semester-changed", {
            detail: { semesterId: sem.id, label },
          })
        );
      } else {
        localStorage.removeItem(SEMESTER_ID_KEY);
        localStorage.removeItem(SEMESTER_LABEL_KEY);

        window.dispatchEvent(
          new CustomEvent("semester-changed", {
            detail: { semesterId: null, label: null },
          })
        );
      }
    } catch {
      // ignore
    }

    return finalId;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setNetworkError(null);

        const [meRes, semesterRes, mySemestersRes, coursesRes] =
          await Promise.all([
            studentApi.getMe(),
            studentApi
              .getCurrentSemester()
              .catch((err) => {
                console.warn("Current semester endpoint failed", err);
                return null;
              }),
            studentApi
              .getMySemesters()
              .catch((err) => {
                console.warn("My semesters endpoint failed", err);
                return [];
              }),
            studentApi.getMyCourses(),
          ]);

        setProfile(meRes);
        setCurrentSemester(semesterRes);

        const semList = Array.isArray(mySemestersRes) ? mySemestersRes : [];
        setSemesters(semList);

        // this sets selectedSemesterId, localStorage, and fires "semester-changed"
        applySelectedSemester(semList, semesterRes);

        setCourses(Array.isArray(coursesRes) ? coursesRes : []);
      } catch (err) {
        console.error("Failed to load student home data", err);
        if (!err.response) {
          setNetworkError(
            "Cannot reach the backend API (possible CORS / network issue)."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSemesterChange = (e) => {
    const value = e.target.value;
    const id = value ? Number(value) : null;
    setSelectedSemesterId(id);

    const sem =
      id && semesters.find((s) => s.id === id)
        ? semesters.find((s) => s.id === id)
        : null;

    try {
      if (sem) {
        const label = sem.year ? `${sem.name} ${sem.year}` : sem.name;
        localStorage.setItem(SEMESTER_ID_KEY, String(sem.id));
        localStorage.setItem(SEMESTER_LABEL_KEY, label);

        window.dispatchEvent(
          new CustomEvent("semester-changed", {
            detail: { semesterId: sem.id, label },
          })
        );
      } else {
        localStorage.removeItem(SEMESTER_ID_KEY);
        localStorage.removeItem(SEMESTER_LABEL_KEY);

        window.dispatchEvent(
          new CustomEvent("semester-changed", {
            detail: { semesterId: null, label: null },
          })
        );
      }
    } catch {
      // ignore
    }
  };

  const filteredCourses = useMemo(
    () =>
      selectedSemesterId != null
        ? courses.filter((c) => c.semester_id === selectedSemesterId)
        : courses,
    [courses, selectedSemesterId]
  );

  const activeCoursesCount = filteredCourses.length;

  const displayName =
    cleanNullable(profile?.name) || cleanNullable(user?.name) || "Student";
  const studentNumber =
    cleanNullable(profile?.student_number) || "Not available";

  const currentSemesterLabel = (() => {
    const name = cleanNullable(currentSemester?.name);
    const year = cleanNullable(currentSemester?.year);
    if (!name && !year) return "Not available";
    if (name && year) return `${name} ${year}`;
    return name || year;
  })();

  if (loading && !profile) {
    return (
      <div className="p-6 space-y-6">
        {/* Simple loading skeleton for hero */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-primary/10 via-sky-50 to-emerald-50 px-5 py-4 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-40 rounded bg-slate-200 animate-pulse" />
                <div className="h-3 w-56 rounded bg-slate-100 animate-pulse" />
                <div className="h-3 w-32 rounded bg-slate-100 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Skeleton summary cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card
              key={i}
              className="border border-slate-100 shadow-sm animate-pulse"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 rounded bg-slate-200" />
                  <div className="h-4 w-16 rounded bg-slate-200" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Hero / greeting with modern design */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-primary/10 via-sky-50 to-emerald-50 px-5 py-4 sm:px-7 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: greeting */}
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-primary/80 font-semibold">
                Welcome back
              </p>
              <h1 className="mt-1 text-xl sm:text-2xl font-semibold text-slate-900">
                {displayName}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                Student number:{" "}
                <span className="font-medium text-slate-900">
                  {studentNumber}
                </span>
              </p>

              {/* Semester filter UI */}
              {semesters.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-slate-500">
                    Showing courses for:
                  </span>
                  <select
                    className="text-xs border border-slate-200 rounded-full px-3 py-1 bg-white/80 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    value={selectedSemesterId || ""}
                    onChange={handleSemesterChange}
                  >
                    {semesters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.year ? `${s.name} ${s.year}` : s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Right: main action */}
          <div className="flex flex-col items-end gap-2">
            <Button
              onClick={() => navigate("/student/profile")}
              className="rounded-full px-4 py-2 text-sm"
            >
              Go to Profile
            </Button>
            <p className="text-[11px] text-slate-500">
              Active semester:{" "}
              <span className="font-medium text-slate-800">
                {currentSemesterLabel}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Network / CORS warning */}
      {networkError && (
        <Card className="border border-amber-300 bg-amber-50/80">
          <div className="flex items-start gap-2 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {networkError} Make sure your backend is running at{" "}
              <span className="font-mono font-semibold">
                http://localhost:8000
              </span>{" "}
              and CORS is configured.
            </p>
          </div>
        </Card>
      )}

      {/* Summary cards with matching card design */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* GPA card */}
        <Card className="border border-slate-100 shadow-sm bg-white/90">
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                Current GPA
              </p>
              <p className="mt-1 text-2xl font-semibold text-primary">
                {profile?.gpa != null ? Number(profile.gpa).toFixed(2) : "--"}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Overall GPA in the system.
              </p>
            </div>
          </div>
        </Card>

        {/* Current semester card */}
        <Card className="border border-slate-100 shadow-sm bg-white/90">
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                Current Semester
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {currentSemesterLabel}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Active semester linked to your enrollments.
              </p>
            </div>
          </div>
        </Card>

        {/* Active courses card */}
        <Card className="border border-slate-100 shadow-sm bg-white/90">
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                Active Courses
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {activeCoursesCount}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Enrolled for the selected semester.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Courses preview section – cards styled like MyCourses */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border border-slate-100 shadow-sm bg-white/95">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                My Courses (preview)
              </h2>
            <p className="mt-1 text-[11px] text-slate-500">
                Quick view of your courses for the selected semester.
              </p>
            </div>
            <Button
              size="sm"
              className="rounded-full text-xs px-3 py-1.5"
              onClick={() => navigate("/student/courses")}
            >
              View all
            </Button>
          </div>

          {filteredCourses.length === 0 ? (
            <div className="flex items-center justify-center py-6">
              <p className="text-sm text-slate-500">
                You have no courses in the selected semester.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredCourses.slice(0, 4).map((course) => {
                const courseCode =
                  cleanNullable(course.course_code) || "Course";
                const courseName =
                  cleanNullable(course.name) || "Untitled course";
                const departmentName =
                  cleanNullable(course.department_name) ||
                  (course.department_id != null
                    ? `Dept #${course.department_id}`
                    : null);

                return (
                  <Card
                    key={course.id}
                    className="flex flex-col justify-between border border-slate-100 shadow-sm hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 transition-all cursor-pointer bg-white/90"
                    onClick={() =>
                      navigate(`/student/courses/${course.id}`)
                    }
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                            <BookOpen className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-primary/80 tracking-[0.12em] uppercase">
                              {courseCode}
                            </p>
                            <p className="text-sm font-semibold text-slate-900 line-clamp-2">
                              {courseName}
                            </p>
                          </div>
                        </div>
                      </div>

                      {departmentName && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-medium">Department:</span>
                          <span className="truncate">{departmentName}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                      <span className="text-[11px] text-slate-500">
                        Course ID: #{course.id}
                      </span>
                      <Button
                        size="sm"
                        className="rounded-full text-[11px] px-3 py-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/student/courses/${course.id}`);
                        }}
                      >
                        View details
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>

        {/* Optional side card – quick tip / info */}
        <Card className="border border-slate-100 shadow-sm bg-white/95">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">
            Study snapshot
          </h2>
          <p className="text-[11px] text-slate-500 mb-3">
            Keep an eye on your GPA, courses, and semester to stay on track.
          </p>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
              Check each course page for detailed grades, attendance, and
              assessments.
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Use the semester filter above to switch between past terms.
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-sky-500" />
              Visit the chatbot to ask questions about your performance or
              upcoming work.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default StudentHome;
