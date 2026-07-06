// src/pages/Lecturer/LecturerCourseGrades.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  BarChart3,
  AlertTriangle,
  UserCircle2,
  Save,
  RefreshCcw,
} from "lucide-react";
import lecturerApi from "../../api/lecturerApi";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";

const MAX_MID = 30;
const MAX_PARTICIPATION = 30;
const MAX_FINAL = 40;
const MAX_TOTAL = 100;

const LecturerCourseGrades = () => {
  const { courseId } = useParams();

  const [course, setCourse] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [savingStudentId, setSavingStudentId] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setErr("");

      const [overviewRes, gradesRes] = await Promise.all([
        lecturerApi.getCourseOverview(courseId),
        lecturerApi.getCourseGrades(courseId),
      ]);

      setCourse(overviewRes?.course || null);

      const data = Array.isArray(gradesRes) ? gradesRes : [];
      const mapped = data.map((r) => ({
        ...r,
        mid_grade: r.mid_grade ?? "",
        participation_grade: r.participation_grade ?? "",
        final_exam_grade: r.final_exam_grade ?? "",
      }));
      setRows(mapped);
    } catch (e) {
      console.error("Failed to load course grades", e);
      setErr("Failed to load grades data.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const handleChange = (studentId, field, value) => {
    setRows((prev) =>
      prev.map((row) =>
        row.student_id === studentId ? { ...row, [field]: value } : row
      )
    );
  };

  const computeLocalTotal = (row) => {
    const mid = parseFloat(row.mid_grade) || 0;
    const part = parseFloat(row.participation_grade) || 0;
    const final = parseFloat(row.final_exam_grade) || 0;
    return mid + part + final;
  };

  const handleSaveRow = async (row) => {
    setErr("");

    const mid =
      row.mid_grade === "" || row.mid_grade === null
        ? null
        : Number(row.mid_grade);
    const part =
      row.participation_grade === "" || row.participation_grade === null
        ? null
        : Number(row.participation_grade);
    const final =
      row.final_exam_grade === "" || row.final_exam_grade === null
        ? null
        : Number(row.final_exam_grade);

    const problems = [];
    if (mid != null && (mid < 0 || mid > MAX_MID)) {
      problems.push(`Mid grade must be between 0 and ${MAX_MID}.`);
    }
    if (part != null && (part < 0 || part > MAX_PARTICIPATION)) {
      problems.push(
        `Participation grade must be between 0 and ${MAX_PARTICIPATION}.`
      );
    }
    if (final != null && (final < 0 || final > MAX_FINAL)) {
      problems.push(`Final exam grade must be between 0 and ${MAX_FINAL}.`);
    }

    if (problems.length > 0) {
      setErr(`Student ${row.student_number}: ${problems.join(" ")}`);
      return;
    }

    setSavingStudentId(row.student_id);
    try {
      const updated = await lecturerApi.updateStudentCourseGrades(
        courseId,
        row.student_id,
        {
          mid_grade: mid,
          participation_grade: part,
          final_exam_grade: final,
        }
      );

      setRows((prev) =>
        prev.map((r) =>
          r.student_id === row.student_id
            ? {
                ...r,
                mid_grade:
                  updated.mid_grade !== null && updated.mid_grade !== undefined
                    ? updated.mid_grade
                    : "",
                participation_grade:
                  updated.participation_grade !== null &&
                  updated.participation_grade !== undefined
                    ? updated.participation_grade
                    : "",
                final_exam_grade:
                  updated.final_exam_grade !== null &&
                  updated.final_exam_grade !== undefined
                    ? updated.final_exam_grade
                    : "",
                total_grade: updated.total_grade,
                assess_avg: updated.assess_avg,
                assess_max: updated.assess_max,
                assess_min: updated.assess_min,
                assess_sum: updated.assess_sum,
                assess_count: updated.assess_count,
              }
            : r
        )
      );
    } catch (e) {
      console.error("Failed to save grades summary", e);
      setErr("Failed to save grades for this student.");
    } finally {
      setSavingStudentId(null);
    }
  };

  // ------- Derived grade summary for header chips -------
  const summary = useMemo(() => {
    if (!rows.length) {
      return {
        enrolled: 0,
        withTotal: 0,
        avgTotal: null,
        maxTotal: null,
        minTotal: null,
      };
    }

    let totals = [];
    rows.forEach((row) => {
      const total =
        row.total_grade != null
          ? Number(row.total_grade)
          : computeLocalTotal(row);
      if (!Number.isNaN(total)) {
        totals.push(total);
      }
    });

    if (!totals.length) {
      return {
        enrolled: rows.length,
        withTotal: 0,
        avgTotal: null,
        maxTotal: null,
        minTotal: null,
      };
    }

    const sum = totals.reduce((acc, v) => acc + v, 0);
    const avg = sum / totals.length;
    const max = Math.max(...totals);
    const min = Math.min(...totals);

    return {
      enrolled: rows.length,
      withTotal: totals.length,
      avgTotal: avg.toFixed(1),
      maxTotal: max.toFixed(1),
      minTotal: min.toFixed(1),
    };
  }, [rows]);

  // ------- Loading skeleton -------
  if (loading && !course) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Course grades</span>
            </div>
            <div className="mt-2 h-5 w-40 rounded bg-slate-100 animate-pulse" />
            <div className="mt-1 h-3 w-64 rounded bg-slate-100 animate-pulse" />
          </div>
          <div className="h-8 w-24 rounded-full bg-slate-100 animate-pulse" />
        </div>

        <Card className="space-y-3">
          <div className="h-3 w-36 rounded bg-slate-100 animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 animate-pulse"
              >
                <div className="h-3 w-48 rounded bg-slate-200" />
                <div className="h-3 w-20 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  // ------- Course not found -------
  if (!course) {
    return (
      <div className="p-4">
        <Card className="flex items-center gap-3 border border-red-100 bg-red-50/80">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              Course not found
            </p>
            <p className="text-xs text-red-600 mt-1">
              We couldn&apos;t load the course details. Please go back and try
              again.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 via-sky-50 to-primary/5 ring-1 ring-primary/20">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">
              {course.course_code} · Course #{courseId}
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {course.name} – Grades
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Enter <span className="font-semibold">midterm ({MAX_MID})</span>,{" "}
              <span className="font-semibold">
                participation ({MAX_PARTICIPATION})
              </span>{" "}
              and <span className="font-semibold">final exam ({MAX_FINAL})</span>{" "}
              grades for each student. Totals and assessment statistics are
              calculated automatically.
            </p>

            {/* Summary chips */}
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                <UserCircle2 className="h-3.5 w-3.5" />
                <span>{summary.enrolled} students</span>
              </span>
              {summary.avgTotal && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                  <span>📊</span>
                  <span>
                    Class avg:{" "}
                    <span className="font-semibold">{summary.avgTotal}</span> /
                    {MAX_TOTAL}
                  </span>
                </span>
              )}
              {summary.maxTotal && summary.minTotal && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                  <span>⬆️⬇️</span>
                  <span>
                    Max: {summary.maxTotal} · Min: {summary.minTotal}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={loadData}
          >
            <RefreshCcw className="mr-1 h-3.5 w-3.5" />
            Refresh data
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {err && (
        <Card className="flex items-start gap-2 border border-red-100 bg-red-50/80">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" />
          <p className="text-xs text-red-700">{err}</p>
        </Card>
      )}

      {/* Grades table */}
      <Card className="border border-slate-100 bg-white/95 shadow-sm">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <UserCircle2 className="h-6 w-6 text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-800">
              No students enrolled yet
            </p>
            <p className="text-xs text-slate-500 max-w-md">
              Once students are enrolled in this course, you&apos;ll be able to
              enter and manage their grades here.
            </p>
          </div>
        ) : (
          <div className="max-h-[30rem] overflow-auto rounded-xl border border-slate-100">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="text-left py-2 px-3">Student</th>
                  <th className="text-center py-2 px-3">Mid ({MAX_MID})</th>
                  <th className="text-center py-2 px-3">
                    Participation ({MAX_PARTICIPATION})
                  </th>
                  <th className="text-center py-2 px-3">Final ({MAX_FINAL})</th>
                  <th className="text-center py-2 px-3">
                    Total ({MAX_TOTAL})
                  </th>
                  <th className="text-center py-2 px-3">
                    Assess stats (avg / max / min / count)
                  </th>
                  <th className="text-right py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((row) => {
                  const localTotal =
                    row.total_grade != null
                      ? Number(row.total_grade)
                      : computeLocalTotal(row);

                  return (
                    <tr
                      key={row.student_id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Student info */}
                      <td className="py-2 px-3 align-top">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-900">
                            {row.name}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            #{row.student_number} · {row.email}
                          </span>
                        </div>
                      </td>

                      {/* Mid */}
                      <td className="py-2 px-3 text-center align-top">
                        <input
                          type="number"
                          min={0}
                          max={MAX_MID}
                          step="0.01"
                          className="w-20 rounded-md border border-slate-200 px-1 py-0.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary"
                          value={row.mid_grade}
                          onChange={(e) =>
                            handleChange(
                              row.student_id,
                              "mid_grade",
                              e.target.value
                            )
                          }
                        />
                      </td>

                      {/* Participation */}
                      <td className="py-2 px-3 text-center align-top">
                        <input
                          type="number"
                          min={0}
                          max={MAX_PARTICIPATION}
                          step="0.01"
                          className="w-20 rounded-md border border-slate-200 px-1 py-0.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary"
                          value={row.participation_grade}
                          onChange={(e) =>
                            handleChange(
                              row.student_id,
                              "participation_grade",
                              e.target.value
                            )
                          }
                        />
                      </td>

                      {/* Final */}
                      <td className="py-2 px-3 text-center align-top">
                        <input
                          type="number"
                          min={0}
                          max={MAX_FINAL}
                          step="0.01"
                          className="w-20 rounded-md border border-slate-200 px-1 py-0.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary"
                          value={row.final_exam_grade}
                          onChange={(e) =>
                            handleChange(
                              row.student_id,
                              "final_exam_grade",
                              e.target.value
                            )
                          }
                        />
                      </td>

                      {/* Total */}
                      <td className="py-2 px-3 text-center align-top">
                        <span className="inline-flex items-center justify-center rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-900">
                          {localTotal.toFixed(2)} / {MAX_TOTAL}
                        </span>
                      </td>

                      {/* Assessment stats */}
                      <td className="py-2 px-3 text-center align-top">
                        {row.assess_count && row.assess_count > 0 ? (
                          <div className="flex flex-col text-[11px] text-slate-600">
                            <span>
                              avg:{" "}
                              {Number(row.assess_avg).toFixed(2)}
                            </span>
                            <span>
                              max:{" "}
                              {Number(row.assess_max).toFixed(2)} · min:{" "}
                              {Number(row.assess_min).toFixed(2)}
                            </span>
                            <span>count: {row.assess_count}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            No assessment stats yet
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-right align-top">
                        <Button
                          size="sm"
                          className="inline-flex items-center gap-1 text-xs px-2 py-1"
                          disabled={savingStudentId === row.student_id}
                          onClick={() => handleSaveRow(row)}
                        >
                          <Save className="h-3.5 w-3.5" />
                          {savingStudentId === row.student_id
                            ? "Saving..."
                            : "Save"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default LecturerCourseGrades;
