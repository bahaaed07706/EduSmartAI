// src/pages/student/MyCourses.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Calendar,
  Building2,
  GraduationCap,
  Search,
  AlertCircle,
} from "lucide-react";
import studentApi from "../../api/studentApi";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";

const SEMESTER_ID_KEY = "edusmart_selected_semester_id";
const SEMESTER_LABEL_KEY = "edusmart_selected_semester_label";

/**
 * Normalize values so we don't render ugly "null", "None", "" etc.
 */
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

/**
 * Convert days_and_times into a nice schedule text.
 * Supports:
 * - plain string
 * - JSON string like {"Mon": "10-12", "Wed": "10-12"}
 * - object form of the same
 */
const getScheduleText = (daysAndTimes) => {
  const val = cleanNullable(daysAndTimes);
  if (!val) return null;

  // If it's a string, maybe JSON
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const parts = Object.entries(parsed).map(
          ([day, time]) => `${day}: ${time}`
        );
        return parts.join(", ");
      }
    } catch {
      // Not JSON, just return as-is
    }
    return val;
  }

  // If it's already an object like { Mon: "10-12" }
  if (typeof val === "object") {
    const entries = Object.entries(val);
    if (!entries.length) return null;
    return entries.map(([day, time]) => `${day}: ${time}`).join(", ");
  }

  return String(val);
};

const MyCourses = () => {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState(null);
  const [selectedSemesterLabel, setSelectedSemesterLabel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Load selected semester & courses
  useEffect(() => {
    // read selected semester from localStorage
    try {
      const rawId = localStorage.getItem(SEMESTER_ID_KEY);
      const lbl = localStorage.getItem(SEMESTER_LABEL_KEY);
      if (rawId) {
        const n = Number(rawId);
        if (!Number.isNaN(n)) setSelectedSemesterId(n);
      }
      if (lbl) setSelectedSemesterLabel(lbl);
    } catch {
      // ignore
    }

    const load = async () => {
      try {
        setLoading(true);
        const data = await studentApi.getMyCourses();

        if (Array.isArray(data)) {
          setCourses(data);
        } else if (Array.isArray(data?.courses)) {
          setCourses(data.courses);
        } else {
          setCourses([]);
        }
      } catch (err) {
        console.error("Failed to load courses", err);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleOpenCourse = (course) => {
    navigate(`/student/courses/${course.id}`);
  };

  const filteredCourses = useMemo(() => {
    let list =
      selectedSemesterId != null
        ? courses.filter((c) => c.semester_id === selectedSemesterId)
        : courses;

    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(term) ||
          c.course_code?.toLowerCase().includes(term) ||
          c.department_name?.toLowerCase().includes(term)
      );
    }

    return list;
  }, [courses, selectedSemesterId, search]);

  // Loading state: skeleton cards
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
                <div className="mt-1 h-3 w-48 rounded bg-slate-100 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card
              key={i}
              className="border border-slate-100 shadow-sm animate-pulse"
            >
              <div className="space-y-3">
                <div className="h-3 w-20 rounded bg-slate-200" />
                <div className="h-4 w-40 rounded bg-slate-200" />
                <div className="h-3 w-28 rounded bg-slate-100" />
                <div className="h-3 w-32 rounded bg-slate-100" />
                <div className="h-3 w-52 rounded bg-slate-100" />
              </div>
              <div className="mt-4 flex justify-end">
                <div className="h-8 w-24 rounded-full bg-slate-200" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const courseCount = filteredCourses.length;
  const totalCourses = courses.length;
  const displaySemesterLabel =
    cleanNullable(selectedSemesterLabel) || "all semesters";

  return (
    <div className="p-6 space-y-6">
      {/* Header / hero */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-primary/10 via-sky-50 to-emerald-50 px-5 py-4 sm:px-7 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">
                  My Courses
                </h2>
                <span className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm border border-slate-100">
                  {courseCount} course{courseCount !== 1 && "s"} shown
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                Showing courses for{" "}
                <span className="font-semibold text-slate-900">
                  {displaySemesterLabel}
                </span>
                . You can change the semester filter on your dashboard.
              </p>
              {totalCourses > 0 && selectedSemesterId != null && (
                <p className="mt-1 text-[11px] sm:text-xs text-slate-500">
                  <span className="font-medium">
                    Total enrolled across semesters:
                  </span>{" "}
                  {totalCourses}
                </p>
              )}
            </div>
          </div>

          {/* Search box */}
          <div className="w-full sm:w-64">
            <label className="relative block text-xs text-slate-500">
              <span className="mb-1 block font-medium text-slate-600">
                Quick search
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, code, department..."
                  className="w-full rounded-full border border-slate-200 bg-white/80 pl-9 pr-3 py-1.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Content */}
      {filteredCourses.length === 0 ? (
        <Card className="border border-dashed border-slate-200 bg-slate-50/60">
          <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200/70">
              <AlertCircle className="h-6 w-6 text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                No courses to show
              </p>
              <p className="mt-1 text-xs text-slate-500 max-w-md">
                You don’t have any courses in the selected semester or matching
                your search. Try clearing the search, or choose a different
                semester from your dashboard.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCourses.map((course) => {
            const courseCode = cleanNullable(course.course_code) || "Course";
            const courseName = cleanNullable(course.name) || "Untitled course";

            const semesterName = cleanNullable(course.semester_name);
            const semesterId = cleanNullable(course.semester_id);
            const semesterLabel =
              semesterName || (semesterId != null ? `Sem #${semesterId}` : null);

            const departmentName =
              cleanNullable(course.department_name) ||
              (course.department_id != null
                ? `Dept #${course.department_id}`
                : null);

            const scheduleText = getScheduleText(course.days_and_times);
            const instructorName = cleanNullable(course.instructor_name);

            return (
              <Card
                key={course.id}
                className="flex flex-col justify-between border border-slate-100 shadow-sm hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 transition-all cursor-pointer bg-white/90"
                onClick={() => handleOpenCourse(course)}
              >
                <div className="space-y-3">
                  {/* Top row: code + optional semester chip */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-primary/80 tracking-[0.12em] uppercase">
                          {courseCode}
                        </p>
                        <h3 className="text-sm sm:text-base font-semibold text-slate-900 line-clamp-2">
                          {courseName}
                        </h3>
                      </div>
                    </div>

                    {semesterLabel && (
                      <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-600 border border-slate-200 whitespace-nowrap">
                        <Calendar className="mr-1 h-3 w-3 text-slate-400" />
                        {semesterLabel}
                      </span>
                    )}
                  </div>

                  {/* Department */}
                  {departmentName && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-medium">Department:</span>
                      <span className="truncate">{departmentName}</span>
                    </div>
                  )}

                  {/* Schedule */}
                  {scheduleText && (
                    <div className="flex items-start gap-1.5 text-[11px] text-slate-600">
                      <Calendar className="mt-0.5 h-3.5 w-3.5 text-slate-400" />
                      <div>
                        <span className="font-medium">Schedule: </span>
                        <span className="break-words">{scheduleText}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <div className="flex flex-col text-[11px] text-slate-500">
                    <span className="font-medium text-slate-600">
                      Course ID: #{course.id}
                    </span>
                    {instructorName && (
                      <span className="truncate">
                        Instructor: {instructorName}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 rounded-full text-xs px-3 py-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCourse(course);
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
    </div>
  );
};

export default MyCourses;
