// src/pages/Student/StudentQuizPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DOMPurify from "dompurify";

import studentApi from "../../api/studentApi";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";

/**
 * Simple confirmation modal for quiz submission
 */
const ConfirmSubmitModal = ({ open, onConfirm, onCancel, submitting }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={onCancel}
        aria-hidden="true"
      />
      <Card className="relative z-50 w-full max-w-md shadow-xl border-slate-200 bg-white">
        <div className="flex items-start gap-3">
          <div className="mt-1 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span className="text-lg">⚠️</span>
          </div>
          <div className="flex-1">
            <h2 className="text-sm md:text-base font-semibold text-slate-900">
              Submit quiz?
            </h2>
            <p className="mt-1 text-xs md:text-sm text-slate-600">
              Are you sure you want to submit the quiz? You won&apos;t be able
              to change your answers afterwards.
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Yes, submit"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

const StudentQuizPage = () => {
  const { courseId: courseIdFromRoute, quizId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [summary, setSummary] = useState(null); // { title, status, course_id, ... }
  const [attempt, setAttempt] = useState(null); // StartQuizResponse
  const [questions, setQuestions] = useState([]); // questions with options
  const [currentIndex, setCurrentIndex] = useState(0);

  // confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Timer: track "now" so we can compute time left
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const endTime = useMemo(() => {
    if (!attempt?.end_time) return null;
    const d = new Date(attempt.end_time);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [attempt]);

  const timeLeftMs = useMemo(() => {
    if (!endTime) return null;
    const diffMs = endTime.getTime() - now.getTime();
    if (diffMs <= 0) return 0;
    return diffMs;
  }, [endTime, now]);

  const minutesLeft = useMemo(() => {
    if (timeLeftMs == null) return null;
    return Math.max(0, Math.floor(timeLeftMs / 1000 / 60));
  }, [timeLeftMs]);

  const secondsLeft = useMemo(() => {
    if (timeLeftMs == null) return null;
    return Math.max(0, Math.floor((timeLeftMs / 1000) % 60));
  }, [timeLeftMs]);

  const quizExpired = useMemo(() => timeLeftMs === 0, [timeLeftMs]);

  // --------- Helpers to resolve courseId & navigate to result ---------

  const resolveCourseId = () =>
    courseIdFromRoute || attempt?.course_id || summary?.course_id;

  const goToResultPage = (explicitCourseId) => {
    const finalCourseId = explicitCourseId || resolveCourseId();

    if (!finalCourseId) {
      console.warn(
        "Cannot navigate to quiz result: courseId is missing (route param & API)."
      );
      navigate("/student", { replace: true });
      return;
    }

    navigate(
      `/student/courses/${finalCourseId}/quizzes/${quizId}/result`,
      { replace: true }
    );
  };

  // -------------------- Load summary & auto-start / redirect / resume --------------------

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const s = await studentApi.getQuizSummary(quizId);
        setSummary(s);

        // If quiz already completed for this student -> go to result page
        if (s.status === "Completed") {
          setLoading(false);
          goToResultPage(s.course_id);
          return;
        }

        // If quiz is not active, just show its status.
        if (s.status === "Upcoming" || s.status === "Closed") {
          setLoading(false);
          return;
        }

        // Otherwise (Active / In Progress) start or resume quiz.
        await handleStartQuiz();
      } catch (err) {
        console.error("Failed to load quiz summary", err);
        setError("Failed to load quiz. Please try again later.");
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  const handleStartQuiz = async () => {
    try {
      setError("");
      const data = await studentApi.startQuiz(quizId);
      // data: { attempt_id, quiz_id, title, course_id, end_time, questions: [...] }
      setAttempt(data);
      setQuestions(data.questions || []);
      setCurrentIndex(0);
    } catch (err) {
      console.error("Failed to start quiz", err);
      setError("Unable to start the quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------- Answer handling --------------------

  const handleSelectOption = async (questionId, optionId) => {
    if (!attempt || submitting || quizExpired) return;

    // Optimistic UI update
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, selected_option_id: optionId } : q
      )
    );

    try {
      // pass camelCase, studentApi will convert to snake_case for backend
      await studentApi.saveQuizAnswer(attempt.attempt_id, {
        questionId,
        selectedOptionId: optionId,
      });
    } catch (err) {
      console.error("Failed to save answer", err);
      setError("Failed to save answer. Please check your connection.");
    }
  };

  const answeredCount = useMemo(
    () => questions.filter((q) => q.selected_option_id != null).length,
    [questions]
  );

  // -------------------- Submit & auto-submit --------------------

  const actuallySubmit = async () => {
    if (!attempt || submitting) return;
    try {
      setSubmitting(true);
      setError("");

      await studentApi.submitQuizAttempt(attempt.attempt_id);

      // After successful submit, go to the dedicated result page
      goToResultPage();
    } catch (err) {
      console.error("Failed to submit quiz", err);
      setError("Failed to submit quiz. Please try again.");
    } finally {
      setSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  // Auto-submit when time hits zero (no modal here)
  useEffect(() => {
    if (!attempt || !quizExpired || submitting) return;
    (async () => {
      try {
        await actuallySubmit();
      } catch {
        // error already handled in actuallySubmit
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizExpired, attempt, submitting]);

  const handleManualSubmit = () => {
    if (!attempt || submitting || quizExpired) return;
    // Open the custom confirmation modal instead of window.confirm
    setShowConfirmModal(true);
  };

  // -------------------- UI helpers --------------------

  const renderTimer = () => {
    if (!attempt || !endTime) return null;

    const danger =
      minutesLeft !== null &&
      (minutesLeft < 1 || (minutesLeft <= 5 && secondsLeft <= 59));

    return (
      <div
        className={
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border shadow-sm " +
          (danger
            ? "bg-rose-50 text-rose-700 border-rose-200"
            : "bg-emerald-50 text-emerald-700 border-emerald-200")
        }
      >
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/70 text-[10px]">
          ⏱
        </span>
        <span>Time left:</span>
        {minutesLeft != null && secondsLeft != null ? (
          <span className="font-mono">
            {String(minutesLeft).padStart(2, "0")}:
            {String(secondsLeft).padStart(2, "0")}
          </span>
        ) : (
          <span>—</span>
        )}
      </div>
    );
  };

  const renderHeader = () => {
    const title = attempt?.title || summary?.title || `Quiz #${quizId}`;

    return (
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-primary/70 font-semibold">
            Quiz
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
            {title}
          </h1>
          {(summary?.course_id || courseIdFromRoute) && (
            <p className="text-xs text-slate-500">
              Course ID: {summary?.course_id || courseIdFromRoute}
            </p>
          )}
        </div>
        <div className="flex flex-col items-start md:items-end gap-2">
          {renderTimer()}
          {summary?.status && (
            <span className="text-[11px] uppercase text-slate-500">
              Status:{" "}
              <span className="font-semibold text-slate-800">
                {summary.status}
              </span>
            </span>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate(-1)}>
              ← Back
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderUpcomingOrClosed = () => {
    if (!summary) return null;
    return (
      <Card className="mt-4 border-dashed border-slate-200 bg-slate-50/80">
        <p className="text-sm text-slate-700">
          This quiz is currently{" "}
          <span className="font-semibold">{summary.status}</span>.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          You will be able to access it once it becomes active.
        </p>
      </Card>
    );
  };

  const currentQuestion = questions[currentIndex];

  const renderQuestionPane = () => {
    if (!attempt || !questions.length) {
      return (
        <Card className="mt-4">
          <p className="text-sm text-slate-500">
            No questions defined for this quiz yet.
          </p>
        </Card>
      );
    }

    if (!currentQuestion) return null;

    const total = questions.length;
    const qNumber = currentIndex + 1;
    const questionHtml = DOMPurify.sanitize(
      currentQuestion.question_text || ""
    );

    return (
      <Card className="relative overflow-hidden">
        <div className="absolute -right-20 -top-24 w-40 h-40 rounded-full bg-primary/5 blur-2xl" />
        <div className="relative space-y-4">
          {/* Question header */}
          <div className="flex justify-between items-start gap-3">
            <div className="space-y-1">
              <p className="text-[11px] uppercase text-slate-500 flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                  {qNumber}
                </span>
                Question {qNumber} of {total}
              </p>
              <div className="text-sm md:text-base font-semibold text-slate-800 mt-1">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: questionHtml }}
                />
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className="text-[11px] uppercase text-slate-500">
                Marks
              </p>
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-slate-50 border text-xs font-semibold text-slate-800">
                {currentQuestion.marks}
              </span>
            </div>
          </div>

          {/* Options */}
          <div className="mt-2 space-y-2">
            {currentQuestion.options.map((opt) => {
              const selected = currentQuestion.selected_option_id === opt.id;
              const disabled = submitting || quizExpired;

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    handleSelectOption(currentQuestion.id, opt.id)
                  }
                  className={
                    "w-full text-left px-3.5 py-2.5 rounded-lg border text-xs md:text-sm transition-colors flex items-start justify-between gap-3 " +
                    (selected
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60")
                  }
                >
                  <span className="flex-1">{opt.option_text}</span>
                  {selected && (
                    <span className="text-[11px] font-semibold">
                      Selected
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-2">
            <Button
              variant="secondary"
              disabled={currentIndex === 0}
              onClick={() =>
                setCurrentIndex((i) => Math.max(0, i - 1))
              }
            >
              Previous
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                Use Next / Previous or jump from the sidebar.
              </span>
              <Button
                variant="secondary"
                disabled={currentIndex === questions.length - 1}
                onClick={() =>
                  setCurrentIndex((i) =>
                    Math.min(questions.length - 1, i + 1)
                  )
                }
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const renderSidebar = () => {
    if (!attempt || !questions.length) return null;

    const total = questions.length;

    return (
      <div className="space-y-3">
        {/* Progress */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-700">
              Progress
            </p>
            <span className="text-[11px] text-slate-500">
              {answeredCount}/{total} answered
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width:
                  total === 0
                    ? "0%"
                    : `${Math.round(
                        (answeredCount / total) * 100
                      )}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Try to answer all questions.</span>
            <span className="font-medium text-primary">
              {Math.round(
                total === 0 ? 0 : (answeredCount / total) * 100
              )}
              %
            </span>
          </div>
        </Card>

        {/* Question navigator */}
        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-700">
              Question Navigator
            </p>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <span className="inline-flex h-3 w-3 rounded-full bg-emerald-500/80" />
              <span>Answered</span>
              <span className="inline-flex h-3 w-3 rounded-full bg-slate-300 ml-2" />
              <span>Unanswered</span>
            </div>
          </div>

          <div className="mt-1 grid grid-cols-6 sm:grid-cols-8 gap-1.5">
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const answered = q.selected_option_id != null;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={
                    "h-8 w-8 flex items-center justify-center rounded-lg text-[11px] border text-center transition-all shadow-sm " +
                    (isCurrent
                      ? "bg-primary text-white border-primary shadow"
                      : answered
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100")
                  }
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <p className="text-[10px] text-slate-400 mt-1">
            Tap a number to jump directly to that question.
          </p>
        </Card>

        {/* Submit area with custom modal trigger */}
        <Card className="space-y-3 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary">
              ✓
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">
                Ready to submit?
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Your answers are auto-saved as soon as you select an option.
                When you&apos;re done, press submit to finalize your attempt.
              </p>
            </div>
          </div>
          <Button
            onClick={handleManualSubmit}
            disabled={submitting || quizExpired}
            className="w-full"
          >
            {submitting
              ? "Submitting..."
              : quizExpired
              ? "Submitting..."
              : "Submit Quiz"}
          </Button>
          {quizExpired && (
            <p className="text-[10px] text-rose-600">
              Time is up. Your quiz is being auto-submitted.
            </p>
          )}
        </Card>
      </div>
    );
  };

  // -------------------- Main render --------------------

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-500">Loading quiz...</p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100">
        <div className="w-full max-w-[1280px] mx-auto px-3 md:px-6 py-6 md:py-8 space-y-5">
          {renderHeader()}

          {error && (
            <Card className="border-rose-200 bg-rose-50">
              <p className="text-xs text-rose-700">{error}</p>
            </Card>
          )}

          {/* If not started and not completed, but Upcoming/Closed */}
          {summary &&
            (summary.status === "Upcoming" ||
              summary.status === "Closed") &&
            !attempt &&
            renderUpcomingOrClosed()}

          {/* Active / In Progress view */}
          {attempt && (
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)] gap-4 md:gap-6 mt-2">
              <div>{renderQuestionPane()}</div>
              <div>{renderSidebar()}</div>
            </div>
          )}
        </div>
      </div>

      {/* Custom confirmation modal */}
      <ConfirmSubmitModal
        open={showConfirmModal}
        submitting={submitting}
        onCancel={() => setShowConfirmModal(false)}
        onConfirm={actuallySubmit}
      />
    </>
  );
};

export default StudentQuizPage;
