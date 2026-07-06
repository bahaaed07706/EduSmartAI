// src/pages/Admin/AdminSemesters.jsx

import React, { useEffect, useState } from "react";
import {
  CalendarDays,
  PlusCircle,
  RefreshCcw,
  Pencil,
  Trash2,
  X,
  Clock,
} from "lucide-react";
import adminApi from "../../api/adminApi";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";
import Input from "../../components/UI/Input";

const AdminSemesters = () => {
  const [semesters, setSemesters] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editing, setEditing] = useState(null); // semester object or null
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    year: new Date().getFullYear(),
    start_date: "",
    end_date: "",
  });

  // -------- Load data --------
  const load = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const data = await adminApi.getSemesters();
      setSemesters(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load semesters", err);
      setError("Failed to load semesters. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // -------- Helpers --------
  const resetForm = () => {
    setEditing(null);
    setForm({
      name: "",
      year: new Date().getFullYear(),
      start_date: "",
      end_date: "",
    });
  };

  const openCreateModal = () => {
    setError("");
    setSuccess("");
    setEditing(null);
    setForm({
      name: "",
      year: new Date().getFullYear(),
      start_date: "",
      end_date: "",
    });
    setFormOpen(true);
  };

  const openEditModal = (sem) => {
    setError("");
    setSuccess("");
    setEditing(sem);
    setForm({
      name: sem.name || "",
      year: sem.year ?? new Date().getFullYear(),
      start_date: sem.start_date ? sem.start_date.slice(0, 10) : "",
      end_date: sem.end_date ? sem.end_date.slice(0, 10) : "",
    });
    setFormOpen(true);
  };

  const closeFormModal = () => {
    if (saving) return;
    setFormOpen(false);
    resetForm();
  };

  // -------- Submit create / edit --------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name || !form.year || !form.start_date || !form.end_date) {
      setError("Please fill all fields.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      year: Number(form.year),
      start_date: form.start_date,
      end_date: form.end_date,
    };

    try {
      setSaving(true);

      if (editing) {
        await adminApi.updateSemester(editing.id, payload);
        setSuccess("Semester updated successfully.");
      } else {
        await adminApi.createSemester(payload);
        setSuccess("Semester created successfully.");
      }

      closeFormModal();
      await load();
    } catch (err) {
      console.error("Failed to save semester", err);
      setError("Failed to save semester. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // -------- Delete --------
  const handleDelete = async (sem) => {
    setError("");
    setSuccess("");

    if (
      !window.confirm(
        `Delete semester "${sem.name}" (${sem.year})? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await adminApi.deleteSemester(sem.id);
      setSuccess("Semester deleted.");
      await load();
    } catch (err) {
      console.error("Failed to delete semester", err);
      setError("Failed to delete semester. Please try again.");
    }
  };

  // -------- Render --------
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 via-sky-50 to-primary/5 ring-1 ring-primary/20">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">
              Admin · Academic
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Semesters
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Configure academic semesters with names, years, and date ranges.
            </p>
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
            New Semester
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
              Semester Overview
            </h3>
            <p className="text-[11px] text-slate-500">
              See all defined semesters with their academic year and duration.
            </p>
          </div>
          <p className="text-[11px] text-slate-400">
            {semesters.length} semester{semesters.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="max-h-80 overflow-auto rounded-xl border border-slate-100">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-left py-2 px-3">ID</th>
                <th className="text-left py-2 px-3">Name</th>
                <th className="text-left py-2 px-3">Year</th>
                <th className="text-left py-2 px-3">Start</th>
                <th className="text-left py-2 px-3">End</th>
                <th className="text-right py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && semesters.length === 0 ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-2 px-3">
                        <div className="h-3 w-8 rounded bg-slate-200" />
                      </td>
                      <td className="py-2 px-3">
                        <div className="h-3 w-24 rounded bg-slate-200" />
                      </td>
                      <td className="py-2 px-3">
                        <div className="h-3 w-12 rounded bg-slate-200" />
                      </td>
                      <td className="py-2 px-3">
                        <div className="h-3 w-20 rounded bg-slate-200" />
                      </td>
                      <td className="py-2 px-3">
                        <div className="h-3 w-20 rounded bg-slate-200" />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="ml-auto h-3 w-16 rounded bg-slate-200" />
                      </td>
                    </tr>
                  ))}
                </>
              ) : semesters.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-4 px-3 text-center text-xs text-slate-400"
                  >
                    No semesters yet. Use{" "}
                    <span className="font-medium">New Semester</span> to create
                    one.
                  </td>
                </tr>
              ) : (
                semesters.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-2 px-3 text-[11px] text-slate-500">
                      #{s.id}
                    </td>
                    <td className="py-2 px-3 text-sm text-slate-800">
                      {s.name}
                    </td>
                    <td className="py-2 px-3 text-sm text-slate-800">
                      {s.year}
                    </td>
                    <td className="py-2 px-3 text-xs text-slate-700">
                      {s.start_date ? s.start_date.slice(0, 10) : "—"}
                    </td>
                    <td className="py-2 px-3 text-xs text-slate-700">
                      {s.end_date ? s.end_date.slice(0, 10) : "—"}
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[11px] px-2 py-0.5"
                        onClick={() => openEditModal(s)}
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[11px] px-2 py-0.5 text-red-600"
                        onClick={() => handleDelete(s)}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* CREATE / EDIT MODAL */}
      {formOpen && (
        <div className="fixed inset-0 z-40 flex items-start sm:items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl">
            <Card className="space-y-5 border border-slate-100 bg-white shadow-2xl">
              {/* Modal header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-2.5 py-1">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] font-medium text-slate-600">
                      {editing ? "Edit Semester" : "Create Semester"}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {editing
                      ? `Update semester "${editing.name}" (${editing.year})`
                      : "Define a new academic semester"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Choose a clear name (e.g. <span className="font-mono">2025
                    - Spring</span>), set the year, and specify the start / end
                    dates.
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
                    label="Semester Name"
                    name="name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="e.g. 2025 Spring"
                    prefixIcon={
                      <CalendarDays className="h-4 w-4 text-slate-400" />
                    }
                  />
                  <Input
                    label="Year"
                    name="year"
                    type="number"
                    value={form.year}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, year: e.target.value }))
                    }
                    prefixIcon={<Clock className="h-4 w-4 text-slate-400" />}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-slate-700">
                      Start Date
                    </label>
                    <input
                      type="date"
                      className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                      value={form.start_date}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          start_date: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700">
                      End Date
                    </label>
                    <input
                      type="date"
                      className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                      value={form.end_date}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          end_date: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  Make sure semester dates do not overlap with other existing
                  semesters in your academic calendar.
                </p>

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
                      : "Create Semester"}
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

export default AdminSemesters;
