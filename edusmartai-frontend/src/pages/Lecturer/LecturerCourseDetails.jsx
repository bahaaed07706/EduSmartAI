// src/pages/Lecturer/LecturerCourseDetails.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import lecturerApi from "../../api/lecturerApi";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";

const LecturerCourseDetails = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview"); // overview | students
  const [courseOverview, setCourseOverview] = useState(null);
  const [students, setStudents] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    if (!courseId) return;

    const loadAll = async () => {
      try {
        setLoading(true);

        // Overview (if endpoint exists)
        if (lecturerApi.getCourseOverview) {
          try {
            const overview = await lecturerApi.getCourseOverview(courseId);
            setCourseOverview(overview);
          } catch (e) {
            console.error("Failed to load course overview", e);
            setCourseOverview(null);
          }
        }

        // Students
        try {
          const s = await lecturerApi.getCourseStudents(courseId);
          setStudents(Array.isArray(s) ? s : []);
        } catch (e) {
          console.error("Failed to load students", e);
          setStudents([]);
        }

        // Assessments (for overview stats only)
        try {
          const a = await lecturerApi.getCourseAssessments(courseId);
          setAssessments(Array.isArray(a) ? a : []);
        } catch (e) {
          console.error("Failed to load assessments for stats", e);
          setAssessments([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [courseId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Derived stats if overview is missing or partial
  const derivedOverview = useMemo(() => {
    const byType = { quiz: 0, assignment: 0, project: 0 };
    assessments.forEach((a) => {
      if (byType[a.type] != null) byType[a.type] += 1;
    });
    return {
      students_count: students.length,
      assessments_count: assessments.length,
      assessments_by_type: byType,
    };
  }, [assessments, students.length]);

  const overviewAssessByType =
    courseOverview?.assessments_by_type || derivedOverview.assessments_by_type;

  const studentsCount =
    courseOverview?.students_count ?? derivedOverview.students_count;
  const assessmentsCount =
    courseOverview?.assessments_count ?? derivedOverview.assessments_count;

  const courseMeta = courseOverview?.course;
  const courseTitle = courseMeta?.name || "Manage Course";
  const courseCode = courseMeta?.course_code || `#${courseId}`;

  // -------- Render tabs content --------

  const renderOverview = () => (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      {/* Snapshot card */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-sky-50 via-white to-indigo-50 shadow-sm">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/5" />
          <div className="absolute -left-16 -bottom-16 h-44 w-44 rounded-full bg-sky-100/70" />
        </div>

        <div className="relative space-y-5">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                <span>📊</span>
                <span>Course snapshot</span>
              </div>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">
                {courseCode} · {courseTitle}
              </h3>
              {courseMeta && (
                <p className="mt-1 text-xs text-slate-600">
                  Department ID{" "}
                  <span className="font-medium">
                    #{courseMeta.department_id}
                  </span>{" "}
                  · Semester ID{" "}
                  <span className="font-medium">#{courseMeta.semester_id}</span>
                </p>
              )}
            </div>

            {courseOverview?.avg_final_grade != null && (
              <div className="rounded-2xl bg-white/80 px-4 py-2 shadow-sm ring-1 ring-primary/15">
                <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <span>⭐</span>
                  <span>Average final grade</span>
                </p>
                <p className="mt-1 text-2xl font-bold text-primary">
                  {courseOverview.avg_final_grade.toFixed(1)}
                </p>
              </div>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 text-sm">
            <div className="rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-100">
              <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <span>👨‍🎓</span>
                <span>Students</span>
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {studentsCount}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Enrolled in this course.
              </p>
            </div>

            <div className="rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-100">
              <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <span>📝</span>
                <span>Assessments</span>
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {assessmentsCount}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Q: {overviewAssessByType.quiz || 0} · A:{" "}
                {overviewAssessByType.assignment || 0} · P:{" "}
                {overviewAssessByType.project || 0}
              </p>
            </div>

            <div className="rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-100">
              <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <span>📅</span>
                <span>Attendance records</span>
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {courseOverview?.attendance_records_count ?? "--"}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Marked across all sessions.
              </p>
            </div>

            <div className="rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-100">
              <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <span>📦</span>
                <span>Overview status</span>
              </p>
              <p className="text-sm font-semibold text-emerald-700">
                {courseOverview ? "Full overview available" : "Basic stats only"}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Data is generated automatically from your course activity.
              </p>
            </div>
          </div>

          {!courseOverview && (
            <p className="text-[11px] text-slate-500">
              Detailed overview is not available for this course. We&apos;re
              showing basic statistics derived from students and assessments
              instead.
            </p>
          )}
        </div>
      </Card>

      {/* Helper card */}
      <Card className="space-y-3 border border-slate-100 bg-white shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <span className="text-base">💡</span>
          <span>How to use this page</span>
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Use the navigation shortcuts above to manage{" "}
          <span className="font-medium">assignments, quizzes, projects</span>,
          <span className="font-medium"> attendance</span>, and{" "}
          <span className="font-medium">materials</span> from their dedicated
          pages. This dashboard focuses on{" "}
          <span className="font-medium">course health</span> and the{" "}
          <span className="font-medium">students roster</span>.
        </p>
        <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
            <span>📊</span> <span>Monitor performance</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
            <span>📅</span> <span>Check attendance</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
            <span>👥</span> <span>Review students list</span>
          </span>
        </div>
      </Card>
    </div>
  );

  const renderStudents = () => (
    <Card className="space-y-4 border border-slate-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span className="text-base">👥</span>
            <span>Students in course</span>
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Full roster of students registered in this course.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-[11px] text-slate-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>
            {students.length} student{students.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="max-h-80 overflow-auto rounded-xl border border-slate-100">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Student</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-right">Final grade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {students.map((s) => (
              <tr
                key={s.id}
                className="hover:bg-slate-50/80 transition-colors"
              >
                <td className="px-3 py-2 text-[11px] font-medium text-slate-700">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5">
                    <span>🎓</span>
                    <span>{s.student_number}</span>
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-slate-800">
                  <div className="flex flex-col">
                    <span className="font-medium">{s.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-[11px] text-slate-600">
                  {s.email}
                </td>
                <td className="px-3 py-2 text-right text-xs">
                  {s.final_grade != null ? (
                    <span className="inline-flex items-center justify-end gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <span>📈</span>
                      <span>{s.final_grade}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-sm text-slate-400"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg">📭</span>
                    <span>No students enrolled yet.</span>
                    <span className="text-[11px] text-slate-400">
                      Once students register for this course, they will appear
                      here.
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );

  // -------- Main render --------

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">
              Course cockpit
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {courseTitle}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Manage assessments, attendance, materials and students from a
              single view.
            </p>
            <div className="mt-2 inline-flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                <span>📘</span>
                <span>{courseCode}</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                <span>👨‍🎓</span>
                <span>{studentsCount} students</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                <span>📝</span>
                <span>{assessmentsCount} assessments</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              type="button"
              onClick={reload}
            >
              🔄 Refresh data
            </Button>
          </div>
        </div>

        {/* Navigation row */}
        <Card className="border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="mr-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Quick actions:
            </span>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              type="button"
              onClick={() =>
                navigate(`/lecturer/courses/${courseId}/assignments`)
              }
            >
              📄 Assignments
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              type="button"
              onClick={() => navigate(`/lecturer/courses/${courseId}/quizzes`)}
            >
              📝 Quizzes
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              type="button"
              onClick={() => navigate(`/lecturer/courses/${courseId}/projects`)}
            >
              🧩 Projects
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              type="button"
              onClick={() =>
                navigate(`/lecturer/courses/${courseId}/attendance`)
              }
            >
              👣 Attendance
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              type="button"
              onClick={() =>
                navigate(`/lecturer/courses/${courseId}/materials`)
              }
            >
              📚 Materials
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs bg-gradient-to-r from-blue-50 to-purple-50"
              type="button"
              onClick={() =>
                navigate(`/lecturer/courses/${courseId}/students`)
              }
            >
              🤖 Students + AI Predictions
            </Button>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 text-sm">
        <div className="flex overflow-x-auto">
          {[
            { id: "overview", label: "Overview", icon: "📊" },
            { id: "students", label: "Students", icon: "👥" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`relative -mb-px flex items-center gap-1 px-4 py-2 text-sm transition-colors ${activeTab === tab.id
                  ? "border-b-2 border-primary text-primary font-semibold"
                  : "border-b-2 border-transparent text-slate-500 hover:text-slate-700"
                }`}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <Card className="border border-slate-100 bg-slate-50/70">
          <p className="text-sm text-slate-500">Loading course data...</p>
        </Card>
      )}

      {/* Tab content */}
      {!loading && (
        <div className="pb-2">
          {activeTab === "overview" && renderOverview()}
          {activeTab === "students" && renderStudents()}
        </div>
      )}
    </div>
  );
};

export default LecturerCourseDetails;
