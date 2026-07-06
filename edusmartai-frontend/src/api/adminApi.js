// src/api/adminApi.js
import axiosClient from "./axiosClient";

const adminApi = {
  // --------- Dashboard ----------
  getDashboard: () =>
    axiosClient.get("/admin/dashboard").then((r) => r.data),

  // --------- Departments ----------
  getDepartments: () =>
    axiosClient.get("/admin/departments").then((r) => r.data),
  createDepartment: (data) =>
    axiosClient.post("/admin/departments", data).then((r) => r.data),
  updateDepartment: (id, data) =>
    axiosClient.put(`/admin/departments/${id}`, data).then((r) => r.data),
  deleteDepartment: (id) =>
    axiosClient.delete(`/admin/departments/${id}`),

  // --------- Semesters ----------
  getSemesters: () =>
    axiosClient.get("/admin/semesters").then((r) => r.data),
  createSemester: (data) =>
    axiosClient.post("/admin/semesters", data).then((r) => r.data),
  updateSemester: (id, data) =>
    axiosClient.put(`/admin/semesters/${id}`, data).then((r) => r.data),
  deleteSemester: (id) =>
    axiosClient.delete(`/admin/semesters/${id}`),

  // --------- Lecturers ----------
  getLecturers: () =>
    axiosClient.get("/admin/lecturers").then((r) => r.data),
  createLecturer: (data) =>
    axiosClient.post("/admin/lecturers", data).then((r) => r.data),
  updateLecturer: (id, data) =>
    axiosClient.put(`/admin/lecturers/${id}`, data).then((r) => r.data),
  deleteLecturer: (id) =>
    axiosClient.delete(`/admin/lecturers/${id}`),

  // --------- Courses ----------
  getCourses: () =>
    axiosClient.get("/admin/courses").then((r) => r.data),
  createCourse: (data) =>
    axiosClient.post("/admin/courses", data).then((r) => r.data),
  updateCourse: (id, data) =>
    axiosClient.put(`/admin/courses/${id}`, data).then((r) => r.data),
  deleteCourse: (id) =>
    axiosClient.delete(`/admin/courses/${id}`),

  // --------- Students ----------
  // List
  getStudents: () =>
    axiosClient.get("/admin/students").then((r) => r.data),

  // Get single
  getStudent: (id) =>
    axiosClient.get(`/admin/students/${id}`).then((r) => r.data),

  // Create
  createStudent: (data) =>
    axiosClient.post("/admin/students", data).then((r) => r.data),

  // Update
  updateStudent: (id, data) =>
    axiosClient.put(`/admin/students/${id}`, data).then((r) => r.data),

  // Delete
  deleteStudent: (id) =>
    axiosClient.delete(`/admin/students/${id}`),
};

export default adminApi;
