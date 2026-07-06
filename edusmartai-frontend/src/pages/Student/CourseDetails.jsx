import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BookOpen, TrendingUp, Calendar, ClipboardList, Brain } from "lucide-react";
import studentApi from "../../api/studentApi";
import { buildFileUrl } from "../../utils/fileUrl";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";
import FileUploadInput from "../../components/UI/FileUploadInput";

const CourseDetails = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [grades, setGrades] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  // assessment detail / upload state
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(null);
  const [pendingFileUrl, setPendingFileUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);

        const [courseRes, gradesRes, assessmentsRes, attendanceRes, predictionsRes] =
          await Promise.all([
            studentApi.getCourseDetails(courseId),
            studentApi.getCourseGradesSummary(courseId),
            studentApi.getCourseAssessments(courseId),
            studentApi.getCourseAttendance(courseId),
            studentApi.getMyFeatures(courseId).catch(() => null),
          ]);

        setCourse(courseRes);
        setGrades(gradesRes || null);
        setAssessments(Array.isArray(assessmentsRes) ? assessmentsRes : []);
        setAttendance(attendanceRes || null);
        setPredictions(predictionsRes || null);
      } catch (err) {
        console.error("Failed to load course details", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [courseId]);

  // ---------- helpers ----------

  const formatSchedule = (daysAndTimes) => {
    if (!daysAndTimes) return null;

    if (typeof daysAndTimes === "string") {
      try {
        const parsed = JSON.parse(daysAndTimes);
        if (parsed && typeof parsed === "object") {
          const parts = Object.entries(parsed).map(
            ([day, time]) => `${day}: ${time}`
          );
          return parts.join(", ");
        }
      } catch {
        return daysAndTimes;
      }
    }

    return String(daysAndTimes);
  };

  const formatScore = (value, max) => {
    if (value == null) return `-- / ${max}`;
    const n = Number(value);
    if (Number.isNaN(n)) return `-- / ${max}`;
    return `${n.toFixed(1)} / ${max}`;
  };

  const parseDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  };

  const formatDateTime = (value) => {
    const d = parseDate(value);
    if (!d) return "-";
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const now = new Date();

  const computeStatus = (assessment) => {
    const start = parseDate(assessment.start_date);
    const end = parseDate(assessment.end_date);
    const submitted = assessment.submitted;
    const graded = assessment.marks_obtained != null;

    if (start && now < start) {
      return { label: "Not open yet", tone: "muted" };
    }
    if (end && now > end) {
      if (submitted && graded)
        return { label: "Graded (closed)", tone: "success" };
      if (submitted) return { label: "Submitted (closed)", tone: "warning" };
      return { label: "Missed", tone: "danger" };
    }

    if (submitted && graded)
      return { label: "Graded (in window)", tone: "success" };
    if (submitted) return { label: "Submitted", tone: "info" };
    return { label: "Open", tone: "primary" };
  };

  const statusPillClass = (tone) => {
    switch (tone) {
      case "success":
        return "bg-emerald-50 text-emerald-700";
      case "danger":
        return "bg-rose-50 text-rose-700";
      case "warning":
        return "bg-amber-50 text-amber-700";
      case "info":
        return "bg-sky-50 text-sky-700";
      case "primary":
        return "bg-primary/10 text-primary";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  // Submission rules
  const canSubmitForAssessment = (assessment) => {
    const start = parseDate(assessment.start_date);
    const end = parseDate(assessment.end_date);
    const graded = assessment.marks_obtained != null;

    if (graded) return false;
    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
  };

  const isFutureAssessment = (assessment) => {
    const start = parseDate(assessment.start_date);
    if (!start) return false;
    return now < start;
  };

  const isAfterDeadline = (assessment) => {
    const end = parseDate(assessment.end_date);
    if (!end) return false;
    return now > end;
  };

  // ---------- loading / error ----------

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-500">Loading course details...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-rose-500">Course not found.</p>
      </div>
    );
  }

  // counts for tabs
  const assignmentsCount = assessments.filter((a) => a.type === "assignment")
    .length;
  const quizzesCount = assessments.filter((a) => a.type === "quiz").length;
  const projectsCount = assessments.filter((a) => a.type === "project").length;

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "grades", label: "Grades" },
    { id: "attendance", label: "Attendance" },
    { id: "predictions", label: "AI Predictions" },
    { id: "assignments", label: "Assignments", count: assignmentsCount },
    { id: "quizzes", label: "Quizzes", count: quizzesCount },
    { id: "projects", label: "Projects", count: projectsCount },
  ];

  // ---------- sections ----------

  const renderOverview = () => (
    <Card className="bg-white/90 backdrop-blur-sm shadow-sm border border-slate-100">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <BookOpen className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Course Overview
          </h3>
          <p className="text-[11px] text-slate-500">
            Key information about this course.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-1">
            <span className="font-medium text-slate-700">Course Code:</span>
            <span className="text-slate-900">{course.course_code}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            <span className="font-medium text-slate-700">Name:</span>
            <span className="text-slate-900">{course.name}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            <span className="font-medium text-slate-700">Department:</span>
            <span className="text-slate-900">
              {course.department_name || `#${course.department_id}`}
            </span>
          </div>
          {course.semester_id && (
            <div className="flex flex-wrap gap-1">
              <span className="font-medium text-slate-700">Semester:</span>
              <span className="text-slate-900">
                {course.semester_name || `#${course.semester_id}`}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2 text-sm">
          {course.lecturer_name && (
            <div className="flex flex-wrap gap-1">
              <span className="font-medium text-slate-700">Lecturer:</span>
              <span className="text-slate-900">{course.lecturer_name}</span>
            </div>
          )}
          {course.days_and_times && (
            <div className="flex flex-wrap gap-1">
              <span className="font-medium text-slate-700">Schedule:</span>
              <span className="text-slate-900">
                {formatSchedule(course.days_and_times)}
              </span>
            </div>
          )}
          {course.location && (
            <div className="flex flex-wrap gap-1">
              <span className="font-medium text-slate-700">Location:</span>
              <span className="text-slate-900">{course.location}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  const renderGrades = () => {
    if (!grades) {
      return (
        <Card className="bg-white/90 backdrop-blur-sm shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Grade Summary
              </h3>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            No grade summary available yet. Grades will appear here once your
            lecturer starts publishing them.
          </p>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        <Card className="bg-white/90 backdrop-blur-sm shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Grade Breakdown
              </h3>
              <p className="text-[11px] text-slate-500">
                Overview of your current grading components.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-slate-50/80 px-3 py-2.5">
              <p className="text-[11px] uppercase text-slate-500">Midterm</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatScore(grades.mid_grade, 30)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50/80 px-3 py-2.5">
              <p className="text-[11px] uppercase text-slate-500">
                Participation
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {formatScore(grades.participation_grade, 30)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50/80 px-3 py-2.5">
              <p className="text-[11px] uppercase text-slate-500">
                Final Exam
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {formatScore(grades.final_exam_grade, 40)}
              </p>
            </div>
            <div className="rounded-xl bg-primary/5 px-3 py-2.5">
              <p className="text-[11px] uppercase text-slate-500">Total</p>
              <p className="text-lg font-semibold text-primary">
                {formatScore(grades.total_grade, 100)}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderPredictions = () => {
    if (!predictions) {
      return (
        <Card className="bg-white/90 backdrop-blur-sm shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                AI Predictions
              </h3>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            No AI predictions available yet. Your lecturer will enter your academic features to generate predictions.
          </p>
        </Card>
      );
    }

    const oulad = predictions.oulad_prediction || {};
    const axi = predictions.axi_prediction || {};
    const features = predictions.features || {};
    const behavior = predictions.behavior || {};

    return (
      <div className="space-y-4">
        {/* OULAD Prediction Card */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                OULAD Prediction (Pass/Fail)
              </h3>
              <p className="text-[11px] text-slate-500">
                Predicting your success based on academic performance
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div className={`rounded-xl px-3 py-2.5 ${oulad.result === 'Success' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
              <p className="text-[11px] uppercase text-slate-500">Prediction</p>
              <p className={`text-lg font-semibold ${oulad.result === 'Success' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {oulad.result === 'Success' ? '✅ Pass' : '⚠️ At Risk'}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50/80 px-3 py-2.5">
              <p className="text-[11px] uppercase text-slate-500">Probability</p>
              <p className="text-lg font-semibold text-slate-900">
                {oulad.probability != null ? `${(oulad.probability * 100).toFixed(1)}%` : '--'}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50/80 px-3 py-2.5">
              <p className="text-[11px] uppercase text-slate-500">Label</p>
              <p className="text-lg font-semibold text-slate-900">
                {oulad.label || '--'}
              </p>
            </div>
          </div>

          {/* OULAD Features */}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-[11px] uppercase text-slate-500 mb-2">Features Used</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                <span className="text-slate-500">Weighted Grade:</span>{' '}
                <span className="font-medium text-slate-900">{features.weighted_grade || '--'}</span>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                <span className="text-slate-500">Pass Rate:</span>{' '}
                <span className="font-medium text-slate-900">{features.pass_rate || '--'}%</span>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                <span className="text-slate-500">TMA Score:</span>{' '}
                <span className="font-medium text-slate-900">{features.score_tma || '--'}</span>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                <span className="text-slate-500">CMA Score:</span>{' '}
                <span className="font-medium text-slate-900">{features.score_cma || '--'}</span>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                <span className="text-slate-500">Total Clicks:</span>{' '}
                <span className="font-medium text-slate-900">{features.sum_click || '--'}</span>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                <span className="text-slate-500">Active Days:</span>{' '}
                <span className="font-medium text-slate-900">{features.date || '--'}</span>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                <span className="text-slate-500">Prev Attempts:</span>{' '}
                <span className="font-medium text-slate-900">{features.num_of_prev_attempts || '0'}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* AXI Prediction Card */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
              <TrendingUp className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                AXI Prediction (Engagement Level)
              </h3>
              <p className="text-[11px] text-slate-500">
                Your engagement level based on behavior
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className={`rounded-xl px-3 py-2.5 ${axi.level === 'H' ? 'bg-emerald-50' :
                axi.level === 'M' ? 'bg-amber-50' : 'bg-rose-50'
              }`}>
              <p className="text-[11px] uppercase text-slate-500">Level</p>
              <p className={`text-lg font-semibold ${axi.level === 'H' ? 'text-emerald-700' :
                  axi.level === 'M' ? 'text-amber-700' : 'text-rose-700'
                }`}>
                {axi.level === 'H' ? '🚀 High' :
                  axi.level === 'M' ? '📊 Medium' : '📉 Low'}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50/80 px-3 py-2.5">
              <p className="text-[11px] uppercase text-emerald-700">High %</p>
              <p className="text-lg font-semibold text-emerald-700">
                {axi.prob_h != null ? `${(axi.prob_h * 100).toFixed(1)}%` : '--'}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50/80 px-3 py-2.5">
              <p className="text-[11px] uppercase text-amber-700">Medium %</p>
              <p className="text-lg font-semibold text-amber-700">
                {axi.prob_m != null ? `${(axi.prob_m * 100).toFixed(1)}%` : '--'}
              </p>
            </div>
            <div className="rounded-xl bg-rose-50/80 px-3 py-2.5">
              <p className="text-[11px] uppercase text-rose-700">Low %</p>
              <p className="text-lg font-semibold text-rose-700">
                {axi.prob_l != null ? `${(axi.prob_l * 100).toFixed(1)}%` : '--'}
              </p>
            </div>
          </div>

          {/* Behavior Data */}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-[11px] uppercase text-slate-500 mb-2">Behavior Data</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                <span className="text-slate-500">Raised Hands:</span>{' '}
                <span className="font-medium text-slate-900">{behavior.raised_hands || '--'}</span>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                <span className="text-slate-500">Visited Resources:</span>{' '}
                <span className="font-medium text-slate-900">{behavior.visited_resources || '--'}</span>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                <span className="text-slate-500">Announcements:</span>{' '}
                <span className="font-medium text-slate-900">{behavior.announcements_view || '--'}</span>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                <span className="text-slate-500">Discussion:</span>{' '}
                <span className="font-medium text-slate-900">{behavior.discussion || '--'}</span>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                <span className="text-slate-500">Absence Days:</span>{' '}
                <span className="font-medium text-slate-900">{behavior.absence_days || '--'}</span>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                <span className="text-slate-500">Parent Satisfaction:</span>{' '}
                <span className="font-medium text-slate-900">{behavior.parent_satisfaction || '--'}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Recommendations */}
        <Card className="bg-gradient-to-r from-primary/5 to-indigo-50 shadow-sm border border-primary/10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">💡</span>
            <h3 className="text-sm font-semibold text-slate-900">
              What does this mean?
            </h3>
          </div>
          <div className="text-xs text-slate-700 space-y-2">
            <p>
              <strong>OULAD:</strong> This prediction tells you if you're on track to pass based on your exam scores, assignments, and online activity.
              {oulad.prediction === 1 ?
                ' You\'re doing great! Keep up the good work.' :
                ' Consider reaching out to your lecturer for additional support.'}
            </p>
            <p>
              <strong>AXI:</strong> This measures your engagement level based on class participation, resource usage, and attendance.
              {axi.prediction === 'H' ?
                ' Excellent engagement!' :
                axi.prediction === 'M' ?
                  ' Good, but there\'s room for improvement.' :
                  ' Try to participate more in class and access learning materials regularly.'}
            </p>
          </div>
        </Card>
      </div>
    );
  };

  const renderAttendance = () => {
    if (!attendance) {
      return (
        <Card className="bg-white/90 backdrop-blur-sm shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Attendance
              </h3>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            No attendance data available yet.
          </p>
        </Card>
      );
    }

    const records = attendance?.records ?? [];
    const summary = attendance?.summary ?? {};

    return (
      <div className="space-y-4">
        <Card className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/90 backdrop-blur-sm shadow-sm border border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Attendance Summary
              </h3>
              <p className="text-xs text-slate-500">
                Overview of your attendance in this course.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="rounded-xl bg-slate-50/80 px-3 py-2.5">
              <p className="text-[11px] uppercase text-slate-500">Sessions</p>
              <p className="text-lg font-semibold text-slate-900">
                {summary.total_sessions ?? "--"}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50/80 px-3 py-2.5">
              <p className="text-[11px] uppercase text-emerald-700">
                Present
              </p>
              <p className="text-lg font-semibold text-emerald-700">
                {summary.present_count ?? "--"}
              </p>
            </div>
            <div className="rounded-xl bg-rose-50/80 px-3 py-2.5">
              <p className="text-[11px] uppercase text-rose-700">Absent</p>
              <p className="text-lg font-semibold text-rose-700">
                {summary.absent_count ?? "--"}
              </p>
            </div>
            <div className="rounded-xl bg-primary/5 px-3 py-2.5">
              <p className="text-[11px] uppercase text-primary">Rate</p>
              <p className="text-lg font-semibold text-primary">
                {summary.attendance_rate != null
                  ? `${summary.attendance_rate.toFixed(1)}%`
                  : "-"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-white/90 backdrop-blur-sm shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
              <ClipboardList className="h-4 w-4 text-slate-600" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              Attendance Details
            </h3>
          </div>
          <div className="max-h-80 overflow-auto rounded-md border border-slate-100">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left py-1.5 px-2">Date</th>
                  <th className="text-left py-1.5 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-slate-100 bg-white"
                  >
                    <td className="py-1.5 px-2">{r.date}</td>
                    <td className="py-1.5 px-2 capitalize">
                      {r.status === "present" && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-600">
                          Present
                        </span>
                      )}
                      {r.status === "absent" && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-600">
                          Absent
                        </span>
                      )}
                      {r.status === "late" && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-600">
                          Late
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td
                      colSpan={2}
                      className="py-2 text-center text-slate-400 bg-white"
                    >
                      No attendance records yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  // --------- shared assessments UI (Assignments / Quizzes / Projects) ---------

  const handleSubmitSelectedAssessment = async (assessment) => {
    if (!assessment) return;
    if (!pendingFileUrl) {
      setUploadError("Please upload a file first.");
      return;
    }

    setSubmitting(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      await studentApi.submitAssessment(assessment.id, pendingFileUrl);

      const refreshed = await studentApi.getCourseAssessments(courseId);
      setAssessments(Array.isArray(refreshed) ? refreshed : []);

      setUploadSuccess("Submission saved successfully.");
      setPendingFileUrl(null);
    } catch (err) {
      console.error("Failed to submit assessment", err);
      setUploadError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderAssessmentSection = (type) => {
    const filtered = assessments.filter((a) => a.type === type);

    if (!filtered.length) {
      let label = "assessments";
      if (type === "assignment") label = "assignments";
      if (type === "quiz") label = "quizzes";
      if (type === "project") label = "projects";

      return (
        <Card className="bg-white/90 backdrop-blur-sm shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">
            No {label} defined for this course yet.
          </p>
        </Card>
      );
    }

    const selected =
      filtered.find((a) => a.id === selectedAssessmentId) || filtered[0];

    const status = computeStatus(selected);
    const canSubmit = canSubmitForAssessment(selected);
    const future = isFutureAssessment(selected);
    const closed = isAfterDeadline(selected);
    const graded = selected.marks_obtained != null;
    const isQuiz = type === "quiz";

    const canUpload = !isQuiz && canSubmit && !graded && !future && !closed;

    const currentFileForWidget = pendingFileUrl
      ? buildFileUrl(pendingFileUrl)
      : selected.submission_file_url
        ? buildFileUrl(selected.submission_file_url)
        : "";

    const quizButtonDisabled = isQuiz && future;
    const quizButtonLabel = future
      ? "Not open yet"
      : selected.submitted
        ? "Open quiz / view result"
        : "Start / resume quiz";

    const sectionTitle =
      type === "assignment"
        ? "Assignments"
        : type === "quiz"
          ? "Quizzes"
          : "Projects";

    const sectionIcon =
      type === "assignment" ? "📄" : type === "quiz" ? "📝" : "📦";

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* List card (left side) */}
        <Card className="lg:col-span-1 bg-white/90 backdrop-blur-sm shadow-sm border border-slate-100 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-base">
                {sectionIcon}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {sectionTitle}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {filtered.length} item{filtered.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-1 max-h-[380px] overflow-auto pr-1 space-y-2">
            {filtered.map((a) => {
              const s = computeStatus(a);
              const active = selected && selected.id === a.id;

              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setSelectedAssessmentId(a.id);
                    setUploadError("");
                    setUploadSuccess("");
                    setPendingFileUrl(null);
                  }}
                  className={
                    "group w-full text-left rounded-xl border px-3 py-2.5 text-xs transition-all flex flex-col gap-1 " +
                    (active
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-slate-100 bg-white hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm")
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 line-clamp-1">
                      {a.title}
                    </span>
                    <span
                      className={
                        "inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium " +
                        statusPillClass(s.tone)
                      }
                    >
                      {s.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span>
                      Due:{" "}
                      <span className="font-medium text-slate-700">
                        {formatDateTime(a.end_date)}
                      </span>
                    </span>
                    <span className="text-slate-400">
                      Max: {a.max_marks}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Detail + submission / quiz action */}
        <Card className="lg:col-span-2 space-y-3 bg-white/90 backdrop-blur-sm shadow-sm border border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase text-slate-500">
                {type === "assignment"
                  ? "Assignment"
                  : type === "quiz"
                    ? "Quiz"
                    : "Project"}
              </p>
              <h3 className="text-base font-semibold text-slate-900">
                {selected.title}
              </h3>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className={
                  "inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium " +
                  statusPillClass(status.tone)
                }
              >
                {status.label}
              </span>
              <span className="text-[11px] text-slate-500">
                Max: {selected.max_marks}
              </span>
            </div>
          </div>

          {/* Timing info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg bg-slate-50/80 px-3 py-2">
              <p className="text-[11px] uppercase text-slate-500">Opens</p>
              <p className="text-slate-900">
                {formatDateTime(selected.start_date)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50/80 px-3 py-2">
              <p className="text-[11px] uppercase text-slate-500">Deadline</p>
              <p className="text-slate-900">
                {formatDateTime(selected.end_date)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50/80 px-3 py-2">
              <p className="text-[11px] uppercase text-slate-500">
                Weight (from participation)
              </p>
              <p className="text-slate-900">
                {selected.weight_from_participation != null
                  ? `${selected.weight_from_participation}%`
                  : "--"}
              </p>
            </div>
          </div>

          {/* Description */}
          {selected.description && (
            <div className="text-xs text-slate-700 bg-slate-50/80 rounded-md px-3 py-2 leading-relaxed border border-slate-100">
              {selected.description}
            </div>
          )}

          {/* Teacher resource */}
          {selected.file_url && (
            <div className="text-xs">
              <p className="text-[11px] uppercase text-slate-500">
                Instructions / Resource file
              </p>
              <a
                href={buildFileUrl(selected.file_url)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary text-xs hover:underline mt-1"
              >
                Download resource
              </a>
            </div>
          )}

          {/* Your submission info */}
          <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
            <p className="text-[11px] uppercase text-slate-500">
              Your Submission
            </p>
            {selected.submitted ? (
              <>
                <p className="text-slate-700">
                  <span className="font-medium">Status:</span>{" "}
                  {selected.marks_obtained != null
                    ? "Graded"
                    : "Submitted (waiting grade)"}
                </p>
                {selected.submission_file_url && (
                  <p className="text-slate-700">
                    <span className="font-medium">File:</span>{" "}
                    <a
                      href={buildFileUrl(selected.submission_file_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      Open your submission
                    </a>
                  </p>
                )}
                {selected.marks_obtained != null && (
                  <p className="text-slate-700">
                    <span className="font-medium">Marks:</span>{" "}
                    {selected.marks_obtained} / {selected.max_marks}
                  </p>
                )}
                {selected.feedback && (
                  <p className="text-slate-700">
                    <span className="font-medium">Feedback:</span>{" "}
                    {selected.feedback}
                  </p>
                )}
              </>
            ) : (
              <p className="text-slate-500">
                You haven&apos;t submitted anything for this{" "}
                {type === "assignment"
                  ? "assignment"
                  : type === "quiz"
                    ? "quiz"
                    : "project"}{" "}
                yet.
              </p>
            )}
          </div>

          {/* Upload / Quiz action area */}
          <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
            <p className="text-[11px] uppercase text-slate-500">
              {isQuiz ? "Attempt Quiz" : "Submit / Update"}
            </p>

            {isQuiz ? (
              <>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <Button
                    disabled={quizButtonDisabled}
                    onClick={() =>
                      navigate(
                        `/student/courses/${courseId}/quizzes/${selected.id}`
                      )
                    }
                  >
                    {quizButtonLabel}
                  </Button>
                  <p className="text-[11px] text-slate-500">
                    This is an{" "}
                    <span className="font-semibold">online quiz</span>. You
                    will attempt it directly in the quiz interface (no file
                    upload is required).
                  </p>
                </div>
                {future && (
                  <p className="text-[11px] text-slate-500">
                    The quiz is not open yet. You&apos;ll be able to start it
                    once the open time begins.
                  </p>
                )}
                {closed && !selected.submitted && (
                  <p className="text-[11px] text-slate-500">
                    The quiz window has closed and you did not submit an
                    attempt.
                  </p>
                )}
              </>
            ) : (
              <>
                {future && (
                  <p className="text-slate-500">
                    This {type} is not open yet. You&apos;ll be able to submit
                    once the open time starts.
                  </p>
                )}

                {closed && (
                  <p className="text-slate-500">
                    The deadline has passed. You can no longer change your
                    submission, but you can still view it and your grade.
                  </p>
                )}

                {graded && (
                  <p className="text-slate-500">
                    This {type} has been{" "}
                    <span className="font-semibold">graded</span>. You can no
                    longer change your submission, but you can still view your
                    file and grade above.
                  </p>
                )}

                {canUpload && (
                  <>
                    <FileUploadInput
                      label="Upload your file"
                      helperText="Drag & drop your solution here, or click to browse."
                      value={currentFileForWidget || undefined}
                      onChange={(url) => {
                        setPendingFileUrl(url);
                        setUploadError("");
                        setUploadSuccess("");
                      }}
                      disabled={submitting}
                    />

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-2">
                      <Button
                        disabled={submitting || !pendingFileUrl}
                        onClick={() =>
                          handleSubmitSelectedAssessment(selected)
                        }
                      >
                        {submitting
                          ? "Saving..."
                          : selected.submitted
                            ? "Update Submission"
                            : "Submit"}
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      You can resubmit until it is graded or the deadline
                      passes. The latest file will be considered your final
                      submission.
                    </p>
                  </>
                )}
              </>
            )}

            {uploadError && !isQuiz && (
              <p className="text-[11px] text-rose-500">{uploadError}</p>
            )}
            {uploadSuccess && !isQuiz && (
              <p className="text-[11px] text-emerald-600">{uploadSuccess}</p>
            )}
          </div>
        </Card>
      </div>
    );
  };

  // ---------- main render ----------

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100">
      <div className="w-full max-w-[1280px] mx-auto px-3 md:px-6 py-6 md:py-8 space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-primary/70 font-semibold">
                {course.course_code}
              </p>
              <h2 className="text-2xl md:text-3xl font-semibold text-slate-900">
                {course.name}
              </h2>
              {course.lecturer_name && (
                <p className="mt-1 text-xs text-slate-500">
                  Taught by{" "}
                  <span className="font-medium">{course.lecturer_name}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {/* NEW: Go to materials page */}
            <Button
              variant="outline"
              onClick={() =>
                navigate(`/student/courses/${courseId}/materials`)
              }
            >
              Course Materials
            </Button>
            <Button onClick={() => navigate(-1)}>Back</Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="w-full md:w-auto overflow-x-auto pb-1">
            <div className="inline-flex items-center gap-1 rounded-full bg-slate-100/80 p-1">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    className={
                      "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs sm:text-sm transition-all " +
                      (isActive
                        ? "bg-white text-primary font-semibold shadow-sm border border-primary/30"
                        : "text-slate-600 hover:text-slate-800")
                    }
                    onClick={() => {
                      setActiveTab(tab.id);
                      setUploadError("");
                      setUploadSuccess("");
                      setPendingFileUrl(null);
                    }}
                  >
                    <span>{tab.label}</span>
                    {typeof tab.count === "number" && (
                      <span
                        className={
                          "px-1.5 py-0.5 rounded-full text-[10px] " +
                          (isActive
                            ? "bg-primary/10 text-primary"
                            : "bg-slate-200 text-slate-700")
                        }
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab content */}
        <div className="mt-3">
          {activeTab === "overview" && renderOverview()}
          {activeTab === "grades" && renderGrades()}
          {activeTab === "attendance" && renderAttendance()}
          {activeTab === "predictions" && renderPredictions()}
          {activeTab === "assignments" &&
            renderAssessmentSection("assignment")}
          {activeTab === "quizzes" && renderAssessmentSection("quiz")}
          {activeTab === "projects" && renderAssessmentSection("project")}
        </div>
      </div>
    </div>
  );
};

export default CourseDetails;
