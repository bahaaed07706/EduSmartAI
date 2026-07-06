// src/pages/Lecturer/LecturerCourseAttendance.jsx

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CalendarDays, Users, CheckCircle2, Clock3 } from "lucide-react";
import lecturerApi from "../../api/lecturerApi";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";

const STATUSES = ["present", "absent", "late"];

const DAY_INDEX_LABEL = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

const DAY_KEY_TO_INDEX = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

const parseYmd = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const formatYmd = (date) => {
  if (!(date instanceof Date)) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseDaysAndTimes = (raw) => {
  if (!raw) return {};
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    // ignore
  }
  return {};
};

const buildSessions = (semester, daysAndTimesRaw) => {
  if (!semester || !semester.start_date || !semester.end_date) return [];

  const map = parseDaysAndTimes(daysAndTimesRaw);
  const keys = Object.keys(map || {});
  if (!keys.length) return [];

  const start = parseYmd(semester.start_date);
  const end = parseYmd(semester.end_date);
  if (!start || !end) return [];

  const sessions = [];
  // iterate day by day
  for (
    let d = new Date(start.getTime());
    d <= end;
    d.setDate(d.getDate() + 1)
  ) {
    const dow = d.getDay(); // 0 (Sun) - 6 (Sat)
    const matchingKey = keys.find(
      (k) => DAY_KEY_TO_INDEX[k.toLowerCase()] === dow
    );
    if (!matchingKey) continue;

    const timeRange = map[matchingKey];
    const ymd = formatYmd(d);
    const dayName = DAY_INDEX_LABEL[dow] || matchingKey;

    sessions.push({
      date: ymd,
      dayName,
      dayKey: matchingKey,
      timeRange: timeRange || "",
      label: `${dayName} ${ymd}${timeRange ? ` • ${timeRange}` : ""}`,
    });
  }

  return sessions;
};

