// src/pages/Admin/AdminLecturers.jsx

import React, { useEffect, useState } from "react";
import {
  Users,
  PlusCircle,
  Pencil,
  Trash2,
  RefreshCcw,
  X,
  Mail,
  IdCard,
  Building2,
} from "lucide-react";
import adminApi from "../../api/adminApi";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";
import Input from "../../components/UI/Input";

const AdminLecturers = () => {
  const [lecturers, setLecturers] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [editing, setEditing] = useState(null); // lecturer object or null
  const [form, setForm] = useState({
    lecturer_id: "",
    name: "",
    email: "",
    department_id: "",
    password: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  // ---------- Load data ----------
  const load = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const [lecturersRes, departmentsRes] = await Promise.all([
        adminApi.getLecturers(),
        adminApi.getDepartments(),
      ]);

      setLecturers(Array.isArray(lecturersRes) ? lecturersRes : []);
      setDepartments(Array.isArray(departmentsRes) ? departmentsRes : []);
    } catch (err) {
      console.error("Failed to load lecturers/departments", err);
      setError("Failed to load lecturers or departments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ---------- Helpers ----------
  const resetForm = () => {
    setEditing(null);
    setForm({
      lecturer_id: "",
      name: "",
      email: "",
      department_id: departments[0]?.id || "",
      password: "",
    });
  };

  const openCreateModal = () => {
    setError("");
    setSuccess("");
    setEditing(null);
    setForm({
      lecturer_id: "",
      name: "",
      email: "",
      department_id: departments[0]?.id || "",
      password: "",
    });
    setFormOpen(true);
  };

  const openEditModal = (lec) => {
    setError("");
    setSuccess("");
    setEditing(lec);
    setForm({
      lecturer_id: lec.lecturer_id || "",
      name: lec.name || "",
      email: lec.email || "",
      department_id: lec.department_id || "",
      password: "",
    });
    setFormOpen(true);
  };

  const closeFormModal = () => {
    if (saving) return;
    setFormOpen(false);
    resetForm();
  };

  // ---------- Submit create / edit ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (
      !form.lecturer_id.trim() ||
      !form.name.trim() ||
      !form.email.trim() ||
      !form.department_id
    ) {
      setError("Lecturer code, name, email, and department are required.");
      return;
    }

    try {
      setSaving(true);

      if (editing) {
        // Update lecturer
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          department_id: Number(form.department_id),
        };
        if (form.password.trim()) {
          payload.password = form.password.trim();
        }
        await adminApi.updateLecturer(editing.id, payload);
        setSuccess("Lecturer updated successfully.");
      } else {
        // Create lecturer
        await adminApi.createLecturer({
          lecturer_id: form.lecturer_id.trim(),
          name: form.name.trim(),
          email: form.email.trim(),
          department_id: Number(form.department_id),
          password: form.password.trim() || "Lecturer123",
        });
        setSuccess("Lecturer created successfully.");
      }

      closeFormModal();
      await load();
    } catch (err) {
      console.error("Failed to save lecturer", err);
      setError("Failed to save lecturer. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ---------- Delete ----------
  const handleDelete = async (lec) => {
    setError("");
    setSuccess("");

    if (
      !window.confirm(
        `Delete lecturer "${lec.name}"? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await adminApi.deleteLecturer(lec.id);
      setSuccess("Lecturer deleted.");
      await load();
    } catch (err) {
      console.error("Failed to delete lecturer", err);
      setError("Failed to delete lecturer. Please try again.");
    }
  };

  // ---------- Render ----------
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 via-sky-50 to-primary/5 ring-1 ring-primary/20">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">
              Admin · People
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Lecturers
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Manage lecturer accounts, departments, and login credentials.
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
            New Lecturer
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

      {/* TABLE CARD */}
      <Card className="border border-slate-100 bg-white/95 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Lecturer Directory
            </h3>
            <p className="text-[11px] text-slate-500">
              View all lecturers, their departments, and contact details.
            </p>
          </div>
          <p className="text-[11px] text-slate-400">
            {lecturers.length} lecturers
          </p>
        </div>

        <div className="max-h-80 overflow-auto rounded-xl border border-slate-100">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-left py-2 px-3">ID</th>
                <th className="text-left py-2 px-3">Code</th>
                <th className="text-left py-2 px-3">Name</th>
                <th className="text-left py-2 px-3">Email</th>
                <th className="text-left py-2 px-3">Department</th>
                <th className="text-right py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && lecturers.length === 0 ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-2 px-3">
                        <div className="h-3 w-8 rounded bg-slate-200" />
                      </td>
                      <td className="py-2 px-3">
                        <div className="h-3 w-16 rounded bg-slate-200" />
                      </td>
                      <td className="py-2 px-3">
                        <div className="h-3 w-24 rounded bg-slate-200" />
                      </td>
                      <td className="py-2 px-3">
                        <div className="h-3 w-32 rounded bg-slate-200" />
                      </td>
                      <td className="py-2 px-3">
                        <div className="h-3 w-24 rounded bg-slate-200" />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="ml-auto h-3 w-16 rounded bg-slate-200" />
                      </td>
                    </tr>
                  ))}
                </>
              ) : lecturers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-4 px-3 text-center text-xs text-slate-400"
                  >
                    No lecturers found. Use{" "}
                    <span className="font-medium">New Lecturer</span> to add
                    one.
                  </td>
                </tr>
              ) : (
                lecturers.map((lec) => {
                  const dep = departments.find(
                    (d) => d.id === lec.department_id
                  );
                  return (
                    <tr
                      key={lec.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-2 px-3 text-[11px] text-slate-500">
                        #{lec.id}
                      </td>
                      <td className="py-2 px-3 text-sm font-mono text-slate-800">
                        {lec.lecturer_id}
                      </td>
                      <td className="py-2 px-3 text-sm text-slate-800">
                        {lec.name}
                      </td>
                      <td className="py-2 px-3 text-xs text-slate-700">
                        {lec.email}
                      </td>
                      <td className="py-2 px-3 text-xs text-slate-700">
                        {dep?.name || lec.department_id}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[11px] px-2 py-0.5"
                          onClick={() => openEditModal(lec)}
                        >
                          <Pencil className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[11px] px-2 py-0.5 text-red-600"
                          onClick={() => handleDelete(lec)}
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
          <div className="w-full max-w-2xl">
            <Card className="space-y-5 border border-slate-100 bg-white shadow-2xl">
              {/* Modal header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-2.5 py-1">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] font-medium text-slate-600">
                      {editing ? "Edit Lecturer" : "Create Lecturer"}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {editing
                      ? `Update lecturer "${editing.name}"`
                      : "Add a new lecturer to the system"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Fill in lecturer details, assign a department, and set a
                    password. You can change these later at any time.
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
                {/* Top row: code + name */}
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    label="Lecturer Code"
                    name="lecturer_id"
                    value={form.lecturer_id}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        lecturer_id: e.target.value,
                      }))
                    }
                    placeholder="e.g. LEC123"
                    disabled={!!editing}
                    prefixIcon={<IdCard className="h-4 w-4 text-slate-400" />}
                  />
                  <Input
                    label="Full Name"
                    name="name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="e.g. Dr. Jane Smith"
                  />
                </div>

                {/* Email + Department */}
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="lecturer@example.edu"
                    prefixIcon={<Mail className="h-4 w-4 text-slate-400" />}
                  />
                  <div>
                    <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-slate-500" />
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
                      <option value="">Select department...</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Choose which department this lecturer belongs to.
                    </p>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <Input
                    label={
                      editing
                        ? "New Password (optional)"
                        : "Password (optional)"
                    }
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, password: e.target.value }))
                    }
                    placeholder={
                      editing
                        ? "Leave blank to keep existing password"
                        : "Leave blank to use default: Lecturer123"
                    }
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    {editing
                      ? "If left empty, the lecturer's password will not change."
                      : "If left empty, the system will set the default password: Lecturer123."}
                  </p>
                </div>

                {/* Actions */}
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
                      : "Create Lecturer"}
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

export default AdminLecturers;
