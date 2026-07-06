// src/components/Layout/Sidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const SidebarLink = ({ to, end = false, children }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      [
        "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        "hover:bg-primary/10",
        isActive ? "bg-primary/10 text-primary" : "text-slate-700",
      ].join(" ")
    }
  >
    {children}
  </NavLink>
);

const Sidebar = () => {
  const { user } = useAuth();
  const role = user?.role || "student";

  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-slate-200 bg-white/95 px-4 py-4 shadow-sm md:flex">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-white">
          E
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">EduSmartAI</p>
          <p className="text-[11px] text-slate-500 capitalize">{role}</p>
        </div>
      </div>

      <nav className="space-y-1 text-sm">
        {role === "student" && (
          <>
            <SidebarLink to="/student" end>
              Dashboard
            </SidebarLink>
            <SidebarLink to="/student/courses">My Courses</SidebarLink>
            <SidebarLink to="/student/profile">Profile</SidebarLink>
          </>
        )}

        {role === "lecturer" && (
          <>
            <SidebarLink to="/lecturer" end>
              Dashboard
            </SidebarLink>
            <SidebarLink to="/lecturer/courses">My Courses</SidebarLink>
            <SidebarLink to="/lecturer/profile">Profile</SidebarLink>
          </>
        )}

        {role === "admin" && (
          <>
            <SidebarLink to="/admin" end>
              Dashboard
            </SidebarLink>
            <SidebarLink to="/admin/departments">Departments</SidebarLink>
            <SidebarLink to="/admin/lecturers">Lecturers</SidebarLink>
            <SidebarLink to="/admin/courses">Courses</SidebarLink>
            <SidebarLink to="/admin/semesters">Semesters</SidebarLink>
            <SidebarLink to="/admin/students">Students</SidebarLink>
            <SidebarLink to="/admin/course-enrollments">
              Course Enrollments
            </SidebarLink>
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
