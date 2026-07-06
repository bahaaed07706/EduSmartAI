// src/pages/Lecturer/LecturerCourseList.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import lecturerApi from "../../api/lecturerApi";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";

const SEMESTER_ID_KEY = "edusmart_lecturer_selected_semester_id";
const SEMESTER_LABEL_KEY = "edusmart_lecturer_selected_semester_label";

const LecturerCourseList = () => {
  const navigate = useNavigate();

  const [semesters, setSemesters] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState(null);
  const [selectedSemesterLabel, setSelectedSemesterLabel] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const loadCoursesForSemester = async (semesterId) => {
    try {
      setErr("");
      const data = await lecturerApi.getMyCourses(semesterId);
      setCourses(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load lecturer courses", e);
      setErr("Failed to load courses.");
      setCourses([]);
    }
  };

  const init = async () => {
    try {
      setLoading(true);
      setErr("");

      const [semRes, currentSemRes] = await Promise.all([
        lecturerApi
          .getMySemesters()
          .catch((e) => {
            console.warn("getMySemesters failed", e);
            return [];
          }),
        lecturerApi
          .getMyCurrentSemester()
          .catch((e) => {
            console.warn("getMyCurrentSemester failed", e);
            return null;
          }),
      ]);

      const semList = Array.isArray(semRes) ? semRes : [];
      setSemesters(semList);

      // Read stored selection
      let storedId = null;
      let storedLabel = null;
      try {
        const rawId = localStorage.getItem(SEMESTER_ID_KEY);
        const rawLabel = localStorage.getItem(SEMESTER_LABEL_KEY);
        if (rawId) {
          const n = Number(rawId);
          if (!Number.isNaN(n)) storedId = n;
        }
        if (rawLabel) storedLabel = rawLabel;
      } catch {
        // ignore
      }

      // ensure stored semester still exists
      if (storedId && !semList.some((s) => s.id === storedId)) {
        storedId = null;
        storedLabel = null;
      }

      let finalId = storedId;
      let finalLabel = storedLabel;

      if (!finalId) {
        if (currentSemRes && semList.some((s) => s.id === currentSemRes.id)) {
          finalId = currentSemRes.id;
          const label = currentSemRes.year
            ? `${currentSemRes.name} ${currentSemRes.year}`
            : currentSemRes.name;
          finalLabel = label;
        } else if (semList[0]) {
          finalId = semList[0].id;
          const label = semList[0].year
            ? `${semList[0].name} ${semList[0].year}`
            : semList[0].name;
          finalLabel = label;
        }
      }

      setSelectedSemesterId(finalId || null);
      setSelectedSemesterLabel(finalLabel || null);

      if (finalId) {
        await loadCoursesForSemester(finalId);
      } else {
        setCourses([]);
      }

      // persist selection
      try {
        if (finalId && finalLabel) {
          localStorage.setItem(SEMESTER_ID_KEY, String(finalId));
          localStorage.setItem(SEMESTER_LABEL_KEY, finalLabel);
        } else {
          localStorage.removeItem(SEMESTER_ID_KEY);
          localStorage.removeItem(SEMESTER_LABEL_KEY);
        }
      } catch {
        // ignore
      }
    } catch (e) {
      console.error("Failed to init lecturer course list", e);
      setErr("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSemesterChange = async (e) => {
    const value = e.target.value;
    const id = value ? Number(value) : null;
    setSelectedSemesterId(id);

    const sem =
      id && semesters.find((s) => s.id === id)
        ? semesters.find((s) => s.id === id)
        : null;

    let label = null;
    if (sem) {
      label = sem.year ? `${sem.name} ${sem.year}` : sem.name;
    }
    setSelectedSemesterLabel(label);

    try {
      if (sem && label) {
        localStorage.setItem(SEMESTER_ID_KEY, String(sem.id));
        localStorage.setItem(SEMESTER_LABEL_KEY, label);
      } else {
        localStorage.removeItem(SEMESTER_ID_KEY);
        localStorage.removeItem(SEMESTER_LABEL_KEY);
      }
    } catch {
      // ignore
    }

    if (id) {
      await loadCoursesForSemester(id);
    } else {
      setCourses([]);
    }
  };

  const handleOpenCourse = (courseId) => {
    navigate(`/lecturer/courses/${courseId}`);
  };

  const getScheduleSlots = (course) => {
    if (!course.days_and_times) return [];

    // if JSON in DB
    if (typeof course.days_and_times === "string") {
      try {
        const parsed = JSON.parse(course.days_and_times);
        if (parsed && typeof parsed === "object") {
          return Object.entries(parsed).map(
            ([day, time]) => `${day}: ${time}`
          );
        }
      } catch {
        // not JSON; fall through
      }

      // fallback: split by comma / newline to chips
      return course.days_and_times
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    return [String(course.days_and_times)];
  };

  const totalCourses = courses.length;

  if (loading) {
    // Fancy loading skeleton
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-primary/80 uppercase">
              Lecturer workspace
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              My Courses
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Loading your teaching schedule...
            </p>
          </div>
          <div className="h-9 w-44 rounded-full bg-slate-100 animate-pulse" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card
              key={i}
              className="h-40 animate-pulse border border-slate-100 bg-slate-50/70"
            >
              <div className="flex h-full flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-3 w-16 rounded bg-slate-200" />
                  <div className="h-4 w-32 rounded bg-slate-200" />
                  <div className="h-3 w-24 rounded bg-slate-200" />
                </div>
                <div className="flex justify-end gap-2">
                  <div className="h-7 w-24 rounded-full bg-slate-200" />
                  <div className="h-7 w-24 rounded-full bg-slate-200" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-primary/80 uppercase">
            Lecturer workspace
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            My Courses
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your teaching load, grades and course content for the selected
            semester.
          </p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-[11px] text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>
              {totalCourses} course{totalCourses === 1 ? "" : "s"} in{" "}
              <span className="font-medium text-slate-800">
                {selectedSemesterLabel || "semester"}
              </span>
            </span>
          </div>
        </div>

        {/* Semester selector */}
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {semesters.length > 0 ? (
            <>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                🎓 Semester
              </span>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                <select
                  className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none"
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
            </>
          ) : (
            <span className="text-xs text-slate-400">
              No semesters found for your account.
            </span>
          )}
        </div>
      </div>

      {/* Error banner */}
      {err && (
        <Card className="border border-red-100 bg-red-50/80">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-sm">
              ⚠️
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-red-700">
                Something went wrong
              </p>
              <p className="text-xs text-red-600">{err}</p>
              <Button
                size="sm"
                className="mt-1 text-xs"
                onClick={init}
              >
                Try again
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Courses grid */}
      {courses.length === 0 ? (
        <Card className="border border-dashed border-slate-200 bg-slate-50/60">
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <span className="text-2xl">📭</span>
            <p className="text-sm font-medium text-slate-700">
              No courses in this semester
            </p>
            <p className="text-xs text-slate-500 max-w-md">
              You are not assigned to any courses for{" "}
              <span className="font-semibold">
                {selectedSemesterLabel || "the selected semester"}
              </span>
              . Once your department assigns courses, they will appear here.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => {
            const scheduleSlots = getScheduleSlots(c);
            return (
              <Card
                key={c.id}
                className="group flex flex-col justify-between border border-slate-100 bg-white/90 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md cursor-pointer"
                onClick={() => handleOpenCourse(c.id)}
              >
                <div className="space-y-3">
                  {/* Top tag row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary">
                      <span>📘</span>
                      <span>{c.course_code}</span>
                    </div>
                    {c.section && (
                      <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
                        Section {c.section}
                      </span>
                    )}
                  </div>

                  {/* Course title */}
                  <div>
                    <p className="line-clamp-2 text-sm font-semibold text-slate-900">
                      {c.name}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Semester ID: #{c.semester_id}
                    </p>
                  </div>

                  {/* Schedule */}
                  {scheduleSlots.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <span>⏰</span>
                        <span>Schedule</span>
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {scheduleSlots.map((slot, idx) => (
                          <span
                            key={idx}
                            className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700"
                          >
                            {slot}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-dashed border-slate-200 pt-3">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Teaching course</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/lecturer/courses/${c.id}/grades`);
                      }}
                    >
                      📊 Manage Grades
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCourse(c.id);
                      }}
                    >
                      ⚙️ Manage Course
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LecturerCourseList;
