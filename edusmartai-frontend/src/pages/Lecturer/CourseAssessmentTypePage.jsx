// src/pages/Lecturer/CourseAssessmentTypePage.jsx

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ClipboardList,
  FileText,
  Eye,
  Download,
  Users,
  PlusCircle,
  RefreshCcw,
  Pencil,
  Trash2,
} from "lucide-react";

import lecturerApi from "../../api/lecturerApi";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";
import Input from "../../components/UI/Input";
import FileUploadInput from "../../components/UI/FileUploadInput";
import ConfirmDialog from "../../components/UI/ConfirmDialog";
import GradeDialog from "../../components/UI/GradeDialog";
import { buildFileUrl } from "../../utils/fileUrl";

const CourseAssessmentTypePage = ({
  type,
  singularLabel,
  pluralLabel,
  pageDescription,
  defaultMaxMarks,
  defaultWeight,
  emptyStateText,
  createCardTitle,
  listCardTitle,
  filePlaceholder,
}) => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [assessments, setAssessments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    max_marks: defaultMaxMarks,
    weight_from_participation: defaultWeight,
    file_url: "",
  });

  // Edit modal state
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    max_marks: defaultMaxMarks,
    weight_from_participation: defaultWeight,
    file_url: "",
  });

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Submissions + grading
  const [selectedAssessmentSubmissions, setSelectedAssessmentSubmissions] =
    useState(null); // { assessment, submissions }
  const [gradeDialog, setGradeDialog] = useState({
    open: false,
    assessment: null,
    studentId: null,
    initialMarks: "",
    initialFeedback: "",
  });
  const [savingGrade, setSavingGrade] = useState(false);

  // -------- file URL helpers --------

  const normalizeFileUrl = (url) => {
    if (!url) return "";
    try {
      const u = new URL(url);
      return u.pathname.replace(/^\/api\/v1\/uploads\//, "/uploads/");
    } catch {
      return url.replace(/^\/api\/v1\/uploads\//, "/uploads/");
    }
  };

  const handlePreviewFile = (path) => {
    const url = buildFileUrl(path);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const getFileExtLabel = (urlOrPath) => {
    if (!urlOrPath) return "";
    try {
      const full = /^https?:\/\//i.test(urlOrPath)
        ? urlOrPath
        : buildFileUrl(urlOrPath);
      const u = new URL(full);
      const parts = u.pathname.split(".");
      if (parts.length > 1) return parts.pop().toUpperCase();
    } catch {
      const parts = urlOrPath.split(".");
      if (parts.length > 1) return parts.pop().toUpperCase();
    }
    return "";
  };

  // Open in new tab so browser handles preview/download
  const handleDownloadFile = (fileUrl) => {
    if (!fileUrl) return;
    const fullUrl = buildFileUrl(fileUrl);
    window.open(fullUrl, "_blank", "noopener,noreferrer");
  };

  // -------- Load data --------
  const loadAssessments = async () => {
    const data = await lecturerApi.getCourseAssessments(courseId);
    const list = Array.isArray(data) ? data : [];
    setAssessments(list.filter((a) => a.type === type));
  };

  const loadStudents = async () => {
    try {
      const data = await lecturerApi.getCourseStudents(courseId);
      setStudents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load students for assessment page", e);
      setStudents([]);
    }
  };

  const loadSubmissions = async (assessment) => {
    const subs = await lecturerApi.getAssessmentSubmissions(assessment.id);
    setSelectedAssessmentSubmissions({
      assessment,
      submissions: subs || [],
    });
  };

  const refreshAll = async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      setError("");
      await Promise.all([loadAssessments(), loadStudents()]);
    } catch (err) {
      console.error(
        `Failed to load data for ${pluralLabel.toLowerCase()}`,
        err
      );
      setError(`Failed to load ${pluralLabel.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, type]);

  // -------- Derived stats (chips in header) --------
  const stats = useMemo(() => {
    if (!assessments.length) {
      return {
        total: 0,
        avgMaxMarks: null,
        totalWeight: null,
        upcomingCount: 0,
      };
    }

    const now = new Date();
    let sumMax = 0;
    let sumWeight = 0;
    let weightHasValue = false;
    let upcoming = 0;

    assessments.forEach((a) => {
      const max = Number(a.max_marks);
      if (!Number.isNaN(max)) {
        sumMax += max;
      }
      const wt = Number(a.weight_from_participation);
      if (!Number.isNaN(wt)) {
        sumWeight += wt;
        weightHasValue = true;
      }
      if (a.end_date) {
        const end = new Date(a.end_date);
        if (!Number.isNaN(end.getTime()) && end >= now) {
          upcoming += 1;
        }
      }
    });

    return {
      total: assessments.length,
      avgMaxMarks:
        assessments.length > 0 ? (sumMax / assessments.length).toFixed(1) : null,
      totalWeight: weightHasValue ? sumWeight.toFixed(1) : null,
      upcomingCount: upcoming,
    };
  }, [assessments]);

  // -------- Form handlers --------
  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetCreateForm = () => {
    setCreateForm({
      title: "",
      description: "",
      start_date: "",
      end_date: "",
      max_marks: defaultMaxMarks,
      weight_from_participation: defaultWeight,
      file_url: "",
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");

    if (!createForm.title.trim()) {
      setError("Title is required.");
      return;
    }

    const payload = {
      type,
      title: createForm.title.trim(),
      description: createForm.description.trim() || null,
      start_date: createForm.start_date || null,
      end_date: createForm.end_date || null,
      max_marks: Number(createForm.max_marks),
      weight_from_participation: Number(createForm.weight_from_participation),
      file_url: createForm.file_url.trim() || null,
    };

    try {
      setSaving(true);
      await lecturerApi.createAssessment(courseId, payload);
      await loadAssessments();
      resetCreateForm();
      setCreateOpen(false);
    } catch (err) {
      console.error(`Failed to create ${singularLabel.toLowerCase()}`, err);
      setError(`Failed to create ${singularLabel.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (a) => {
    setError("");
    setEditingAssessment(a);
    setEditForm({
      title: a.title || "",
      description: a.description || "",
      start_date: a.start_date ? a.start_date.slice(0, 16) : "",
      end_date: a.end_date ? a.end_date.slice(0, 16) : "",
      max_marks: a.max_marks ?? defaultMaxMarks,
      weight_from_participation: a.weight_from_participation ?? defaultWeight,
      file_url: a.file_url || "",
    });
  };

  const closeEdit = () => {
    setEditingAssessment(null);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingAssessment) return;

    setError("");

    const payload = {
      type,
      title: editForm.title.trim(),
      description: editForm.description.trim() || null,
      start_date: editForm.start_date || null,
      end_date: editForm.end_date || null,
      max_marks: Number(editForm.max_marks),
      weight_from_participation: Number(editForm.weight_from_participation),
      file_url: editForm.file_url.trim() || null,
    };

    try {
      setSaving(true);
      await lecturerApi.updateAssessment(editingAssessment.id, payload);
      await loadAssessments();
      setEditingAssessment(null);
    } catch (err) {
      console.error(`Failed to update ${singularLabel.toLowerCase()}`, err);
      setError(`Failed to update ${singularLabel.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (assessment) => {
    setDeleteTarget(assessment);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await lecturerApi.deleteAssessment(deleteTarget.id);
      setDeleteTarget(null);
      setSelectedAssessmentSubmissions((prev) =>
        prev && prev.assessment.id === deleteTarget.id ? null : prev
      );
      await loadAssessments();
    } catch (err) {
      console.error(`Failed to delete ${singularLabel.toLowerCase()}`, err);
      alert(`Failed to delete ${singularLabel.toLowerCase()}.`);
    } finally {
      setDeleting(false);
    }
  };

  // -------- Submissions & grading --------
  const handleViewSubmissions = async (assessment) => {
    try {
      await loadSubmissions(assessment);
    } catch (e) {
      console.error("Failed to load submissions", e);
      alert("Failed to load submissions.");
    }
  };

  const closeSubmissionsPanel = () => {
    setSelectedAssessmentSubmissions(null);
  };

  const openGradeDialog = (
    assessment,
    studentId,
    currentMarks = "",
    currentFeedback = ""
  ) => {
    setGradeDialog({
      open: true,
      assessment,
      studentId,
      initialMarks: currentMarks ?? "",
      initialFeedback: currentFeedback ?? "",
    });
  };

  const handleSaveGrade = async ({ marks, feedback }) => {
    if (!gradeDialog.assessment || !gradeDialog.studentId) return;

    try {
      setSavingGrade(true);
      await lecturerApi.gradeAssessment(
        gradeDialog.assessment.id,
        gradeDialog.studentId,
        {
          student_id: gradeDialog.studentId,
          marks_obtained: marks,
          feedback,
        }
      );

      if (
        selectedAssessmentSubmissions &&
        selectedAssessmentSubmissions.assessment.id ===
          gradeDialog.assessment.id
      ) {
        await loadSubmissions(selectedAssessmentSubmissions.assessment);
      }

      setGradeDialog((prev) => ({ ...prev, open: false }));
      alert("Grade saved");
    } catch (e) {
      console.error("Failed to save grade", e);
      alert("Failed to save grade.");
    } finally {
      setSavingGrade(false);
    }
  };

  const isLoadingEmpty = loading && assessments.length === 0;

  // -------- Render --------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 via-sky-50 to-primary/5 ring-1 ring-primary/20">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">
              Course #{courseId}
            </p>
            <h2 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
              {pluralLabel}
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>{stats.total} total</span>
              </span>
            </h2>
            <p className="mt-1 text-xs text-slate-500">{pageDescription}</p>

            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
              {stats.avgMaxMarks && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                  <span>🎯</span>
                  <span>Avg max marks: {stats.avgMaxMarks}</span>
                </span>
              )}
              {stats.totalWeight && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                  <span>⚖️</span>
                  <span>Total weight: {stats.totalWeight}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                <Users className="h-3 w-3" />
                <span>{students.length} students</span>
              </span>
              {stats.upcomingCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                  <span>⏰</span>
                  <span>{stats.upcomingCount} upcoming</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={refreshAll}
            className="text-xs"
          >
            <RefreshCcw className="mr-1 h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => navigate(`/lecturer/courses/${courseId}`)}
          >
            ↩ Back to overview
          </Button>
          <Button
            size="sm"
            className="text-xs"
            onClick={() => setCreateOpen(true)}
          >
            <PlusCircle className="mr-1 h-4 w-4" />
            New {singularLabel}
          </Button>
        </div>
      </div>

      {/* Global error */}
      {error && !createOpen && !editingAssessment && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {error}
        </div>
      )}

      {/* List / main card */}
      <Card className="space-y-3 border border-slate-100 bg-white/95 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100">
              <FileText className="h-4 w-4 text-slate-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {listCardTitle}
              </h3>
              <p className="text-[11px] text-slate-500">
                Manage {pluralLabel.toLowerCase()}: edit details, attach
                resources, and review submissions.
              </p>
            </div>
          </div>
        </div>

        {isLoadingEmpty ? (
          <div className="space-y-2 text-xs text-slate-500">
            <p>Loading {pluralLabel.toLowerCase()}...</p>
            <div className="space-y-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 animate-pulse"
                >
                  <div className="h-3 w-40 rounded bg-slate-200" />
                  <div className="h-3 w-16 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          </div>
        ) : assessments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <ClipboardList className="h-6 w-6 text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">
                No {pluralLabel.toLowerCase()} yet
              </p>
              <p className="mt-1 text-xs text-slate-500">{emptyStateText}</p>
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <PlusCircle className="mr-1 h-4 w-4" />
              Create first {singularLabel.toLowerCase()}
            </Button>
          </div>
        ) : (
          <div className="max-h-80 overflow-auto rounded-xl border border-slate-100">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="text-left py-2 px-3">Title</th>
                  <th className="text-left py-2 px-3">Max</th>
                  <th className="text-left py-2 px-3">Start</th>
                  <th className="text-left py-2 px-3">End</th>
                  <th className="text-left py-2 px-3">File</th>
                  <th className="text-right py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {assessments.map((a) => {
                  const ext = getFileExtLabel(a.file_url) || "FILE";

                  return (
                    <tr
                      key={a.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2 px-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-slate-900">
                            {a.title}
                          </span>
                          {a.description && (
                            <span className="text-[11px] text-slate-500 line-clamp-1">
                              {a.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">{a.max_marks}</td>
                      <td className="py-2 px-3 text-[11px]">
                        {a.start_date || "-"}
                      </td>
                      <td className="py-2 px-3 text-[11px]">
                        {a.end_date || "-"}
                      </td>
                      <td className="py-2 px-3">
                        {a.file_url ? (
                          <div className="flex items-center gap-2">
                            <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                              <span className="text-[10px]">📄</span>
                              <span className="font-semibold">{ext}</span>
                              <span>resource</span>
                            </div>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handlePreviewFile(a.file_url)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50"
                              >
                                <span className="sr-only">Preview file</span>
                                <Eye className="h-3.5 w-3.5 text-slate-600" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadFile(a.file_url)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50"
                              >
                                <span className="sr-only">Download file</span>
                                <Download className="h-3.5 w-3.5 text-slate-600" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[11px] px-2 py-0.5"
                          onClick={() => handleViewSubmissions(a)}
                        >
                          📥 Submissions
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[11px] px-2 py-0.5"
                          onClick={() => openEdit(a)}
                        >
                          <Pencil className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[11px] px-2 py-0.5 text-red-600"
                          onClick={() => requestDelete(a)}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
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

      {/* Submissions panel */}
      {selectedAssessmentSubmissions && (
        <Card className="space-y-3 border border-emerald-200 bg-emerald-50/50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ClipboardList className="h-4 w-4 text-emerald-600" />
                Submissions – {selectedAssessmentSubmissions.assessment.title}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Click <span className="font-medium">Grade / update</span> to
                enter or modify marks and feedback.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={closeSubmissionsPanel}>
              Close
            </Button>
          </div>

          <div className="max-h-72 overflow-auto rounded-xl border border-slate-100 bg-white">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="text-left py-2 px-3">Student ID</th>
                  <th className="text-left py-2 px-3">File</th>
                  <th className="text-left py-2 px-3">Submitted at</th>
                  <th className="text-left py-2 px-3">Marks</th>
                  <th className="text-left py-2 px-3">Feedback</th>
                  <th className="text-left py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {selectedAssessmentSubmissions.submissions.map((sub) => {
                  const ext = getFileExtLabel(sub.file_url) || "FILE";

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-2 px-3">{sub.student_id}</td>
                      <td className="py-2 px-3">
                        {sub.file_url ? (
                          <div className="flex items-center gap-2">
                            <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                              <span className="text-[10px]">📎</span>
                              <span className="font-semibold">{ext}</span>
                              <span>submission</span>
                            </div>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handlePreviewFile(sub.file_url)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50"
                              >
                                <span className="sr-only">
                                  Preview submission
                                </span>
                                <Eye className="h-3.5 w-3.5 text-slate-600" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadFile(sub.file_url)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50"
                              >
                                <span className="sr-only">
                                  Download submission
                                </span>
                                <Download className="h-3.5 w-3.5 text-slate-600" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">No file</span>
                        )}
                      </td>
                      <td className="py-2 px-3">{sub.submitted_at || "-"}</td>
                      <td className="py-2 px-3">
                        {sub.marks_obtained ?? "-"}
                      </td>
                      <td className="py-2 px-3">{sub.feedback || "-"}</td>
                      <td className="py-2 px-3">
                        <Button
                          size="sm"
                          className="text-xs px-2 py-1"
                          onClick={() =>
                            openGradeDialog(
                              selectedAssessmentSubmissions.assessment,
                              sub.student_id,
                              sub.marks_obtained,
                              sub.feedback
                            )
                          }
                        >
                          Grade / update
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {selectedAssessmentSubmissions.submissions.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-4 px-3 text-center text-sm text-slate-400"
                    >
                      No submissions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* CREATE MODAL */}
      {createOpen && (
        <div className="fixed inset-0 z-40 flex items-start sm:items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl">
            <Card className="space-y-4 border border-slate-100 bg-white shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {createCardTitle}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Configure basic details, schedule, and optional resource
                    file.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!saving) {
                      setCreateOpen(false);
                      resetCreateForm();
                    }
                  }}
                >
                  Close
                </Button>
              </div>

              {error && (
                <p className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600">
                  {error}
                </p>
              )}

              <form className="space-y-3" onSubmit={handleCreate}>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    label="Title"
                    name="title"
                    value={createForm.title}
                    onChange={handleCreateChange}
                    required
                  />
                  <FileUploadInput
                    label="Resource file (optional)"
                    value={createForm.file_url}
                    onChange={(url) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        file_url: normalizeFileUrl(url),
                      }))
                    }
                    placeholder={filePlaceholder}
                  />
                </div>

                <Input
                  label="Description"
                  name="description"
                  value={createForm.description}
                  onChange={handleCreateChange}
                />

                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <label className="text-xs text-slate-600">
                      Start (date &amp; time)
                    </label>
                    <input
                      type="datetime-local"
                      name="start_date"
                      className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary/30"
                      value={createForm.start_date}
                      onChange={handleCreateChange}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">
                      End (date &amp; time)
                    </label>
                    <input
                      type="datetime-local"
                      name="end_date"
                      className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary/30"
                      value={createForm.end_date}
                      onChange={handleCreateChange}
                    />
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    label="Max Marks"
                    name="max_marks"
                    type="number"
                    value={createForm.max_marks}
                    onChange={handleCreateChange}
                  />
                  <Input
                    label="Weight (of participation)"
                    name="weight_from_participation"
                    type="number"
                    value={createForm.weight_from_participation}
                    onChange={handleCreateChange}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!saving) {
                        setCreateOpen(false);
                        resetCreateForm();
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? "Saving..." : createCardTitle}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingAssessment && (
        <div className="fixed inset-0 z-40 flex items-start sm:items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl">
            <Card className="space-y-4 border border-slate-100 bg-white shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Edit {singularLabel} – {editingAssessment.title}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Update details, schedule, and resource file.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!saving) closeEdit();
                  }}
                >
                  Close
                </Button>
              </div>

              {error && (
                <p className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600">
                  {error}
                </p>
              )}

              <form className="space-y-3" onSubmit={handleUpdate}>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    label="Title"
                    name="title"
                    value={editForm.title}
                    onChange={handleEditChange}
                    required
                  />
                  <FileUploadInput
                    label="Resource file (optional)"
                    value={editForm.file_url}
                    onChange={(url) =>
                      setEditForm((prev) => ({
                        ...prev,
                        file_url: normalizeFileUrl(url),
                      }))
                    }
                    placeholder={filePlaceholder}
                  />
                </div>

                <Input
                  label="Description"
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                />

                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <label className="text-xs text-slate-600">
                      Start (date &amp; time)
                    </label>
                    <input
                      type="datetime-local"
                      name="start_date"
                      className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary/30"
                      value={editForm.start_date}
                      onChange={handleEditChange}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600">
                      End (date &amp; time)
                    </label>
                    <input
                      type="datetime-local"
                      name="end_date"
                      className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-primary focus:ring-1 focus:ring-primary/30"
                      value={editForm.end_date}
                      onChange={handleEditChange}
                    />
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    label="Max Marks"
                    name="max_marks"
                    type="number"
                    value={editForm.max_marks}
                    onChange={handleEditChange}
                  />
                  <Input
                    label="Weight (of participation)"
                    name="weight_from_participation"
                    type="number"
                    value={editForm.weight_from_participation}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!saving) closeEdit();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={saving}>
                    {saving ? "Saving..." : `Update ${singularLabel}`}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* Grade modal */}
      <GradeDialog
        open={gradeDialog.open}
        title={
          gradeDialog.assessment
            ? `Grade: ${gradeDialog.assessment.title} – Student #${gradeDialog.studentId}`
            : "Grade"
        }
        initialMarks={gradeDialog.initialMarks}
        initialFeedback={gradeDialog.initialFeedback}
        saving={savingGrade}
        onCancel={() => setGradeDialog((prev) => ({ ...prev, open: false }))}
        onSave={handleSaveGrade}
      />

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${singularLabel}`}
        message={
          deleteTarget
            ? `Delete ${singularLabel.toLowerCase()} "${
                deleteTarget.title
              }"? This cannot be undone.`
            : ""
        }
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default CourseAssessmentTypePage;
