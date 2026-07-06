// src/pages/Lecturer/LecturerCourseMaterials.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FolderOpen,
  UploadCloud,
  FileText,
  Edit3,
  Trash2,
  Clock,
} from "lucide-react";
import lecturerApi from "../../api/lecturerApi";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";
import FileUploadInput from "../../components/UI/FileUploadInput";
import { buildFileUrl } from "../../utils/fileUrl";

const emptyForm = {
  title: "",
  description: "",
  files: [],
};

const LecturerCourseMaterials = () => {
  const { courseId } = useParams();

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // ---------------- helpers ----------------

  const extractFileNameFromUrl = (url) => {
    if (!url) return "";
    try {
      const withoutQuery = url.split("?")[0];
      const parts = withoutQuery.split("/");
      const last = parts[parts.length - 1] || "file";
      return decodeURIComponent(last);
    } catch {
      return "file";
    }
  };

  const addFileFromUrl = (url) => {
    if (!url) return;

    const fileName = extractFileNameFromUrl(url);

    setForm((prev) => ({
      ...prev,
      files: [
        ...prev.files,
        {
          file_name: fileName,
          file_url: url, // stored as relative (/uploads/...)
          file_size_bytes: null,
          content_type: null,
        },
      ],
    }));
  };

  const handleRemoveFile = (index) => {
    setForm((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  // ---------------- data loading ----------------

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const data = await lecturerApi.getCourseMaterials(courseId);
      setMaterials(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load materials", err);
      setError("Failed to load materials.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // ---------------- form handlers ----------------

  const openCreateForm = () => {
    setEditingMaterial(null);
    setForm(emptyForm);
    setIsFormOpen(true);
    setError("");
  };

  const openEditForm = (material) => {
    setEditingMaterial(material);
    setForm({
      title: material.title,
      description: material.description || "",
      files:
        material.files?.map((f) => ({
          file_name: f.file_name,
          file_url: f.file_url,
          file_size_bytes: f.file_size_bytes ?? null,
          content_type: f.content_type ?? null,
        })) || [],
    });
    setIsFormOpen(true);
    setError("");
  };

  const closeForm = () => {
    if (saving) return;
    setIsFormOpen(false);
    setEditingMaterial(null);
    setForm(emptyForm);
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      title: form.title,
      description: form.description,
      files: form.files,
    };

    try {
      if (editingMaterial) {
        await lecturerApi.updateCourseMaterial(
          courseId,
          editingMaterial.id,
          payload
        );
      } else {
        await lecturerApi.createCourseMaterial(courseId, payload);
      }
      await loadMaterials();
      closeForm();
    } catch (err) {
      console.error("Failed to save material", err);
      setError("Failed to save material. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (materialId) => {
    if (!window.confirm("Delete this material and all its files?")) return;
    try {
      await lecturerApi.deleteCourseMaterial(courseId, materialId);
      setMaterials((prev) => prev.filter((m) => m.id !== materialId));
    } catch (err) {
      console.error("Failed to delete material", err);
      alert("Failed to delete material.");
    }
  };

  // ---------------- render ----------------

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100">
      <div className="w-full max-w-5xl mx-auto px-3 md:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Course Materials
              </h1>
              <p className="text-sm text-slate-500">
                Upload, organize and share resources with your students.
              </p>
            </div>
          </div>

          <Button onClick={openCreateForm} className="shadow-sm flex items-center gap-2">
            <UploadCloud className="h-4 w-4" />
            <span>Add material</span>
          </Button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Content card */}
        <Card className="border-none bg-white/80 backdrop-blur-sm shadow-sm">
          {loading ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-500">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
              <p className="text-sm">Loading materials...</p>
            </div>
          ) : materials.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-slate-500">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <FolderOpen className="h-6 w-6" />
              </div>
              <span className="text-base font-medium">
                No materials yet.
              </span>
              <span className="text-sm max-w-sm">
                Click <span className="font-semibold">&ldquo;Add material&rdquo;</span> to
                upload slides, notes, or any other resources for your students.
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Small summary row */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  You have{" "}
                  <span className="font-semibold text-slate-800">
                    {materials.length}
                  </span>{" "}
                  material{materials.length > 1 ? "s" : ""} for this course.
                </span>
              </div>

              {/* Materials grid */}
              <div className="grid gap-4 md:grid-cols-2">
                {materials.map((material) => (
                  <article
                    key={material.id}
                    className="group flex h-full flex-col rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                  >
                    {/* Header row */}
                    <header className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <h2 className="text-sm font-semibold text-slate-900">
                            {material.title}
                          </h2>
                          {material.description && (
                            <p className="mt-1 line-clamp-3 text-xs text-slate-600">
                              {material.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex items-center gap-1 text-xs text-slate-600 hover:text-primary"
                          onClick={() => openEditForm(material)}
                        >
                          <Edit3 className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex items-center gap-1 text-xs text-rose-600 hover:bg-rose-50"
                          onClick={() => handleDelete(material.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </header>

                    {/* Files list */}
                    <div className="mt-3 space-y-2 text-xs">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Files
                      </p>
                      {material.files && material.files.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {material.files.map((file) => (
                            <a
                              key={file.id ?? `${file.file_url}-${file.file_name}`}
                              href={buildFileUrl(file.file_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={file.file_name || undefined}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm transition group-hover:border-primary/40 group-hover:text-primary"
                            >
                              <FileText className="h-3 w-3" />
                              <span className="truncate max-w-[9rem]">
                                {file.file_name}
                              </span>
                              <span className="text-[9px] text-slate-400">
                                Download
                              </span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">
                          No files attached yet.
                        </p>
                      )}
                    </div>

                    {/* Footer */}
                    <footer className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <span>
                          {material.uploaded_at
                            ? new Date(
                                material.uploaded_at
                              ).toLocaleString()
                            : "Upload time not available"}
                        </span>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                        {material.files?.length || 0} file
                        {material.files && material.files.length !== 1
                          ? "s"
                          : ""}
                      </span>
                    </footer>
                  </article>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Modal for create/edit */}
        {isFormOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40">
            <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <UploadCloud className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {editingMaterial ? "Edit material" : "Add new material"}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Upload one or more files. Students will see them in their
                      course materials page.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleFieldChange}
                    required
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/60"
                    placeholder="e.g. Week 1: Introduction & Course Outline"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleFieldChange}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/60"
                    placeholder="Optional short description for students..."
                  />
                </div>

                <div className="space-y-3 rounded-2xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 border border-slate-200">
                        <FileText className="h-3 w-3" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">
                          Files
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Use the upload box to add files. Each upload will
                          appear in the list below.
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">
                      {form.files.length} file
                      {form.files.length !== 1 ? "s" : ""} attached
                    </span>
                  </div>

                  {/* File upload using shared component */}
                  <FileUploadInput
                    label="Upload files"
                    helperText="Drag & drop files here, or click to browse."
                    value={undefined}
                    disabled={saving}
                    onChange={(url) => {
                      addFileFromUrl(url);
                    }}
                  />

                  {form.files.length > 0 && (
                    <ul className="space-y-1 text-xs mt-2">
                      {form.files.map((file, index) => (
                        <li
                          key={`${file.file_name}-${index}`}
                          className="flex items-center justify-between rounded-lg bg-white px-2 py-1.5 border border-slate-200"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-3 w-3 text-slate-500" />
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-800">
                                {file.file_name}
                              </span>
                              <span className="text-[10px] text-slate-500 truncate max-w-xs">
                                {file.file_url}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-600"
                          >
                            <Trash2 className="h-3 w-3" />
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeForm}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving || !form.title}>
                    {saving
                      ? "Saving..."
                      : editingMaterial
                      ? "Save changes"
                      : "Create material"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LecturerCourseMaterials;
