// src/api/lecturerApi.js
import axiosClient from "./axiosClient";

const lecturerApi = {
  // ---------- Semesters (for lecturer filter) ----------

  // All semesters where the lecturer has at least one course
  getMySemesters: () =>
    axiosClient.get("/lecturers/me/semesters").then((r) => r.data),

  // Current semester for this lecturer (or null)
  getMyCurrentSemester: () =>
    axiosClient.get("/lecturers/me/semesters/current").then((r) => r.data),

  // ---------- Courses & grades ----------

  // List all courses for the logged-in lecturer.
  // If semesterId is provided, backend filters by that semester.
  getMyCourses: (semesterId) =>
    axiosClient
      .get("/lecturers/me/courses", {
        params: semesterId ? { semester_id: semesterId } : undefined,
      })
      .then((r) => r.data),

  // Course overview (stats: students, assessments, attendance, avg grade)
  getCourseOverview: (courseId) =>
    axiosClient
      .get(`/lecturers/courses/${courseId}/overview`)
      .then((r) => r.data),

  // List all students in this course with their grade summary row
  getCourseGrades: (courseId) =>
    axiosClient
      .get(`/lecturers/courses/${courseId}/grades`)
      .then((r) => r.data),

  // Alias name for backwards compatibility
  getCourseGradeSummary: (courseId) =>
    axiosClient
      .get(`/lecturers/courses/${courseId}/grades`)
      .then((r) => r.data),

  // Create/update a single student's mid/participation/final for a course
  updateStudentCourseGrades: (courseId, studentId, data) =>
    axiosClient
      .put(
        `/lecturers/courses/${courseId}/students/${studentId}/grades-summary`,
        data
      )
      .then((r) => r.data),

  // ---------- Students in course ----------
  createQuizOption: (questionId, data) =>
    axiosClient
      .post(`/lecturers/questions/${questionId}/options`, data)
      .then((r) => r.data),

  // Basic list of students in a course
  getCourseStudents: (courseId) =>
    axiosClient
      .get(`/lecturers/courses/${courseId}/students`)
      .then((r) => r.data),

  // Detailed info for one student in this course (attendance, grades, submissions)
  getCourseStudentDetails: (courseId, studentId) =>
    axiosClient
      .get(`/lecturers/courses/${courseId}/students/${studentId}/details`)
      .then((r) => r.data),

  // ---------- Assessments (generic: assignments / projects / quizzes-as-assessments) ----------

  // All assessments for a given course
  getCourseAssessments: (courseId) =>
    axiosClient
      .get(`/lecturers/courses/${courseId}/assessments`)
      .then((r) => r.data),

  // Create new assessment (quiz / assignment / project)
  createAssessment: (courseId, data) =>
    axiosClient
      .post(`/lecturers/courses/${courseId}/assessments`, data)
      .then((r) => r.data),

  // Update assessment
  updateAssessment: (assessmentId, data) =>
    axiosClient
      .put(`/lecturers/assessments/${assessmentId}`, data)
      .then((r) => r.data),

  // Delete assessment
  deleteAssessment: (assessmentId) =>
    axiosClient.delete(`/lecturers/assessments/${assessmentId}`),

  // List submissions for one assessment
  getAssessmentSubmissions: (assessmentId) =>
    axiosClient
      .get(`/lecturers/assessments/${assessmentId}/submissions`)
      .then((r) => r.data),

  // Grade / update a student's submission for an assessment
  gradeAssessment: (assessmentId, studentId, data) =>
    axiosClient
      .post(`/lecturers/assessments/${assessmentId}/grade/${studentId}`, data)
      .then((r) => r.data),

  // ---------- Quiz-specific (MCQ) APIs for lecturers ----------

  // Create a quiz for a course (Assessment with type='quiz')
  createQuiz: (courseId, data) =>
    axiosClient
      .post(`/lecturers/courses/${courseId}/quizzes`, data)
      .then((r) => r.data),

  // List quizzes for a course (lecturer view)
  getCourseQuizzes: (courseId) =>
    axiosClient
      .get(`/lecturers/courses/${courseId}/quizzes`)
      .then((r) => r.data),

  // Backwards-compatible alias so components can call lecturerApi.getQuizzes(...)
  getQuizzes: (courseId) =>
    axiosClient
      .get(`/lecturers/courses/${courseId}/quizzes`)
      .then((r) => r.data),

  // Get quiz details (assessment + questions + options)
  getQuizDetails: (quizId) =>
    axiosClient.get(`/lecturers/quizzes/${quizId}`).then((r) => r.data),

  // Add a new question with options to a quiz
  createQuizQuestion: (quizId, data) =>
    axiosClient
      .post(`/lecturers/quizzes/${quizId}/questions`, data)
      .then((r) => r.data),

  // Update a quiz question (text / marks)
  updateQuizQuestion: (quizId, questionId, data) =>
    axiosClient
      .put(`/lecturers/quizzes/${quizId}/questions/${questionId}`, data)
      .then((r) => r.data),

  // Delete a quiz question (and its options)
  deleteQuizQuestion: (quizId, questionId) =>
    axiosClient.delete(`/lecturers/quizzes/${quizId}/questions/${questionId}`),

  // Update an option (text / is_correct) for a question
  updateQuizOption: (optionId, data) =>
    axiosClient.put(`/lecturers/options/${optionId}`, data).then((r) => r.data),

  // Delete an option from a question
  deleteQuizOption: (optionId) =>
    axiosClient.delete(`/lecturers/options/${optionId}`),

  // Get summary results for a quiz (scores, averages, difficulty)
  getQuizResults: (quizId) =>
    axiosClient.get(`/lecturers/quizzes/${quizId}/results`).then((r) => r.data),

  // Get one student's detailed result for a quiz
  getStudentQuizResult: (quizId, studentId) =>
    axiosClient
      .get(`/lecturers/quizzes/${quizId}/results/${studentId}`)
      .then((r) => r.data),

  // Delete a quiz (assessment + related records)
  deleteQuiz: (quizId) => axiosClient.delete(`/lecturers/quizzes/${quizId}`),

  // ---------- Attendance ----------

  // Summary of attendance per student for a course
  getCourseAttendanceSummary: (courseId) =>
    axiosClient
      .get(`/lecturers/courses/${courseId}/attendance/summary`)
      .then((r) => r.data),

  // Get attendance records for a specific date in this course
  getCourseAttendanceForDate: (courseId, date) =>
    axiosClient
      .get(`/lecturers/courses/${courseId}/attendance/by-date`, {
        params: { date },
      })
      .then((r) => r.data),

  // Bulk mark attendance for a course and date
  markAttendanceBulk: (courseId, records) =>
    axiosClient
      .post(`/lecturers/courses/${courseId}/attendance/bulk`, records)
      .then((r) => r.data),

  // ---------- Profile ----------

  // Logged-in lecturer profile with department & courses
  getMyProfile: () =>
    axiosClient.get("/lecturers/me/profile").then((r) => r.data),

  // ---------- Course materials (lecturer) ----------
  // List all materials for a course
  getCourseMaterials: (courseId) =>
    axiosClient
      .get(`/lecturers/courses/${courseId}/materials`)
      .then((r) => r.data),

  // Create new material
  createCourseMaterial: (courseId, data) =>
    axiosClient
      .post(`/lecturers/courses/${courseId}/materials`, data)
      .then((r) => r.data),

  // Update existing material
  updateCourseMaterial: (courseId, materialId, data) =>
    axiosClient
      .put(
        `/lecturers/courses/${courseId}/materials/${materialId}`,
        data
      )
      .then((r) => r.data),

  // Delete a material
  deleteCourseMaterial: (courseId, materialId) =>
    axiosClient
      .delete(`/lecturers/courses/${courseId}/materials/${materialId}`)
      .then((r) => r.data),

  // Update student OULAD features for AI predictions
  updateStudentFeatures: (courseId, studentId, features) =>
    axiosClient
      .post(`/lecturers/me/courses/${courseId}/students/${studentId}/features`, features)
      .then((r) => r.data),

  // Save all student features (OULAD + AXI) and run dual predictions
  saveFullStudentFeatures: (courseId, studentId, fullFeatures) =>
    axiosClient
      .post(`/lecturers/courses/${courseId}/students/${studentId}/full-features`, fullFeatures)
      .then((r) => r.data),
};

export default lecturerApi;
