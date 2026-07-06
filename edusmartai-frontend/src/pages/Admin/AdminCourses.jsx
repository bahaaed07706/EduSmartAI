// src/pages/Admin/AdminCourses.jsx

import React, { useEffect, useState, useMemo } from "react";
import {
  LayoutTemplate,
  BookOpen,
  CalendarDays,
  Clock,
  RefreshCcw,
  PlusCircle,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import adminApi from "../../api/adminApi";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";
import Input from "../../components/UI/Input";

const DAY_OPTIONS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const parseScheduleString = (raw) => {
  if (!raw) {
    const empty = {};
    DAY_OPTIONS.forEach(({ key }) => {
      empty[key] = { enabled: false, from: "", to: "" };
    });
    return empty;
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const out = {};
      DAY_OPTIONS.forEach(({ key }) => {
        const range = parsed[key];
        if (range) {
          const [from, to] = String(range).split("-");
          out[key] = {
            enabled: true,
            from: from || "",
            to: to || "",
          };
        } else {
          out[key] = { enabled: false, from: "", to: "" };
        }
      });
      return out;
    }
  } catch {
    // ignore malformed JSON
  }

  const empty = {};
  DAY_OPTIONS.forEach(({ key }) => {
    empty[key] = { enabled: false, from: "", to: "" };
  });
  return empty;
};

const buildScheduleString = (scheduleMap) => {
  const obj = {};
  Object.entries(scheduleMap || {}).forEach(([key, val]) => {
    if (val && val.enabled && val.from && val.to) {
      obj[key] = `${val.from}-${val.to}`;
    }
  });
  return Object.keys(obj).length ? JSON.stringify(obj) : "";
};

const formatScheduleShort = (raw) => {
  if (!raw) return "";
  const map = parseScheduleString(raw);
  const parts = [];

  DAY_OPTIONS.forEach(({ key, label }) => {
    const item = map[key];
    if (item && item.enabled && item.from && item.to) {
      parts.push(`${label.slice(0, 3)} ${item.from}-${item.to}`);
    }
  });

  return parts.join(", ");
};

