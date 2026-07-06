// src/routing/routes.jsx
import React, { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useParams,
} from "react-router-dom";
import useAuth from "../hooks/useAuth";

import LoginPage from "../pages/Auth/LoginPage";
import MainLayout from "../components/Layout/MainLayout";

// Student pages
import StudentHome from "../pages/Student/StudentHome";
import MyCourses from "../pages/Student/MyCourses";
import CourseDetails from "../pages/Student/CourseDetails";
import ProfilePage from "../pages/Student/ProfilePage";
import StudentQuizPage from "../pages/Student/StudentQuizPage";
import StudentQuizResult from "../pages/Student/StudentQuizResult";
import StudentCourseMaterials from "../pages/Student/StudentCourseMaterials";

// Lecturer pages
import LecturerDashboard from "../pages/Lecturer/LecturerDashboard";
import LecturerCourseList from "../pages/Lecturer/LecturerCourseList";
import LecturerCourseDetails from "../pages/Lecturer/LecturerCourseDetails";
import LecturerCourseAttendance from "../pages/Lecturer/LecturerCourseAttendance";
import LecturerCourseAssignments from "../pages/Lecturer/LecturerCourseAssignments";
import LecturerCourseQuizzes from "../pages/Lecturer/LecturerCourseQuizzes";
import LecturerCourseProjects from "../pages/Lecturer/LecturerCourseProjects";
import LecturerProfile from "../pages/Lecturer/LecturerProfile";
import LecturerCourseGrades from "../pages/Lecturer/LecturerCourseGrades";
import LecturerQuizEditor from "../pages/Lecturer/LecturerQuizEditor.jsx";
import LecturerQuizResults from "../pages/Lecturer/LecturerQuizResults";
import LecturerCourseMaterials from "../pages/Lecturer/LecturerCourseMaterials";
import LecturerCourseStudents from "../pages/Lecturer/LecturerCourseStudents";

// Admin pages
import AdminDashboard from "../pages/Admin/AdminDashboard";
import AdminDepartments from "../pages/Admin/AdminDepartments";
import AdminLecturers from "../pages/Admin/AdminLecturers";
import AdminCourses from "../pages/Admin/AdminCourses";
import AdminSemesters from "../pages/Admin/AdminSemesters";
import AdminStudents from "../pages/Admin/AdminStudents";
import AdminStudentForm from "../pages/Admin/AdminStudentForm";
import AdminStudentDetails from "../pages/Admin/AdminStudentDetails";
import AdminCourseEnrollments from "../pages/Admin/AdminCourseEnrollments";
import AdminCourseEnrollmentCourses from "../pages/Admin/AdminCourseEnrollmentCourses";

// API
import studentApi from "../api/studentApi";

// ---------- Auth guard ----------

const RequireAuth = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// ---------- 404 / fallback redirect ----------

const NotFoundRedirect = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  if (user.role === "lecturer") {
    return <Navigate to="/lecturer" replace />;
  }

  if (user.role === "student") {
    return <Navigate to="/student" replace />;
  }

  return <Navigate to="/login" replace />;
};

// ---------- Helper for legacy student quiz route ----------
// Handles /student/quizzes/:quizId and figures out the proper
// course-scoped URL (and whether to show quiz or result).
const LegacyStudentQuizRedirect = () => {
  const { quizId } = useParams();
  const location = useLocation();
  const [targetPath, setTargetPath] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const resolveTarget = async () => {
      try {
        // 1) If courseId was passed in navigation state, use it directly
        const stateCourseId = location.state?.courseId;
        if (stateCourseId) {
          const base = `/student/courses/${stateCourseId}/quizzes/${quizId}`;
          setTargetPath(base);
          return;
        }

        // 2) Otherwise, fetch quiz summary to discover course_id + status
        const summary = await studentApi.getQuizSummary(quizId);

        if (!summary || !summary.course_id) {
          console.warn(
            "LegacyStudentQuizRedirect: summary or course_id missing for quiz",
            quizId
          );
          setFailed(true);
          return;
        }

        const base = `/student/courses/${summary.course_id}/quizzes/${quizId}`;
        const dest =
          summary.status === "Completed" ? `${base}/result` : base;

        setTargetPath(dest);
      } catch (err) {
        console.error(
          "LegacyStudentQuizRedirect: failed to resolve route",
          err
        );
        setFailed(true);
      }
    };

    resolveTarget();
  }, [quizId, location.state]);

  if (failed) {
    // If for some reason we can't resolve, just send to student home
    return <Navigate to="/student" replace />;
  }

  if (!targetPath) {
    // Small loading placeholder while we resolve target
    return null;
  }

  return <Navigate to={targetPath} replace />;
};

