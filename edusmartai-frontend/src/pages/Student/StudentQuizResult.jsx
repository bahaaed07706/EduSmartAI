// src/pages/Student/StudentQuizResult.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";

import studentApi from "../../api/studentApi";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";

const StudentQuizResult = () => {
  const { courseId, quizId } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadResult = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await studentApi.getQuizResult(quizId);
        setResult(data);
      } catch (err) {
        console.error("Failed to fetch quiz result:", err);
        setError("Could not load quiz result. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadResult();
  }, [quizId]);

  const totalQuestions = useMemo(
    () => (result?.answers ? result.answers.length : 0),
    [result]
  );

  const correctCount = useMemo(
    () =>
      result?.answers
        ? result.answers.filter((a) => a.is_correct).length
        : 0,
    [result]
  );

  const scorePercentage = useMemo(() => {
    if (!result || !result.max_score) return 0;
    return Math.round((result.score / result.max_score) * 100);
  }, [result]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-slate-500">
            Loading your quiz result...
          </p>
          <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden mx-auto">
            <div className="h-full w-1/2 bg-primary animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50">
        <div className="max-w-xl mx-auto p-4 md:p-6">
          <Card className="border-rose-200 bg-rose-50">
            <p className="text-sm text-rose-700">{error}</p>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => navigate(-1)}>
                Go Back
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const scoreLabel =
    scorePercentage >= 90
      ? "Excellent work!"
      : scorePercentage >= 75
      ? "Great job!"
      : scorePercentage >= 60
      ? "Good effort!"
      : "Keep practicing!";

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100">
      <div className="w-full max-w-[1280px] mx-auto px-3 md:px-6 py-6 md:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-primary/70 font-semibold">
              Quiz Result
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
              {result.quiz_title}
            </h1>
            <p className="text-xs text-slate-500">
              Quiz ID: {quizId} · Course ID: {courseId}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Link to={`/student/courses/${courseId}`}>
              <Button variant="secondary">Back to course</Button>
            </Link>
          </div>
        </div>

        {/* Score + Quick summary row */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)] gap-4 lg:gap-6">
          {/* Main score card */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-primary/15">
            <div className="absolute -right-20 -top-24 w-52 h-52 rounded-full bg-primary/10 blur-2xl" />
            <div className="absolute -left-16 -bottom-20 w-40 h-40 rounded-full bg-primary/5 blur-2xl" />

            <div className="relative flex flex-col md:flex-row items-center md:items-stretch gap-6 md:gap-10">
              {/* Circular score */}
              <div className="flex items-center justify-center w-full md:w-[230px] py-4">
                <div className="relative flex items-center justify-center w-40 h-40 md:w-48 md:h-48 rounded-full bg-slate-50 shadow-inner border border-primary/10">
                  <div className="absolute inset-3 rounded-full bg-gradient-to-br from-primary to-primary/90 shadow-md flex flex-col items-center justify-center text-white">
                    <span className="text-[11px] uppercase tracking-wide opacity-80">
                      Score
                    </span>
                    <span className="text-3xl md:text-4xl font-bold leading-none">
                      {scorePercentage}%
                    </span>
                    <span className="mt-1 text-[11px] opacity-80">
                      {result.score} / {result.max_score}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats + Overall chip inside card (top-right) */}
              <div className="flex-1 space-y-3 py-1 md:py-5">
                {/* Top row: overview text + overall chip */}
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-slate-600">
                    Here is a quick overview of your performance:
                  </p>
                  <div className="inline-flex items-center gap-3 px-3.5 py-2.5 rounded-lg border border-primary/30 bg-white/95 text-primary shadow-sm">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-semibold">
                      %
                    </div>
                    <div className="leading-tight">
                      <p className="text-[11px] uppercase tracking-wide text-primary/80">
                        Overall
                      </p>
                      <p className="text-sm font-semibold text-primary">
                        {scoreLabel}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm pt-1">
                  <div className="rounded-lg bg-white/80 border border-slate-100 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                      Total Questions
                    </p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {totalQuestions}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/80 border border-slate-100 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                      Correct
                    </p>
                    <p className="mt-1 text-base font-semibold text-emerald-700">
                      {correctCount}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/80 border border-slate-100 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                      Incorrect / Skipped
                    </p>
                    <p className="mt-1 text-base font-semibold text-rose-600">
                      {totalQuestions - correctCount}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white/80 border border-slate-100 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                      Accuracy
                    </p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {scorePercentage}%
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 pt-1">
                  Use the breakdown below to see exactly which questions you
                  answered correctly and where you lost marks.
                </p>
              </div>
            </div>
          </Card>

          {/* Quick summary with enhanced background */}
          <Card className="bg-gradient-to-br from-indigo-600 via-primary to-sky-500 border-none text-slate-50 shadow-md flex flex-col justify-between">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-wide text-indigo-100/90">
                Quick summary
              </p>
              <p className="text-sm leading-relaxed text-indigo-50">
                Scroll through each question below to review your answers in
                detail. Correct answers are clearly highlighted so you can
                focus on the ones you missed.
              </p>
            </div>
            <div className="mt-4 space-y-2 text-[11px] text-indigo-100/90">
              <p>• Green cards = correct answers.</p>
              <p>• Red cards = incorrect or skipped questions.</p>
              <p>
                • Revisit the relevant lessons in your course to strengthen weak
                areas.
              </p>
            </div>
          </Card>
        </div>

        {/* Answers breakdown */}
        <Card className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
            <h2 className="text-sm md:text-base font-semibold text-slate-900">
              Answer Breakdown
            </h2>
            <p className="text-[11px] text-slate-500">
              Scroll through all questions. Each row below shows the question,
              your answer, and the correct one.
            </p>
          </div>

          <div className="mt-1 max-h-[42rem] overflow-auto pr-1 space-y-3">
            {result.answers?.length ? (
              result.answers.map((ans, idx) => {
                const isCorrect = ans.is_correct;
                const qHtml = DOMPurify.sanitize(ans.question_text || "");

                return (
                  <div
                    key={idx}
                    className={
                      "rounded-xl border p-3 md:p-4 text-xs md:text-sm transition shadow-sm " +
                      (isCorrect
                        ? "bg-emerald-50/90 border-emerald-200"
                        : "bg-rose-50/90 border-rose-200")
                    }
                  >
                    {/* Question header */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-2">
                        <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-white/80 border text-[11px] font-semibold text-slate-700">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-[11px] font-semibold text-slate-500 mb-1">
                            Question {idx + 1}
                          </p>
                          <div
                            className="prose prose-sm max-w-none text-slate-900"
                            dangerouslySetInnerHTML={{ __html: qHtml }}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-[11px] font-semibold">
                        {isCorrect ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                            Correct
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-600 text-white">
                            Incorrect
                          </span>
                        )}
                        <span className="text-[10px] text-slate-700 bg-white/70 px-2 py-0.5 rounded-full border border-white/80">
                          Marks: {ans.marks_obtained}
                        </span>
                      </div>
                    </div>

                    {/* Answers */}
                    <div className="space-y-1.5 text-slate-700">
                      <p>
                        <span className="font-medium">Your answer:</span>{" "}
                        <span
                          className={
                            isCorrect
                              ? "text-emerald-700 font-semibold"
                              : "text-rose-700 font-semibold"
                          }
                        >
                          {ans.selected_answer || "No answer"}
                        </span>
                      </p>
                      <p>
                        <span className="font-medium">Correct answer:</span>{" "}
                        <span className="font-semibold text-slate-900">
                          {ans.correct_answer}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-500">
                No answer details available for this quiz.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StudentQuizResult;
