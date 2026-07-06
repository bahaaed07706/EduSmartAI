// src/api/studentApi.js
import axiosClient from "./axiosClient";

const studentApi = {
  // ---------- Profile ----------
  getMe: () => axiosClient.get("/students/me").then((r) => r.data),

  // ---------- Semesters ----------
  getCurrentSemester: () =>
    axiosClient.get("/students/me/semesters/current").then((r) => r.data),

  // All semesters where the student has enrollments
  getMySemesters: () =>
    axiosClient.get("/students/me/semesters").then((r) => r.data),

  // ---------- Courses list & details ----------
  getMyCourses: () =>
    axiosClient.get("/students/me/courses").then((r) => r.data),

  getCourseDetails: (courseId) =>
    axiosClient.get(`/students/me/courses/${courseId}`).then((r) => r.data),

  // ---------- Grades summary ----------
  getCourseGradesSummary: (courseId) =>
    axiosClient
      .get(`/students/me/courses/${courseId}/grades-summary`)
      .then((r) => r.data),

  // ---------- Assessments (student view) ----------
  // Includes: submitted flag, submission_file_url, marks_obtained, feedback...
  getCourseAssessments: (courseId) =>
    axiosClient
      .get(`/students/me/courses/${courseId}/assessments`)
      .then((r) => r.data),

  // ---------- Attendance ----------
  getCourseAttendance: (courseId) =>
    axiosClient
      .get(`/students/me/courses/${courseId}/attendance`)
      .then((r) => r.data),

  // ---------- Files (upload) ----------
  // Generic file upload. Backend returns { url, filename, original_name }
  uploadFile: (formData) =>
    axiosClient
      .post("/files/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((r) => r.data),

  // ---------- Assessment submission (file-based) ----------
  // Must send JSON body: { file_url: "<string>" }
  submitAssessment: (assessmentId, fileUrl) =>
    axiosClient
      .post(`/assessments/${assessmentId}/submit`, {
        file_url: fileUrl,
      })
      .then((r) => r.data),

  // ======================================================
  //                    QUIZ APIs (MCQ)
  // ======================================================

  // List quizzes for a course (with status: Upcoming/Active/Closed/Completed)
  getCourseQuizzes: (courseId) =>
    axiosClient
      .get(`/students/courses/${courseId}/quizzes`)
      .then((r) => r.data),

  // Get summary info for a single quiz for the current student
  getQuizSummary: (quizId) =>
    axiosClient.get(`/students/quizzes/${quizId}`).then((r) => r.data),

  // Start a quiz (or resume an existing in-progress attempt).
  // Returns StartQuizResponse (attempt_id, questions, end_time, etc.)
  startQuiz: (quizId) =>
    axiosClient.post(`/students/quizzes/${quizId}/start`).then((r) => r.data),

  // Get the current state of an ongoing quiz attempt (resume after refresh)
  getQuizAttempt: (attemptId) =>
    axiosClient.get(`/students/attempts/${attemptId}`).then((r) => r.data),

  // Save/update a single answer during the attempt (auto-save)
  // payload = { questionId, selectedOptionId }
  saveQuizAnswer: (attemptId, { questionId, selectedOptionId }) =>
    axiosClient
      .post(`/students/attempts/${attemptId}/answers`, {
        question_id: questionId,
        selected_option_id: selectedOptionId,
      })
      .then((r) => r.data),

  // Submit the quiz attempt (auto-grades and stores score)
  submitQuizAttempt: (attemptId) =>
    axiosClient
      .post(`/students/attempts/${attemptId}/submit`)
      .then((r) => r.data),

  // Get final results for this quiz for the current student
  getQuizResult: (quizId) =>
    axiosClient.get(`/students/quizzes/${quizId}/result`).then((r) => r.data),

  // ---------- Course materials (student) ----------
  // List materials for a course (only if enrolled)
  getCourseMaterials: (courseId) =>
    axiosClient
      .get(`/students/me/courses/${courseId}/materials`)
      .then((r) => r.data),

  // Get a specific material (with its files)
  getCourseMaterial: (courseId, materialId) =>
    axiosClient
      .get(`/students/me/courses/${courseId}/materials/${materialId}`)
      .then((r) => r.data),

  // ---------- AI Predictions ----------
  // Get student features and predictions for a course
  getMyFeatures: (courseId) =>
    axiosClient
      .get(`/students/me/features/${courseId}`)
      .then((r) => r.data),
};

export default studentApi;