const AdminCourses = () => {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [semesters, setSemesters] = useState([]);

  const [editing, setEditing] = useState(null); // course or null

  const [form, setForm] = useState({
    course_code: "",
    name: "",
    department_id: "",
    lecturer_id: "",
    semester_id: "",
    days_and_times: "",
  });

  const [scheduleMap, setScheduleMap] = useState(() =>
    parseScheduleString("")
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formOpen, setFormOpen] = useState(false);

  // -------- Load data --------
  const load = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const [coursesRes, depsRes, lecsRes, semsRes] = await Promise.all([
        adminApi.getCourses().catch((e) => {
          console.warn("getCourses failed", e);
          return [];
        }),
        adminApi.getDepartments().catch((e) => {
          console.warn("getDepartments failed", e);
          return [];
        }),
        adminApi.getLecturers().catch((e) => {
          console.warn("getLecturers failed", e);
          return [];
        }),
        adminApi.getSemesters().catch((e) => {
          console.warn("getSemesters failed", e);
          return [];
        }),
      ]);

      setCourses(Array.isArray(coursesRes) ? coursesRes : []);
      setDepartments(Array.isArray(depsRes) ? depsRes : []);
      setLecturers(Array.isArray(lecsRes) ? lecsRes : []);
      setSemesters(Array.isArray(semsRes) ? semsRes : []);
    } catch (err) {
      console.error("Failed to load courses data", err);
      setError("Failed to load courses. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Keep form.days_and_times in sync with scheduleMap
  useEffect(() => {
    const raw = buildScheduleString(scheduleMap);
    setForm((f) => ({ ...f, days_and_times: raw }));
  }, [scheduleMap]);

  // -------- helpers --------
  const resetForm = () => {
    setEditing(null);
    setForm({
      course_code: "",
      name: "",
      department_id: "",
      lecturer_id: "",
      semester_id: "",
      days_and_times: "",
    });
    setScheduleMap(parseScheduleString(""));
  };

  const openCreateModal = () => {
    setError("");
    setSuccess("");
    const defaultSchedule = '{"mon":"10:00-12:00"}';

    setEditing(null);
    setForm({
      course_code: "",
      name: "",
      department_id: departments[0]?.id || "",
      lecturer_id: lecturers[0]?.id || "",
      semester_id: semesters[0]?.id || "",
      days_and_times: defaultSchedule,
    });
    setScheduleMap(parseScheduleString(defaultSchedule));
    setFormOpen(true);
  };

  const openEditModal = (course) => {
    setError("");
    setSuccess("");

    const raw = course.days_and_times || "";

    setEditing(course);
    setForm({
      course_code: course.course_code,
      name: course.name,
      department_id: course.department_id,
      lecturer_id: course.lecturer_id || "",
      semester_id: course.semester_id,
      days_and_times: raw,
    });
    setScheduleMap(parseScheduleString(raw));
    setFormOpen(true);
  };

  const closeFormModal = () => {
    if (saving) return;
    setFormOpen(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (
      !form.course_code ||
      !form.name ||
      !form.department_id ||
      !form.semester_id
    ) {
      setError("Please fill all required fields (code, name, department, semester).");
      return;
    }

    const payload = {
      course_code: form.course_code.trim(),
      name: form.name.trim(),
      department_id: Number(form.department_id),
      lecturer_id: form.lecturer_id ? Number(form.lecturer_id) : null,
      semester_id: Number(form.semester_id),
      days_and_times: form.days_and_times || null,
    };

    try {
      setSaving(true);

      if (editing) {
        await adminApi.updateCourse(editing.id, payload);
        setSuccess("Course updated successfully.");
      } else {
        await adminApi.createCourse(payload);
        setSuccess("Course created successfully.");
      }

      closeFormModal();
      await load();
    } catch (err) {
      console.error("Failed to save course", err);
      setError("Failed to save course. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (course) => {
    setError("");
    setSuccess("");

    if (
      !window.confirm(
        `Delete course "${course.name}" (${course.course_code})? This cannot be undone.`
      )
    )
      return;

    try {
      await adminApi.deleteCourse(course.id);
      setSuccess("Course deleted.");
      await load();
    } catch (err) {
      console.error("Failed to delete course", err);
      setError("Failed to delete course. Please try again.");
    }
  };

  const getDepName = (id) =>
    departments.find((d) => d.id === id)?.name || id;

  const getLecName = (id) =>
    lecturers.find((l) => l.id === id)?.name || (id || "Unassigned");

  const getSemName = (id) => {
    const s = semesters.find((x) => x.id === id);
    if (!s) return id;
    return s.year ? `${s.name} ${s.year}` : s.name;
  };

  // simple stats
  const stats = useMemo(() => {
    const total = courses.length;
    const assigned = courses.filter((c) => c.lecturer_id).length;
    const withSchedule = courses.filter((c) => !!c.days_and_times).length;
    return { total, assigned, withSchedule };
  }, [courses]);

  // -------- render --------
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 via-sky-50 to-primary/5 ring-1 ring-primary/20">
            <LayoutTemplate className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">
              Admin · Curriculum
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Courses
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Create and manage courses, assign lecturers, link semesters, and
              configure weekly schedules.
            </p>

            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                <BookOpen className="h-3 w-3 text-slate-600" />
                <span>{stats.total} total</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                <CalendarDays className="h-3 w-3 text-slate-600" />
                <span>{stats.assigned} with lecturer</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                <Clock className="h-3 w-3 text-slate-600" />
                <span>{stats.withSchedule} with schedule</span>
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
          <Button size="sm" className="text-xs" onClick={openCreateModal}>
            <PlusCircle className="mr-1 h-4 w-4" />
            New Course
          </Button>
        </div>
      </div>

      {/* GLOBAL MESSAGES */}
      {(error || success) && (
        <div className="space-y-2">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              {success}
            </div>
          )}
        </div>
      )}

      {/* LIST CARD */}
      <Card className="border border-slate-100 bg-white/95 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Course Catalog
            </h3>
            <p className="text-[11px] text-slate-500">
              Overview of all courses with their department, lecturer, semester,
              and weekly schedule.
            </p>
          </div>
          <p className="text-[11px] text-slate-400">
            {courses.length} course{courses.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="max-h-80 overflow-auto rounded-xl border border-slate-100">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-left py-2 px-3">ID</th>
                <th className="text-left py-2 px-3">Code &amp; Name</th>
                <th className="text-left py-2 px-3">Department</th>
                <th className="text-left py-2 px-3">Lecturer</th>
                <th className="text-left py-2 px-3">Semester</th>
                <th className="text-left py-2 px-3">Schedule</th>
                <th className="text-right py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && courses.length === 0 ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-2 px-3">
                        <div className="h-3 w-8 rounded bg-slate-200" />
                      </td>
                      <td className="py-2 px-3">
                        <div className="h-3 w-32 rounded bg-slate-200" />
                      </td>
                      <td className="py-2 px-3">
                        <div className="h-3 w-24 rounded bg-slate-200" />
                      </td>
                      <td className="py-2 px-3">
                        <div className="h-3 w-28 rounded bg-slate-200" />
                      </td>
                      <td className="py-2 px-3">
                        <div className="h-3 w-20 rounded bg-slate-200" />
                      </td>
                      <td className="py-2 px-3">
                        <div className="h-3 w-32 rounded bg-slate-200" />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="ml-auto h-3 w-16 rounded bg-slate-200" />
                      </td>
                    </tr>
                  ))}
                </>
              ) : courses.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-4 px-3 text-center text-xs text-slate-400"
                  >
                    No courses found. Use{" "}
                    <span className="font-medium">New Course</span> to create
                    one.
                  </td>
                </tr>
              ) : (
                courses.map((c) => {
                  const scheduleLabel = formatScheduleShort(c.days_and_times);
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2 px-3 text-[11px] text-slate-500">
                        #{c.id}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold text-slate-900">
                            {c.course_code}
                          </span>
                          <span className="text-[11px] text-slate-600">
                            {c.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-xs text-slate-800">
                        {getDepName(c.department_id)}
                      </td>
                      <td className="py-2 px-3 text-xs text-slate-800">
                        {getLecName(c.lecturer_id)}
                      </td>
                      <td className="py-2 px-3 text-xs text-slate-800">
                        {getSemName(c.semester_id)}
                      </td>
                      <td className="py-2 px-3 text-xs">
                        {scheduleLabel ? (
                          <span className="inline-flex max-w-[12rem] items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
                            <Clock className="h-3 w-3" />
                            <span className="truncate">{scheduleLabel}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">No schedule</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[11px] px-2 py-0.5"
                          onClick={() => openEditModal(c)}
                        >
                          <Pencil className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[11px] px-2 py-0.5 text-red-600"
                          onClick={() => handleDelete(c)}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* CREATE / EDIT MODAL */}
      {formOpen && (
        <div className="fixed inset-0 z-40 flex items-start sm:items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-3xl">
            <Card className="space-y-5 border border-slate-100 bg-white shadow-2xl">
              {/* Modal header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-2.5 py-1">
                    <LayoutTemplate className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] font-medium text-slate-600">
                      {editing ? "Edit Course" : "Create Course"}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {editing
                      ? `Update course "${editing.name}" (${editing.course_code})`
                      : "Define a new course and its schedule"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Set course code, name, department, lecturer, semester, and
                    weekly class times.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeFormModal}
                  disabled={saving}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {error && (
                <p className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600">
                  {error}
                </p>
              )}

              {/* Form */}
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    label="Course Code"
                    value={form.course_code}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        course_code: e.target.value,
                      }))
                    }
                    placeholder="e.g. IT201"
                  />
                  <Input
                    label="Course Name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="e.g. Data Structures"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700">
                      Department
                    </label>
                    <select
                      className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                      value={form.department_id}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          department_id: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select...</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700">
                      Lecturer
                    </label>
                    <select
                      className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                      value={form.lecturer_id}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          lecturer_id: e.target.value,
                        }))
                      }
                    >
                      <option value="">Unassigned</option>
                      {lecturers.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700">
                      Semester
                    </label>
                    <select
                      className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                      value={form.semester_id}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          semester_id: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select...</option>
                      {semesters.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Schedule editor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700">
                        Schedule (Days &amp; Times)
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Saved as JSON in <span className="font-mono">days_and_times</span>
                    </span>
                  </div>

                  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <p className="text-[11px] text-slate-500">
                      Enable one or more days and choose <b>from</b> / <b>to</b>{" "}
                      times. Example stored value:{" "}
                      <span className="font-mono">
                        {"{"}"mon":"09:00-11:00","wed":"09:00-11:00"{"}"}
                      </span>
                    </p>

                    <div className="space-y-1">
                      {DAY_OPTIONS.map(({ key, label }) => {
                        const item = scheduleMap[key] || {
                          enabled: false,
                          from: "",
                          to: "",
                        };
                        return (
                          <div
                            key={key}
                            className="flex items-center gap-2 text-xs"
                          >
                            <input
                              type="checkbox"
                              className="rounded border-slate-300"
                              checked={item.enabled}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setScheduleMap((prev) => ({
                                  ...prev,
                                  [key]: {
                                    ...(prev[key] || {
                                      from: "",
                                      to: "",
                                    }),
                                    enabled: checked,
                                  },
                                }));
                              }}
                            />
                            <span className="w-20 text-slate-700">
                              {label}
                            </span>
                            <input
                              type="time"
                              className="px-2 py-1 border rounded-md text-xs"
                              disabled={!item.enabled}
                              value={item.from}
                              onChange={(e) => {
                                const value = e.target.value;
                                setScheduleMap((prev) => ({
                                  ...prev,
                                  [key]: {
                                    ...(prev[key] || {
                                      enabled: true,
                                      to: "",
                                    }),
                                    from: value,
                                    enabled: true,
                                  },
                                }));
                              }}
                            />
                            <span className="text-[11px] text-slate-500">
                              to
                            </span>
                            <input
                              type="time"
                              className="px-2 py-1 border rounded-md text-xs"
                              disabled={!item.enabled}
                              value={item.to}
                              onChange={(e) => {
                                const value = e.target.value;
                                setScheduleMap((prev) => ({
                                  ...prev,
                                  [key]: {
                                    ...(prev[key] || {
                                      enabled: true,
                                      from: "",
                                    }),
                                    to: value,
                                    enabled: true,
                                  },
                                }));
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <p className="text-[11px] text-slate-400">
                        Will be saved as:
                      </p>
                      <div className="mt-1 text-[11px] font-mono bg-white rounded-md border border-slate-200 px-2 py-1 break-all">
                        {form.days_and_times || "<empty>"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={closeFormModal}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving
                      ? "Saving..."
                      : editing
                      ? "Save Changes"
                      : "Create Course"}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCourses;