const LecturerCourseAttendance = () => {
  const { courseId } = useParams();

  const [students, setStudents] = useState([]);
  const [summaryRows, setSummaryRows] = useState([]);
  const [courseOverview, setCourseOverview] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [attendanceForm, setAttendanceForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingDay, setLoadingDay] = useState(false);

  const loadDayAttendance = useCallback(
    async (targetDate) => {
      if (!targetDate) {
        setAttendanceForm({});
        return;
      }
      setLoadingDay(true);
      try {
        const rows = await lecturerApi.getCourseAttendanceForDate(
          courseId,
          targetDate
        );
        const map = {};
        if (Array.isArray(rows)) {
          rows.forEach((r) => {
            if (r.student_id != null && r.status) {
              map[r.student_id] = r.status;
            }
          });
        }
        setAttendanceForm(map);
      } catch (err) {
        console.error("Failed to load attendance for date", err);
        setAttendanceForm({});
      } finally {
        setLoadingDay(false);
      }
    },
    [courseId]
  );

  const loadSummary = useCallback(async () => {
    try {
      const summaryRes = await lecturerApi.getCourseAttendanceSummary(courseId);
      setSummaryRows(Array.isArray(summaryRes) ? summaryRes : []);
    } catch (err) {
      console.error("Failed to load attendance summary", err);
      setSummaryRows([]);
    }
  }, [courseId]);

  // Initial bootstrap: students, summary, overview, sessions + default date
  const bootstrap = useCallback(async () => {
    try {
      setLoading(true);
      const [studentsRes, summaryRes, overviewRes] = await Promise.all([
        lecturerApi.getCourseStudents(courseId),
        lecturerApi.getCourseAttendanceSummary(courseId),
        lecturerApi.getCourseOverview(courseId),
      ]);

      setStudents(Array.isArray(studentsRes) ? studentsRes : []);
      setSummaryRows(Array.isArray(summaryRes) ? summaryRes : []);
      setCourseOverview(overviewRes || null);

      const semester = overviewRes?.semester || null;
      const daysAndTimes =
        overviewRes?.course?.days_and_times || overviewRes?.days_and_times;
      const sessionsList = buildSessions(semester, daysAndTimes);
      setSessions(sessionsList);

      let initialDate = "";

      if (sessionsList.length > 0) {
        // pick the session whose date is CLOSEST to today (past or future)
        const today = new Date();
        const todayStr = formatYmd(today);
        const todayDate = parseYmd(todayStr);

        let closest = sessionsList[0];
        let minDiff = Infinity;

        sessionsList.forEach((s) => {
          const sessionDate = parseYmd(s.date);
          if (!sessionDate) return;
          const diff = Math.abs(sessionDate - todayDate);
          if (diff < minDiff) {
            minDiff = diff;
            closest = s;
          }
        });

        initialDate = closest?.date || sessionsList[0].date;
      } else {
        // fallback custom date when no schedule exists
        initialDate = formatYmd(new Date());
      }

      setSelectedDate(initialDate);
      if (initialDate) {
        await loadDayAttendance(initialDate);
      }
    } catch (err) {
      console.error("Failed to bootstrap attendance page", err);
      setStudents([]);
      setSummaryRows([]);
      setCourseOverview(null);
      setSessions([]);
      setSelectedDate("");
      setAttendanceForm({});
    } finally {
      setLoading(false);
    }
  }, [courseId, loadDayAttendance]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const handleStatusChange = (studentId, value) => {
    setAttendanceForm((prev) => ({
      ...prev,
      [studentId]: value,
    }));
  };

  const handleSessionChange = async (e) => {
    const value = e.target.value;
    setSelectedDate(value);
    if (value) {
      await loadDayAttendance(value);
    } else {
      setAttendanceForm({});
    }
  };

  const handleSave = async () => {
    if (!selectedDate) {
      alert("Please choose a date.");
      return;
    }

    const records = Object.entries(attendanceForm)
      .filter(([_, status]) => status)
      .map(([studentId, status]) => ({
        student_id: Number(studentId),
        course_id: Number(courseId),
        date: selectedDate,
        status,
      }));

    if (records.length === 0) {
      alert("No attendance changes selected.");
      return;
    }

    setSaving(true);
    try {
      await lecturerApi.markAttendanceBulk(courseId, records);
      await Promise.all([loadSummary(), loadDayAttendance(selectedDate)]);
      alert("Attendance saved.");
    } catch (e) {
      console.error(e);
      alert("Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  };

  const findSummary = (studentId) =>
    summaryRows.find((s) => s.student_id === studentId);

  const courseMeta = courseOverview?.course;
  const semesterInfo = courseOverview?.semester;
  const currentSession = sessions.find((s) => s.date === selectedDate);
  const entryLabel = currentSession ? currentSession.label : selectedDate || "—";

  // -------- Loading state --------
  if (loading && students.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="h-4 w-36 rounded bg-slate-100 animate-pulse" />
            <div className="mt-2 h-3 w-64 rounded bg-slate-100 animate-pulse" />
          </div>
          <div className="h-8 w-24 rounded-full bg-slate-100 animate-pulse" />
        </div>
        <Card className="space-y-2">
          <div className="h-3 w-32 rounded bg-slate-100 animate-pulse" />
          <div className="h-32 rounded-lg bg-slate-50 animate-pulse" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 via-sky-50 to-primary/5 ring-1 ring-primary/20">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">
              Course #{courseId}
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {courseMeta
                ? `${courseMeta.course_code} – ${courseMeta.name} – Attendance`
                : "Attendance"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Mark attendance for each session and track overall presence for
              your students across the semester.
            </p>
            {semesterInfo && (
              <div className="mt-2 inline-flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                  <Clock3 className="h-3 w-3" />
                  <span>
                    Semester:{" "}
                    <span className="font-semibold">
                      {semesterInfo.name} {semesterInfo.year}
                    </span>
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                  <span>📅</span>
                  <span>
                    {semesterInfo.start_date} → {semesterInfo.end_date}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                  <Users className="h-3 w-3" />
                  <span>{students.length} students</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mark attendance card */}
      <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border border-slate-100 bg-white/95 shadow-sm">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Mark Attendance
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Choose a scheduled class session, then set each student&apos;s
            status. Existing records are pre-filled and can be updated at any
            time.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {/* Enhanced session dropdown */}
          <div className="flex flex-col text-xs">
            <label className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              Class session
            </label>
            {sessions.length > 0 ? (
              <div className="relative">
                <select
                  className="w-full min-w-[240px] appearance-none rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={selectedDate || ""}
                  onChange={handleSessionChange}
                >
                  {sessions.map((s) => (
                    <option key={s.date} value={s.date}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400 text-xs">
                  ▼
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="relative">
                  <input
                    type="date"
                    className="w-full min-w-[200px] rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    value={selectedDate}
                    onChange={handleSessionChange}
                  />
                </div>
                <span className="text-[11px] text-slate-500">
                  No schedule set; using a custom date.
                </span>
              </div>
            )}
            {loadingDay && (
              <span className="mt-1 text-[11px] text-slate-400">
                Loading statuses for this date...
              </span>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="text-xs"
          >
            {saving ? "Saving..." : "Save Attendance"}
          </Button>
        </div>
      </Card>

      {/* Selected date entry */}
      <Card className="border border-slate-100 bg-white/95 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">
            Entry for{" "}
            <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
              {entryLabel}
            </span>
          </h3>
          <p className="text-[11px] text-slate-500">
            Tip: leave status blank to keep the existing record unchanged.
          </p>
        </div>

        <div className="max-h-80 overflow-auto rounded-xl border border-slate-100">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-1.5 px-3 text-left">Student #</th>
                <th className="py-1.5 px-3 text-left">Name</th>
                <th className="py-1.5 px-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {students.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-slate-50/70 transition-colors"
                >
                  <td className="py-1.5 px-3 align-middle">
                    <span className="text-[11px] font-medium text-slate-700">
                      {s.student_number}
                    </span>
                  </td>
                  <td className="py-1.5 px-3 align-middle">
                    <span className="text-xs font-semibold text-slate-900">
                      {s.name}
                    </span>
                  </td>
                  <td className="py-1.5 px-3 align-middle">
                    {/* Enhanced status dropdown */}
                    <select
                      className="w-full max-w-[160px] rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-800 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      value={attendanceForm[s.id] || ""}
                      onChange={(e) =>
                        handleStatusChange(s.id, e.target.value)
                      }
                    >
                      <option value="">Select status…</option>
                      {STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st.charAt(0).toUpperCase() + st.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="py-4 text-center text-sm text-slate-400"
                  >
                    No students enrolled.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary card */}
      <Card className="border border-slate-100 bg-white/95 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">
            Attendance Summary (All Time)
          </h3>
          <p className="text-[11px] text-slate-500">
            Overview of present, absent and late counts for the whole course.
          </p>
        </div>
        <div className="max-h-80 overflow-auto rounded-xl border border-slate-100">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-1.5 px-3 text-left">Student #</th>
                <th className="py-1.5 px-3 text-left">Name</th>
                <th className="py-1.5 px-3 text-left">Present</th>
                <th className="py-1.5 px-3 text-left">Absent</th>
                <th className="py-1.5 px-3 text-left">Late</th>
                <th className="py-1.5 px-3 text-left">Total</th>
                <th className="py-1.5 px-3 text-left">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {students.map((s) => {
                const sum = findSummary(s.id) || {
                  present: 0,
                  absent: 0,
                  late: 0,
                  total: 0,
                  attendance_rate: null,
                };
                return (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-1.5 px-3 align-middle">
                      {s.student_number}
                    </td>
                    <td className="py-1.5 px-3 align-middle">{s.name}</td>
                    <td className="py-1.5 px-3 align-middle text-emerald-600">
                      {sum.present}
                    </td>
                    <td className="py-1.5 px-3 align-middle text-rose-500">
                      {sum.absent}
                    </td>
                    <td className="py-1.5 px-3 align-middle text-amber-500">
                      {sum.late}
                    </td>
                    <td className="py-1.5 px-3 align-middle">{sum.total}</td>
                    <td className="py-1.5 px-3 align-middle">
                      {sum.attendance_rate != null
                        ? `${sum.attendance_rate.toFixed(1)}%`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
              {students.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-4 text-center text-sm text-slate-400"
                  >
                    No students enrolled.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default LecturerCourseAttendance;
