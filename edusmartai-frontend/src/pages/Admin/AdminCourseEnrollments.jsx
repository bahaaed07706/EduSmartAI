// src/pages/Admin/AdminCourseEnrollments.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Search,
  UserPlus,
  UserMinus,
  GraduationCap,
} from "lucide-react";
import adminApi from "../../api/adminApi";
import adminEnrollmentApi from "../../api/adminEnrollmentApi";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";
import Input from "../../components/UI/Input";

const AdminCourseEnrollments = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  // Load course + enrollments
  useEffect(() => {
    if (!courseId) return;

    const loadAll = async () => {
      try {
        setLoading(true);
        setErr("");

        const [courses, enrolls] = await Promise.all([
          adminApi.getCourses(),
          adminEnrollmentApi.getCourseEnrollments(courseId),
        ]);

        const c =
          (Array.isArray(courses) ? courses : []).find(
            (x) => String(x.id) === String(courseId)
          ) || null;

        setCourse(c);
        setEnrollments(Array.isArray(enrolls) ? enrolls : []);
      } catch (e) {
        console.error("Failed to load enrollments page data", e);
        setErr("Failed to load course enrollments.");
        setCourse(null);
        setEnrollments([]);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [courseId]);

  const reloadEnrollments = async () => {
    try {
      const enrolls = await adminEnrollmentApi.getCourseEnrollments(courseId);
      setEnrollments(Array.isArray(enrolls) ? enrolls : []);
    } catch (e) {
      console.error("Failed to reload enrollments", e);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const results = await adminEnrollmentApi.searchStudents(
        searchQuery.trim()
      );
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (e) {
      console.error("Failed to search students", e);
      alert("Failed to search students.");
    } finally {
      setSearching(false);
    }
  };

  const handleEnroll = async (student) => {
    if (!courseId || !student?.id) return;

    try {
      setAdding(true);
      await adminEnrollmentApi.enrollStudent(courseId, {
        student_id: student.id,
        // semester_id: null => backend uses course.semester_id
      });
      await reloadEnrollments();
    } catch (e) {
      console.error("Failed to enroll student", e);
      alert("Failed to enroll student. They may already be enrolled.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (enrollmentId) => {
    if (!courseId || !enrollmentId) return;

    if (!window.confirm("Remove this student from the course?")) return;

    try {
      setRemovingId(enrollmentId);
      await adminEnrollmentApi.removeEnrollment(courseId, enrollmentId);
      await reloadEnrollments();
    } catch (e) {
      console.error("Failed to remove enrollment", e);
      alert("Failed to remove enrollment.");
    } finally {
      setRemovingId(null);
    }
  };

  if (loading && !course) {
    return (
      <div className="p-4">
        <p className="text-sm text-slate-500">
          Loading course enrollments...
        </p>
      </div>
    );
  }

  if (err && !course) {
    return (
      <div className="p-4 space-y-3">
        <p className="text-sm text-red-600">{err}</p>
        <Button
          size="sm"
          variant="outline"
          className="inline-flex items-center gap-1"
          onClick={() => navigate("/admin/course-enrollments")}
        >
          <ArrowLeft className="h-3 w-3" />
          Back to courses
        </Button>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-4 space-y-3">
        <p className="text-sm text-slate-500">Course not found.</p>
        <Button
          size="sm"
          variant="outline"
          className="inline-flex items-center gap-1"
          onClick={() => navigate("/admin/course-enrollments")}
        >
          <ArrowLeft className="h-3 w-3" />
          Back to courses
        </Button>
      </div>
    );
  }

  const headerSubtitle = course.semester_name
    ? `${course.semester_name} ${course.semester_year || ""}`.trim()
    : course.semester_id
    ? `Semester #${course.semester_id}`
    : "No semester assigned";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/course-enrollments")}
            className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to courses
          </button>
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 via-sky-50 to-primary/5 ring-1 ring-primary/20">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">
              Course #{course.id}
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {course.course_code} – {course.name}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {headerSubtitle} •{" "}
              {course.department_name || `Dept #${course.department_id}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
            <Users className="h-3 w-3 text-slate-600" />
            <span>{enrollments.length} enrolled</span>
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Left: search students */}
        <Card className="md:col-span-1 space-y-3 border border-slate-100 bg-white/95 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
              <Search className="h-4 w-4 text-slate-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Add student to course
              </h3>
              <p className="text-[11px] text-slate-500">
                Search by name, email, or student number then enroll.
              </p>
            </div>
          </div>

          <form className="space-y-2" onSubmit={handleSearch}>
            <Input
              label="Search students"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Ali, 2023001, email@example.com"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                type="submit"
                disabled={searching}
                className="inline-flex items-center gap-1"
              >
                <Search className="h-3 w-3" />
                {searching ? "Searching..." : "Search"}
              </Button>
            </div>
          </form>

          {searchResults.length > 0 && (
            <div className="max-h-64 overflow-auto rounded-lg border border-slate-100">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left py-1.5 px-2">#</th>
                    <th className="text-left py-1.5 px-2">Name</th>
                    <th className="text-left py-1.5 px-2">Email</th>
                    <th className="text-right py-1.5 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {searchResults.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-1.5 px-2">
                        {s.student_number || s.id}
                      </td>
                      <td className="py-1.5 px-2">{s.name}</td>
                      <td className="py-1.5 px-2">{s.email}</td>
                      <td className="py-1.5 px-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5"
                          disabled={adding}
                          onClick={() => handleEnroll(s)}
                        >
                          <UserPlus className="h-3 w-3" />
                          Enroll
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {searchResults.length === 0 && searchQuery && !searching && (
            <p className="text-[11px] text-slate-500">
              No students found for this search.
            </p>
          )}
        </Card>

        {/* Right: current enrollments */}
        <Card className="md:col-span-2 space-y-3 border border-slate-100 bg-white/95 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
                <Users className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Enrolled students
                </h3>
                <p className="text-[11px] text-slate-500">
                  View and remove students currently enrolled in this course.
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              {enrollments.length} student
              {enrollments.length === 1 ? "" : "s"}
            </p>
          </div>

          {enrollments.length === 0 ? (
            <p className="text-sm text-slate-500">
              No students enrolled yet. Use the search panel to add students.
            </p>
          ) : (
            <div className="max-h-80 overflow-auto rounded-lg border border-slate-100">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left py-1.5 px-2">#</th>
                    <th className="text-left py-1.5 px-2">Name</th>
                    <th className="text-left py-1.5 px-2">Email</th>
                    <th className="text-left py-1.5 px-2">Final Grade</th>
                    <th className="text-right py-1.5 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {enrollments.map((en) => (
                    <tr
                      key={en.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-1.5 px-2">
                        {en.student?.student_number || en.student_id}
                      </td>
                      <td className="py-1.5 px-2">
                        {en.student?.name || "-"}
                      </td>
                      <td className="py-1.5 px-2">
                        {en.student?.email || "-"}
                      </td>
                      <td className="py-1.5 px-2">
                        {en.final_grade != null ? en.final_grade : "-"}
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 text-red-600"
                          disabled={removingId === en.id}
                          onClick={() => handleRemove(en.id)}
                        >
                          <UserMinus className="h-3 w-3" />
                          {removingId === en.id ? "Removing..." : "Remove"}
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
    </div>
  );
};

export default AdminCourseEnrollments;
