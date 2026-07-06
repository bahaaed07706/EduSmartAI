// src/api/adminEnrollmentApi.js
import axiosClient from "./axiosClient";

const adminEnrollmentApi = {
  /**
   * List enrollments for a specific course.
   * Expected backend endpoint:
   *   GET /admin/courses/{course_id}/enrollments
   * Returns an array of enrollments (optionally with nested student/semester info).
   */
  getCourseEnrollments: (courseId) =>
    axiosClient
      .get(`/admin/courses/${courseId}/enrollments`)
      .then((r) => r.data),

  /**
   * Enroll a student into a course.
   *
   * @param {number|string} courseId
   * @param {{ student_id: number, semester_id?: number|null }} payload
   *
   * Expected backend endpoint:
   *   POST /admin/courses/{course_id}/enrollments
   * Body:
   *   { student_id: number, semester_id?: number | null }
   */
  enrollStudent: (courseId, { student_id, semester_id = null }) =>
    axiosClient
      .post(`/admin/courses/${courseId}/enrollments`, {
        student_id,
        semester_id,
      })
      .then((r) => r.data),

  /**
   * Remove an existing enrollment (unenroll a student from the course).
   *
   * @param {number|string} courseId
   * @param {number|string} enrollmentId
   *
   * Expected backend endpoint:
   *   DELETE /admin/courses/{course_id}/enrollments/{enrollment_id}
   */
  removeEnrollment: (courseId, enrollmentId) =>
    axiosClient
      .delete(`/admin/courses/${courseId}/enrollments/${enrollmentId}`)
      .then((r) => r.data),

  /**
   * Lightweight search for students by name/email/student_number.
   *
   * Expected backend endpoint:
   *   GET /admin/students/search?query=...
   */
  searchStudents: (query) =>
    axiosClient
      .get("/admin/students/search", {
        params: { query },
      })
      .then((r) => r.data),
};

export default adminEnrollmentApi;
