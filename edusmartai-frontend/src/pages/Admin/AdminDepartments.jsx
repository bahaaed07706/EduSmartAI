// src/pages/Admin/AdminDepartments.jsx

import React, { useEffect, useState } from "react";
import {
  Building2,
  PlusCircle,
  Pencil,
  Trash2,
  RefreshCcw,
  X,
} from "lucide-react";
import adminApi from "../../api/adminApi";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";
import Input from "../../components/UI/Input";

const AdminDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [editing, setEditing] = useState(null); // department object or null
  const [form, setForm] = useState({ department_id: "", name: "" });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formOpen, setFormOpen] = useState(false);

  // ---------- Load departments ----------
  const loadDepartments = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      const data = await adminApi.getDepartments();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load departments", err);
      setError("Failed to load departments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  // ---------- Helpers ----------
  const resetForm = () => {
    setEditing(null);
    setForm({ department_id: "", name: "" });
  };

  const openCreateModal = () => {
    setError("");
    setSuccess("");
    resetForm();
    setFormOpen(true);
  };

  const openEditModal = (dep) => {
    setError("");
    setSuccess("");
    setEditing(dep);
    setForm({
      department_id: dep.department_id || "",
      name: dep.name || "",
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

    if (!form.department_id.trim() || !form.name.trim()) {
      setError("Both department code and name are required.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        department_id: form.department_id.trim(),
        name: form.name.trim(),
      };

      if (editing) {
        await adminApi.updateDepartment(editing.id, payload);
        setSuccess("Department updated successfully.");
      } else {
        await adminApi.createDepartment(payload);
        setSuccess("Department created successfully.");
      }

      closeFormModal();
      await loadDepartments();
    } catch (err) {
      console.error("Failed to save department", err);
      setError("Failed to save department. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ---------- Delete ----------
  const handleDelete = async (dep) => {
    setError("");
    setSuccess("");

    if (
      !window.confirm(
        `Delete department "${dep.name}"? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await adminApi.deleteDepartment(dep.id);
      setSuccess("Department deleted.");
      await loadDepartments();
    } catch (err) {
      console.error("Failed to delete department", err);
      setError("Failed to delete department. Please try again.");
    }
  };

  // ---------- Render ----------
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 via-sky-50 to-primary/5 ring-1 ring-primary/20">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">
              Admin · Structure
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Departments
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Manage your university departments, their codes, and names.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={loadDepartments}
            disabled={loading}
          >
            <RefreshCcw className="mr-1 h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button size="sm" className="text-xs" onClick={openCreateModal}>
            <PlusCircle className="mr-1 h-4 w-4" />
            New Department
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
              Existing Departments
            </h3>
            <p className="text-[11px] text-slate-500">
              View, edit, or remove departments from the system.
            </p>
          </div>
          <p className="text-[11px] text-slate-400">
            {departments.length} total
          </p>
        </div>

        <div className="max-h-80 overflow-auto rounded-xl border border-slate-100">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-left py-2 px-3">ID</th>
                <th className="text-left py-2 px-3">Code</th>
                <th className="text-left py-2 px-3">Name</th>
                <th className="text-right py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && departments.length === 0 ? (
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
                        <div className="h-3 w-32 rounded bg-slate-200" />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="ml-auto h-3 w-16 rounded bg-slate-200" />
                      </td>
                    </tr>
                  ))}
                </>
              ) : departments.length === 0 ? (
                <tr>
                  <td
                    className="py-4 px-3 text-center text-xs text-slate-400"
                    colSpan={4}
                  >
                    No departments yet. Use{" "}
                    <span className="font-medium">New Department</span> to add
                    one.
                  </td>
                </tr>
              ) : (
                departments.map((d) => (
                  <tr
                    key={d.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-2 px-3 text-[11px] text-slate-500">
                      #{d.id}
                    </td>
                    <td className="py-2 px-3 text-sm font-mono text-slate-800">
                      {d.department_id}
                    </td>
                    <td className="py-2 px-3 text-sm text-slate-800">
                      {d.name}
                    </td>
                    <td className="py-2 px-3 text-right space-x-1 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[11px] px-2 py-0.5"
                        onClick={() => openEditModal(d)}
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[11px] px-2 py-0.5 text-red-600"
                        onClick={() => handleDelete(d)}
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
          <div className="w-full max-w-md">
            <Card className="space-y-4 border border-slate-100 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {editing ? "Edit Department" : "Create Department"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editing
                      ? "Update the department code or name, then save your changes."
                      : "Fill in the details below to add a new department."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeFormModal}
                  disabled={saving}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {error && (
                <p className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600">
                  {error}
                </p>
              )}

              <form className="space-y-3" onSubmit={handleSubmit}>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    label="Department Code"
                    name="department_id"
                    value={form.department_id}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        department_id: e.target.value,
                      }))
                    }
                    placeholder="e.g. CS, IT, ENG"
                    required
                  />
                  <Input
                    label="Department Name"
                    name="name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="e.g. Computer Science"
                    required
                  />
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
                      : "Create Department"}
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

export default AdminDepartments;