const AppRoutes = () => (
  <Routes>
    {/* Public */}
    <Route path="/login" element={<LoginPage />} />

    {/* Student */}
    <Route
      path="/student"
      element={
        <RequireAuth allowedRoles={["student"]}>
          <MainLayout />
        </RequireAuth>
      }
    >
      <Route index element={<StudentHome />} />
      <Route path="courses" element={<MyCourses />} />
      <Route path="courses/:courseId" element={<CourseDetails />} />
      <Route path="profile" element={<ProfilePage />} />

      {/* Course materials (student view) */}
      <Route
        path="courses/:courseId/materials"
        element={<StudentCourseMaterials />}
      />

      {/* Quiz-taking page (scoped by course) */}
      <Route
        path="courses/:courseId/quizzes/:quizId"
        element={<StudentQuizPage />}
      />

      {/* Quiz result page for the student */}
      <Route
        path="courses/:courseId/quizzes/:quizId/result"
        element={<StudentQuizResult />}
      />

      {/* Legacy route: /student/quizzes/:quizId
          We resolve course + status and then redirect to either:
          - /student/courses/:courseId/quizzes/:quizId
          - /student/courses/:courseId/quizzes/:quizId/result
      */}
      <Route path="quizzes/:quizId" element={<LegacyStudentQuizRedirect />} />
    </Route>

    {/* Lecturer */}
    <Route
      path="/lecturer"
      element={
        <RequireAuth allowedRoles={["lecturer"]}>
          <MainLayout />
        </RequireAuth>
      }
    >
      <Route index element={<LecturerDashboard />} />
      <Route path="courses" element={<LecturerCourseList />} />
      <Route path="courses/:courseId" element={<LecturerCourseDetails />} />
      <Route
        path="courses/:courseId/attendance"
        element={<LecturerCourseAttendance />}
      />
      <Route
        path="courses/:courseId/assignments"
        element={<LecturerCourseAssignments />}
      />
      <Route
        path="courses/:courseId/quizzes"
        element={<LecturerCourseQuizzes />}
      />
      {/* Quiz question editor */}
      <Route
        path="courses/:courseId/quizzes/:quizId"
        element={<LecturerQuizEditor />}
      />
      {/* Quiz results page */}
      <Route
        path="courses/:courseId/quizzes/:quizId/results"
        element={<LecturerQuizResults />}
      />
      <Route
        path="courses/:courseId/projects"
        element={<LecturerCourseProjects />}
      />
      <Route
        path="courses/:courseId/grades"
        element={<LecturerCourseGrades />}
      />

      {/* Course materials (lecturer manage view) */}
      <Route
        path="courses/:courseId/materials"
        element={<LecturerCourseMaterials />}
      />

      {/* Course students with AI predictions (lecturer view) */}
      <Route
        path="courses/:courseId/students"
        element={<LecturerCourseStudents />}
      />

      <Route path="profile" element={<LecturerProfile />} />
    </Route>

    {/* Admin */}
    <Route
      path="/admin"
      element={
        <RequireAuth allowedRoles={["admin"]}>
          <MainLayout />
        </RequireAuth>
      }
    >
      <Route index element={<AdminDashboard />} />
      <Route path="departments" element={<AdminDepartments />} />
      <Route path="lecturers" element={<AdminLecturers />} />
      <Route path="courses" element={<AdminCourses />} />
      <Route path="semesters" element={<AdminSemesters />} />
      <Route path="students" element={<AdminStudents />} />
      <Route path="students/new" element={<AdminStudentForm />} />
      <Route path="students/:studentId" element={<AdminStudentDetails />} />

      {/* Enrollments flow */}
      <Route
        path="course-enrollments"
        element={<AdminCourseEnrollmentCourses />}
      />
      <Route
        path="course-enrollments/:courseId"
        element={<AdminCourseEnrollments />}
      />
      <Route
        path="courses/:courseId/enrollments"
        element={<AdminCourseEnrollments />}
      />
    </Route>

    {/* Fallback */}
    <Route path="*" element={<NotFoundRedirect />} />
  </Routes>
);

export default AppRoutes;
