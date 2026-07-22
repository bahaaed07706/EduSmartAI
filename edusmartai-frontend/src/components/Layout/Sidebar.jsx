// src/components/Layout/Sidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const SidebarLink = ({ to, end = false, onNavigate, children }) => (
  <NavLink
    to={to}
    end={end}
    onClick={onNavigate}
    className={({ isActive }) =>
      [
        "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "hover:bg-primary/10",
        isActive ? "bg-primary/10 text-primary-700" : "text-slate-700",
      ].join(" ")
    }
  >
    {children}
  </NavLink>
);

const LINKS_BY_ROLE = {
  student: [
    { to: "/student", end: true, label: "Dashboard" },
    { to: "/student/courses", label: "My Courses" },
    { to: "/student/profile", label: "Profile" },
  ],
  lecturer: [
    { to: "/lecturer", end: true, label: "Dashboard" },
    { to: "/lecturer/courses", label: "My Courses" },
    { to: "/lecturer/profile", label: "Profile" },
  ],
  admin: [
    { to: "/admin", end: true, label: "Dashboard" },
    { to: "/admin/departments", label: "Departments" },
    { to: "/admin/lecturers", label: "Lecturers" },
    { to: "/admin/courses", label: "Courses" },
    { to: "/admin/semesters", label: "Semesters" },
    { to: "/admin/students", label: "Students" },
    { to: "/admin/course-enrollments", label: "Course Enrollments" },
  ],
};

/** Brand mark + role, shared by the desktop rail and the mobile drawer. */
export const SidebarBrand = ({ role }) => (
  <div className="mb-6 flex items-center gap-3">
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
      E
    </div>
    <div>
      <p className="text-sm font-semibold text-ink">EduSmartAI</p>
      <p className="text-[11px] text-muted capitalize">{role}</p>
    </div>
  </div>
);

/** The role-appropriate navigation links (single source of truth). */
export const NavLinks = ({ role, onNavigate }) => (
  <nav aria-label="Main" className="space-y-1 text-sm">
    {(LINKS_BY_ROLE[role] || []).map((link) => (
      <SidebarLink key={link.to} to={link.to} end={link.end} onNavigate={onNavigate}>
        {link.label}
      </SidebarLink>
    ))}
  </nav>
);

/** Desktop rail. Hidden below md; the mobile drawer covers small screens. */
const Sidebar = () => {
  const { user } = useAuth();
  const role = user?.role || "student";

  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-slate-200 bg-white/95 px-4 py-4 shadow-sm md:flex">
      <SidebarBrand role={role} />
      <NavLinks role={role} />
    </aside>
  );
};

export default Sidebar;
