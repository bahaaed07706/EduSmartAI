// src/pages/Admin/AdminStudents.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Search,
  Filter,
  RefreshCcw,
  GraduationCap,
} from "lucide-react";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";
import adminApi from "../../api/adminApi";

const AdminStudents = () => {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState("");
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [deletingId, setDeletingId] = useState(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setNetworkError("");
      const data = await adminApi.getStudents();
      if (Array.isArray(data)) {
        setStudents(data);
      } else if (Array.isArray(data?.students)) {
        setStudents(data.students);
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error("Failed to load students", err);
      if (!err.response) {
        setNetworkError(
          "Cannot reach the backend API (possible CORS / network issue)."
        );
      }
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const uniqueDepartments = useMemo(() => {
    const map = new Map();
    for (const s of students) {
      const id = s.department_id;
      const name = s.department_name || null;
      if (!map.has(id)) {
        map.set(id, name);
      }
    }
    return Array.from(map.entries());
  }, [students]);

  const filteredStudents = useMemo(() => {
    let result = students;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((s) => {
        return (
          s.name?.toLowerCase().includes(q) ||
          s.student_number?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q)
        );
      });
    }

    if (departmentFilter !== "all") {
      const depId = Number(departmentFilter);
      if (!Number.isNaN(depId)) {
        result = result.filter((s) => s.department_id === depId);
      }
    }

    return result;
  }, [students, search, departmentFilter]);

  const stats = useMemo(() => {
    if (!students.length) {
      return {
        total: 0,
        avgGpa: null,
        deptCount: 0,
      };
    }
    const deptSet = new Set();
    let gpaSum = 0;
    let gpaCount = 0;

    students.forEach((s) => {
      if (s.department_id) deptSet.add(s.department_id);
      if (s.gpa != null && !Number.isNaN(Number(s.gpa))) {
        gpaSum += Number(s.gpa);
        gpaCount += 1;
      }
    });

    return {
      total: students.length,
      avgGpa: gpaCount ? (gpaSum / gpaCount).toFixed(2) : null,
      deptCount: deptSet.size,
    };
  }, [students]);

  const handleCreateStudent = () => {
    navigate("/admin/students/new");
  };

  const handleEditStudent = (student) => {
    navigate(`/admin/students/${student.id}`);
  };

  const handleDeleteStudent = async (student) => {
    if (
      !window.confirm(
        `Are you sure you want to delete student "${student.name}" (#${student.student_number})?`
      )
    ) {
      return;
    }

    try {
      setDeletingId(student.id);
      await adminApi.deleteStudent(student.id);
      await fetchStudents();
    } catch (err) {
      console.error("Failed to delete student", err);
      alert("Failed to delete student.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && students.length === 0) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-500">Loading students...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 via-sky-50 to-primary/5 ring-1 ring-primary/20">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/80">
              Admin · Students
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Students Management
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              View, search, add, edit, and delete student records.
            </p>

            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                <Users className="h-3 w-3" />
                <span>{stats.total} students</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                <GraduationCap className="h-3 w-3" />
                <span>{stats.deptCount} departments</span>
              </span>
              {stats.avgGpa && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                  🎯 <span>Avg GPA: {stats.avgGpa}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={fetchStudents}
            disabled={loading}
          >
            <RefreshCcw className="mr-1 h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleCreateStudent} className="text-xs">
            + Add New Student
          </Button>
        </div>
      </div>

      {/* Network warning */}
      {networkError && (
        <Card className="border border-amber-300 bg-amber-50">
          <p className="text-xs text-amber-800">
            {networkError} Make sure your backend is running at{" "}
            <span className="font-mono">http://localhost:8000</span> and CORS
            is configured.
          </p>
        </Card>
      )}

      {/* Filters */}
      <Card className="flex flex-col gap-3 border border-slate-100 bg-white/95 p-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Search
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <Search className="h-3.5 w-3.5 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Search by name, student number, or email..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-9 py-1.5 text-sm shadow-inner focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/40"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="w-full sm:w-60">
          <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <Filter className="h-3 w-3" />
            Department
          </label>
          <select
            className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/40"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="all">All departments</option>
            {uniqueDepartments.map(([id, name]) => (
              <option key={id} value={id}>
                {name || `Department #${id}`}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden border border-slate-100 bg-white/95">
        {filteredStudents.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No students found matching the current filters.
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 text-[11px] font-semibold uppercase tracking-wide text-slate-600 backdrop-blur">
                <tr>
                  <th className="px-3 py-2 text-left">Student #</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">Department</th>
                  <th className="px-3 py-2 text-left">GPA</th>
                  <th className="px-3 py-2 text-left">Region</th>
                  <th className="px-3 py-2 text-left">Gender</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-800">
                      {s.student_number}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-900">
                      {s.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                      {s.email}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700">
                        {s.department_name || `Dept #${s.department_id}`}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {s.gpa != null ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          {Number(s.gpa).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                      {s.region || "--"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 capitalize text-slate-700">
                      {s.gender || "--"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[11px] px-2 py-1"
                          onClick={() => handleEditStudent(s)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[11px] px-2 py-1 text-red-600"
                          onClick={() => handleDeleteStudent(s)}
                          disabled={deletingId === s.id}
                        >
                          {deletingId === s.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
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

export default AdminStudents;
