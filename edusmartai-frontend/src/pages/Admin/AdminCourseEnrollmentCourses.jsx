// src/pages/Admin/AdminCourseEnrollmentCourses.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutTemplate,
  GraduationCap,
  CalendarDays,
  Building2,
  RefreshCcw,
  Users,
} from "lucide-react";
import adminApi from "../../api/adminApi";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";

const AdminCourseEnrollmentCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      setErr("");
      const data = await adminApi.getCourses();
      setCourses(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load courses for enrollments", e);
      setErr("Failed to load courses.");
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = {
    total: courses.length,
    withSemester: courses.filter((c) => c.semester_id).length,
    withDepartment: courses.filter((c) => c.department_id).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 via-sky-50 to-primary/5 ring-1 ring-primary/20">
            <LayoutTemplate className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">
              Admin · Enrollments
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Course Enrollments
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Pick a course to manage which students are enrolled. To edit
              course details or semester, use the{" "}
              <button
                type="button"
                onClick={() => navigate("/admin/courses")}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Courses
              </button>{" "}
              page.
            </p>

            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                <GraduationCap className="h-3 w-3 text-slate-600" />
                <span>{stats.total} courses</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                <Building2 className="h-3 w-3 text-slate-600" />
                <span>{stats.withDepartment} with department</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                <CalendarDays className="h-3 w-3 text-slate-600" />
                <span>{stats.withSemester} with semester</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={load}
            disabled={loading}
          >
            <RefreshCcw className="mr-1 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main card */}
      <Card className="space-y-3 border border-slate-100 bg-white/95 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100">
              <Users className="h-4 w-4 text-slate-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Courses available for enrollment management
              </h3>
              <p className="text-[11px] text-slate-500">
                Choose a course to add or remove enrolled students.
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            {courses.length} course{courses.length === 1 ? "" : "s"}
          </p>
        </div>

        {err && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {err}
          </p>
        )}

        {loading && courses.length === 0 ? (
          <div className="space-y-2 text-xs text-slate-500">
            <p>Loading courses...</p>
            <div className="space-y-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 animate-pulse"
                >
                  <div className="h-3 w-40 rounded bg-slate-200" />
                  <div className="h-3 w-24 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          </div>
        ) : courses.length === 0 ? (
          <p className="text-sm text-slate-500">
            No courses found. Create courses first from the{" "}
            <button
              type="button"
              onClick={() => navigate("/admin/courses")}
              className="text-primary underline-offset-2 hover:underline"
            >
              Courses
            </button>{" "}
            page.
          </p>
        ) : (
          <div className="max-h-80 overflow-auto rounded-xl border border-slate-100">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="text-left py-1.5 px-3">Code &amp; Name</th>
                  <th className="text-left py-1.5 px-3">Department</th>
                  <th className="text-left py-1.5 px-3">Semester</th>
                  <th className="text-right py-1.5 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {courses.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-1.5 px-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-slate-900">
                          {c.course_code}
                        </span>
                        <span className="text-[11px] text-slate-600">
                          {c.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-1.5 px-3 text-xs text-slate-800">
                      {c.department_name || `Dept #${c.department_id}`}
                    </td>
                    <td className="py-1.5 px-3 text-xs text-slate-800">
                      {c.semester_name && c.semester_year
                        ? `${c.semester_name} ${c.semester_year}`
                        : c.semester_id
                        ? `Semester #${c.semester_id}`
                        : "Not set"}
                    </td>
                    <td className="py-1.5 px-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[11px] px-2 py-1"
                        onClick={() =>
                          navigate(`/admin/course-enrollments/${c.id}`)
                        }
                      >
                        Manage enrollments
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminCourseEnrollmentCourses;
