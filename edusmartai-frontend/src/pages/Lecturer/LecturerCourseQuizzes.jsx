// src/pages/Lecturer/LecturerCourseQuizzes.jsx

import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ListChecks,
  CalendarDays,
  Timer,
  Clock4,
  Info,
  Trash2,
  FileText,
} from "lucide-react";
import lecturerApi from "../../api/lecturerApi";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";
import Input from "../../components/UI/Input";
import FileUploadInput from "../../components/UI/FileUploadInput";

const LecturerCourseQuizzes = () => {
  const { courseId } = useParams();

  const [quizzes, setQuizzes] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    max_marks: 100,
    duration_minutes: "",
    weight_from_participation: 0,
    file_url: "",
  });

  // -------- helpers --------

  const toLocalDateTimeInput = (date) => {
    if (!(date instanceof Date)) return "";
    const pad = (n) => String(n).padStart(2, "0");
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const h = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${y}-${m}-${d}T${h}:${min}`;
  };

  const formatDateTime = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const parseDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  };

  const getQuizStatus = (quiz) => {
    const now = new Date();
    const start = parseDate(quiz.start_date);
    const end = parseDate(quiz.end_date);

    if (start && now < start) return { label: "Scheduled", tone: "info" };
    if (end && now > end) return { label: "Closed", tone: "danger" };
    return { label: "Open", tone: "success" };
  };

  const statusPillClass = (tone) => {
    switch (tone) {
      case "success":
        return "bg-emerald-50 text-emerald-700 border border-emerald-100";
      case "danger":
        return "bg-rose-50 text-rose-700 border border-rose-100";
      case "info":
        return "bg-sky-50 text-sky-700 border border-sky-100";
      default:
        return "bg-slate-50 text-slate-600 border border-slate-100";
    }
  };

  // -------- data loading --------

  useEffect(() => {
    const loadQuizzes = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await lecturerApi.getQuizzes(courseId);
        setQuizzes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch quizzes:", err);
        setError("Failed to load quizzes for this course.");
        setQuizzes([]);
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      loadQuizzes();
    }
  }, [courseId]);

  // -------- form handlers --------

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      start_date: "",
      end_date: "",
      max_marks: 100,
      duration_minutes: "",
      weight_from_participation: 0,
      file_url: "",
    });
  };

  const handleOpenCreateForm = () => {
    setShowCreateForm((prev) => {
      const opening = !prev;
      if (opening) {
        // If first open / empty dates, set defaults to "now" and "now + 1 hour"
        if (!formData.start_date && !formData.end_date) {
          const now = new Date();
          const afterHour = new Date(now.getTime() + 60 * 60 * 1000);
          setFormData((prevFd) => ({
            ...prevFd,
            start_date: toLocalDateTimeInput(now),
            end_date: toLocalDateTimeInput(afterHour),
          }));
        }
        setError("");
      }
      return opening;
    });
  };

  const handleCreateQuiz = async (e) => {
    e.preventDefault();

    const payload = {
      title: formData.title.trim(),
      description: formData.description?.trim() || null,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      max_marks: Number(formData.max_marks),
      weight_from_participation: Number(
        formData.weight_from_participation || 0
      ),
      file_url: formData.file_url || null,
      duration_minutes: formData.duration_minutes
        ? Number(formData.duration_minutes)
        : null,
    };

    if (!payload.title) {
      setError("Quiz title is required.");
      return;
    }
    if (!payload.start_date || !payload.end_date) {
      setError("Start and end date/time are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      const newQuiz = await lecturerApi.createQuiz(courseId, payload);
      setQuizzes((prev) => (newQuiz ? [...prev, newQuiz] : [...prev]));
      setShowCreateForm(false);
      resetForm();
    } catch (err) {
      console.error("Failed to create quiz:", err);
      setError("Error creating quiz. Please check the form data.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this quiz? This will remove all questions and student attempts."
    );
    if (!confirmed) return;

    try {
      await lecturerApi.deleteQuiz(quizId);
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch (err) {
      console.error("Delete quiz failed:", err);
      alert("Could not delete quiz.");
    }
  };

  // -------- date/time quick actions --------

  const setStartNow = () => {
    const now = new Date();
    setFormData((prev) => ({
      ...prev,
      start_date: toLocalDateTimeInput(now),
    }));
  };

  const clearStart = () => {
    setFormData((prev) => ({
      ...prev,
      start_date: "",
    }));
  };

  const setEndPlusMinutes = (minutes) => {
    const base = formData.start_date ? parseDate(formData.start_date) : new Date();
    if (!base) return;
    const end = new Date(base.getTime() + minutes * 60 * 1000);
    setFormData((prev) => ({
      ...prev,
      end_date: toLocalDateTimeInput(end),
    }));
  };

  const setEndEndOfDay = () => {
    const base = formData.end_date
      ? parseDate(formData.end_date)
      : formData.start_date
      ? parseDate(formData.start_date)
      : new Date();
    if (!base) return;
    const end = new Date(base);
    end.setHours(23, 59, 0, 0);
    setFormData((prev) => ({
      ...prev,
      end_date: toLocalDateTimeInput(end),
    }));
  };

  const clearEnd = () => {
    setFormData((prev) => ({
      ...prev,
      end_date: "",
    }));
  };

  // -------- derived counts --------

  const totalQuizzes = quizzes.length;
  const openQuizzes = quizzes.filter(
    (q) => getQuizStatus(q).label === "Open"
  ).length;

  // -------- loading skeleton --------

  if (loading && !quizzes.length) {
    return (
      <div className="p-4 flex justify-center">
        <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm border border-slate-100">
          <span className="h-3 w-3 animate-ping rounded-full bg-primary/70" />
          <p className="text-sm text-slate-500">Loading quizzes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 via-sky-50 to-primary/5 ring-1 ring-primary/20">
            <ListChecks className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">
              Course #{courseId}
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Quizzes Management
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {totalQuizzes} quiz{totalQuizzes !== 1 ? "zes" : ""}
              </span>
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Create and manage online quizzes, control availability windows,
              and navigate to questions &amp; results.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            <span>
              Open quizzes:{" "}
              <span className="font-semibold text-slate-800">
                {openQuizzes}
              </span>
            </span>
          </div>
          <Button size="sm" onClick={handleOpenCreateForm} className="text-xs">
            {showCreateForm ? "Close create form" : "New Quiz"}
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
          <Info className="h-3.5 w-3.5 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Create form */}
      {showCreateForm && (
        <Card className="space-y-4 border border-slate-100 bg-white/95 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                New Quiz
              </h3>
              <p className="text-[11px] text-slate-500">
                Define quiz details, availability window, and optional duration.
                Default dates are pre-filled to today.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <Timer className="h-3.5 w-3.5 text-slate-400" />
              <span>
                Leave duration empty for{" "}
                <span className="font-semibold">no time limit</span>.
              </span>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleCreateQuiz}>
            {/* Title + file row */}
            <div className="grid md:grid-cols-2 gap-3">
              <Input
                label="Quiz title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
              <FileUploadInput
                label="Instructions / resource file (optional)"
                value={formData.file_url}
                onChange={(url) =>
                  setFormData((prev) => ({ ...prev, file_url: url }))
                }
                placeholder="Upload PDF, DOCX, etc."
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-slate-600">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-xs focus:border-primary focus:ring-1 focus:ring-primary/30"
                rows={3}
                placeholder="Short description for students (optional)"
              />
            </div>

            {/* Date / time enhanced design */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Start */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock4 className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-slate-800">
                      Start date &amp; time
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={setStartNow}
                      className="rounded-full border border-primary/20 bg-white px-2 py-0.5 text-[11px] text-primary hover:bg-primary/5"
                    >
                      Set now
                    </button>
                    <button
                      type="button"
                      onClick={clearStart}
                      className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <input
                  type="datetime-local"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  required
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary/30"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Students can start the quiz only after this time.
                </p>
              </div>

              {/* End */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock4 className="h-3.5 w-3.5 text-rose-500" />
                    <span className="text-xs font-semibold text-slate-800">
                      End date &amp; time
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => setEndPlusMinutes(30)}
                      className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-50"
                    >
                      +30m
                    </button>
                    <button
                      type="button"
                      onClick={() => setEndPlusMinutes(60)}
                      className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-50"
                    >
                      +1h
                    </button>
                    <button
                      type="button"
                      onClick={setEndEndOfDay}
                      className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-50"
                    >
                      End of day
                    </button>
                    <button
                      type="button"
                      onClick={clearEnd}
                      className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <input
                  type="datetime-local"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  required
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary/30"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  After this time, students can no longer start or continue the
                  quiz.
                </p>
              </div>
            </div>

            {/* Marks / weight / duration row with nicer UI */}
            <div className="grid md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Total Marks
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    label=""
                    type="number"
                    name="max_marks"
                    value={formData.max_marks}
                    onChange={handleInputChange}
                    className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/30"
                  />
                  <span className="text-[11px] text-slate-500">
                    Recommended: 100
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Weight from Participation (%)
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    name="weight_from_participation"
                    value={formData.weight_from_participation}
                    onChange={handleInputChange}
                    className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/30"
                  />
                  <span className="text-[11px] text-slate-500">
                    0–100% of participation grade
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Duration (minutes, optional)
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    name="duration_minutes"
                    value={formData.duration_minutes}
                    onChange={handleInputChange}
                    className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary/30"
                    placeholder="60"
                  />
                  <span className="text-[11px] text-slate-500">
                    Empty = no time limit
                  </span>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!saving) {
                    setShowCreateForm(false);
                    resetForm();
                  }
                }}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Creating..." : "Create Quiz"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Quizzes list */}
      <Card className="border border-slate-100 bg-white/95 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Existing Quizzes
            </h3>
            <p className="text-[11px] text-slate-500">
              Manage quiz availability, navigate to question editor, and view
              results.
            </p>
          </div>
        </div>

        {loading && !quizzes.length ? (
          <p className="text-xs text-slate-500">Loading quizzes...</p>
        ) : quizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <ListChecks className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">
                No quizzes created yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Start by creating a quiz using the button above. Students will
                see it in their course once it is within the open window.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-h-[480px] overflow-auto rounded-lg border border-slate-100">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left py-2 px-3">Title</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Availability</th>
                  <th className="text-left py-2 px-3">Duration</th>
                  <th className="text-left py-2 px-3">Max Marks</th>
                  <th className="text-right py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quizzes.map((quiz) => {
                  const status = getQuizStatus(quiz);
                  const durationLabel = quiz.duration_minutes
                    ? `${quiz.duration_minutes} min`
                    : "No time limit";

                  return (
                    <tr
                      key={quiz.id}
                      className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-2 px-3 align-top">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-slate-800">
                            {quiz.title}
                          </span>
                          {quiz.description && (
                            <span className="text-[11px] text-slate-500 line-clamp-2">
                              {quiz.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 align-top">
                        <span
                          className={
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium " +
                            statusPillClass(status.tone)
                          }
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                          {status.label}
                        </span>
                      </td>
                      <td className="py-2 px-3 align-top text-[11px] text-slate-600">
                        <div>{formatDateTime(quiz.start_date)}</div>
                        <div className="text-slate-400">to</div>
                        <div>{formatDateTime(quiz.end_date)}</div>
                      </td>
                      <td className="py-2 px-3 align-top text-xs text-slate-700">
                        {durationLabel}
                      </td>
                      <td className="py-2 px-3 align-top text-xs text-slate-900">
                        {quiz.max_marks}
                      </td>
                      <td className="py-2 px-3 align-top text-right text-xs">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Link
                            to={`/lecturer/courses/${courseId}/quizzes/${quiz.id}`}
                            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Edit Questions
                          </Link>
                          <Link
                            to={`/lecturer/courses/${courseId}/quizzes/${quiz.id}/results`}
                            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                          >
                            View Results
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuiz(quiz.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 hover:bg-rose-100"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                        </div>
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

export default LecturerCourseQuizzes;
