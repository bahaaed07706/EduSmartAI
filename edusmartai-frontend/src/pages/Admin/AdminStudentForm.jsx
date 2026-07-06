// src/pages/Admin/AdminStudentForm.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  UserCircle2,
  Mail,
  GraduationCap,
  MapPin,
  School,
  Globe2,
} from "lucide-react";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";
import adminApi from "../../api/adminApi";

const AdminStudentForm = () => {
  const navigate = useNavigate();
  const { studentId } = useParams(); // undefined for "new"
  const isEditMode = Boolean(studentId);

  const [departments, setDepartments] = useState([]);
  const [loadingDeps, setLoadingDeps] = useState(true);
  const [loadingStudent, setLoadingStudent] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    student_number: "",
    name: "",
    email: "",
    gender: "male",
    department_id: "",
    gpa: "",
    region: "",
    highest_education: "",
    password: "",
  });

  // Load departments
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        setLoadingDeps(true);
        const data = await adminApi.getDepartments();
        setDepartments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load departments", err);
        setDepartments([]);
        setError("Failed to load departments.");
      } finally {
        setLoadingDeps(false);
      }
    };

    loadDepartments();
  }, []);

  // If edit mode, load student
  useEffect(() => {
    if (!isEditMode) return;

    const loadStudent = async () => {
      try {
        setLoadingStudent(true);
        const s = await adminApi.getStudent(studentId);

        setForm({
          student_number: s.student_number || "",
          name: s.name || "",
          email: s.email || "",
          gender: s.gender || "male",
          department_id: s.department_id ? String(s.department_id) : "",
          gpa: s.gpa != null ? String(s.gpa) : "",
          region: s.region || "",
          highest_education: s.highest_education || "",
          password: "", // we do NOT load password
        });
      } catch (err) {
        console.error("Failed to load student", err);
        setError("Failed to load student data.");
      } finally {
        setLoadingStudent(false);
      }
    };

    loadStudent();
  }, [isEditMode, studentId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.department_id) {
      setError("Please select a department.");
      return;
    }

    const basePayload = {
      student_number: form.student_number.trim(),
      name: form.name.trim(),
      email: form.email.trim(),
      gender: form.gender,
      department_id: Number(form.department_id),
      gpa: form.gpa ? Number(form.gpa) : null,
      region: form.region.trim() || null,
      highest_education: form.highest_education.trim() || null,
    };

    try {
      setSaving(true);

      if (isEditMode) {
        await adminApi.updateStudent(studentId, basePayload);
      } else {
        if (!form.password) {
          setError("Password is required for new students.");
          setSaving(false);
          return;
        }
        const payload = {
          ...basePayload,
          password: form.password,
        };
        await adminApi.createStudent(payload);
      }

      navigate("/admin/students");
    } catch (err) {
      console.error("Failed to save student", err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to save student.";
      setError(String(msg));
    } finally {
      setSaving(false);
    }
  };

  if (loadingStudent) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-500">Loading student...</p>
      </div>
    );
  }

  const handleClose = () => {
    if (!saving) navigate("/admin/students");
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/45 backdrop-blur-sm">
      <div className="w-full max-w-3xl px-4">
        <Card className="p-0 overflow-hidden shadow-2xl shadow-slate-900/20 border border-slate-100 bg-white/95">
          {/* Modal header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[11px] text-slate-500 hover:border-primary/40 hover:text-primary"
              >
                <ArrowLeft className="h-3 w-3" />
                Back
              </button>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 via-sky-50 to-primary/5 ring-1 ring-primary/20">
                <UserCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">
                  {isEditMode ? "Edit student" : "New student"}
                </p>
                <h1 className="text-base font-semibold tracking-tight text-slate-900">
                  {isEditMode ? "Edit Student" : "Add New Student"}
                </h1>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {isEditMode
                    ? "Update student information and department."
                    : "Create a new student account and assign a department."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Modal body */}
          <div className="px-5 py-4">
            {error && (
              <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              {/* Row 1 */}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <Globe2 className="h-3 w-3" />
                    Student Number
                  </label>
                  <input
                    type="text"
                    name="student_number"
                    value={form.student_number}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-sm shadow-inner focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/40"
                    placeholder="e.g. 202300001"
                  />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <UserCircle2 className="h-3 w-3" />
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-sm shadow-inner focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <Mail className="h-3 w-3" />
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-sm shadow-inner focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/40"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <GraduationCap className="h-3 w-3" />
                    Department
                  </label>
                  <select
                    name="department_id"
                    value={form.department_id}
                    onChange={handleChange}
                    disabled={loadingDeps}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/40"
                  >
                    <option value="">Select department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    GPA (optional)
                  </label>
                  <input
                    type="number"
                    name="gpa"
                    step="0.01"
                    min="0"
                    max="4"
                    value={form.gpa}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-sm shadow-inner focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </div>

              {/* Row 4 */}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <MapPin className="h-3 w-3" />
                    Region (المنطقة)
                  </label>
                  <input
                    type="text"
                    name="region"
                    value={form.region}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-sm shadow-inner focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <School className="h-3 w-3" />
                    Highest Education (أعلى مؤهل)
                  </label>
                  <input
                    type="text"
                    name="highest_education"
                    value={form.highest_education}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-sm shadow-inner focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </div>

              {/* Password (create only) */}
              {!isEditMode && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      required={!isEditMode}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-sm shadow-inner focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving
                    ? isEditMode
                      ? "Saving..."
                      : "Creating..."
                    : isEditMode
                    ? "Save Changes"
                    : "Create Student"}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminStudentForm;
