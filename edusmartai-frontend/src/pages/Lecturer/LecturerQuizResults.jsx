// src/pages/Lecturer/LecturerQuizResults.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Users,
  Trophy,
  Gauge,
  TrendingUp,
  TrendingDown,
  Target,
  HelpCircle,
} from "lucide-react";

import lecturerApi from "../../api/lecturerApi";
import Card from "../../components/UI/Card";


const LecturerQuizResults = () => {
  const { courseId, quizId } = useParams();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    lecturerApi
      .getQuizResults(quizId)
      .then((data) => {
        setResults(data);
      })
      .catch((err) => {
        console.error("Failed to load quiz results:", err);
        setError("Failed to load quiz results.");
      })
      .finally(() => setLoading(false));
  }, [quizId]);

  const derived = useMemo(() => {
    if (!results) {
      return {
        totalStudents: 0,
        attemptedCount: 0,
        highCount: 0,
        midCount: 0,
        lowCount: 0,
        averagePercent: null,
      };
    }

    const { students = [], average_score, max_marks } = results;

    const numericScores = students.filter(
      (s) => typeof s.score === "number"
    );
    const totalStudents = students.length;
    const attemptedCount = numericScores.length;

    const highCount =
      max_marks && max_marks > 0
        ? numericScores.filter((s) => s.score >= 0.8 * max_marks).length
        : 0;
    const lowCount =
      max_marks && max_marks > 0
        ? numericScores.filter((s) => s.score < 0.5 * max_marks).length
        : 0;
    const midCount = Math.max(attemptedCount - highCount - lowCount, 0);

    const averagePercent =
      average_score != null && max_marks > 0
        ? (average_score / max_marks) * 100
        : null;

    return {
      totalStudents,
      attemptedCount,
      highCount,
      midCount,
      lowCount,
      averagePercent,
    };
  }, [results]);

  if (loading && !results) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
            <Gauge className="h-5 w-5 animate-spin text-slate-400" />
          </div>
          <p className="text-sm text-slate-500">
            Loading quiz analytics and results...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">No results available.</p>
      </div>
    );
  }

  const {
    quiz_title,
    max_marks,
    average_score,
    min_score,
    max_score,
    students = [],
    questions_difficulty = [],
  } = results;

  const {
    totalStudents,
    attemptedCount,
    highCount,
    midCount,
    lowCount,
    averagePercent,
  } = derived;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto px-3 md:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 flex flex-wrap items-center gap-2">
                Quiz Analytics
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  {quiz_title}
                </span>
              </h1>
              <p className="mt-1 text-xs md:text-sm text-slate-500 flex flex-wrap items-center gap-2">
                <span>
                  Course #{courseId} · Quiz ID {quizId}
                </span>
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-400">
                  <HelpCircle className="h-3 w-3" />
                  Overview of student performance and question difficulty.
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <Link
              to={`/lecturer/courses/${courseId}/quizzes/${quizId}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Questions
            </Link>
          </div>
        </div>

        {/* Summary cards row */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="relative overflow-hidden bg-white/90 border border-slate-100">
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-indigo-50" />
            <div className="relative space-y-1">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 flex items-center gap-1">
                <Target className="h-3.5 w-3.5" />
                Max Marks
              </p>
              <p className="text-2xl font-semibold text-slate-900">
                {max_marks}
              </p>
              <p className="text-[11px] text-slate-400">
                Maximum possible score for this quiz.
              </p>
            </div>
          </Card>

          <Card className="bg-slate-900 text-slate-50 border-none shadow-md">
            <p className="text-[11px] uppercase tracking-wide text-slate-400 flex items-center gap-1 mb-1">
              <Gauge className="h-3.5 w-3.5" />
              Average Score
            </p>
            <p className="text-2xl font-semibold">
              {average_score != null ? average_score.toFixed(2) : "—"}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {averagePercent != null
                ? `${averagePercent.toFixed(1)}% of max marks`
                : "Average percentage not available."}
            </p>
          </Card>

          <Card className="bg-white/90 border border-slate-100">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 flex items-center gap-1 mb-1">
              <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
              Min Score
            </p>
            <p className="text-2xl font-semibold text-slate-900">
              {min_score != null ? min_score : "—"}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Lowest score achieved among attempts.
            </p>
          </Card>

          <Card className="bg-white/90 border border-slate-100">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 flex items-center gap-1 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              Max Score
            </p>
            <p className="text-2xl font-semibold text-slate-900">
              {max_score != null ? max_score : "—"}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Highest score achieved among attempts.
            </p>
          </Card>
        </div>

        {/* Secondary stats: cohorts */}
        <Card className="border border-slate-100 bg-white/90">
          <div className="grid gap-4 md:grid-cols-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] uppercase text-slate-500">
                  Total Students
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {totalStudents}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] uppercase text-slate-500">
                  Attempted
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {attemptedCount}
                  {totalStudents > 0 && (
                    <span className="ml-2 text-[11px] text-slate-500">
                      (
                      {(
                        (attemptedCount / Math.max(totalStudents, 1)) *
                        100
                      ).toFixed(1)}
                      %)
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Trophy className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] uppercase text-slate-500">
                  High Performers
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {highCount}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                <TrendingDown className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] uppercase text-slate-500">
                  Needs Support
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {lowCount}
                </p>
                <p className="text-[11px] text-slate-400">
                  Scores below 50% of max marks.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Main content: Students & Question difficulty */}
        <div className="grid gap-4 lg:grid-cols-[2fr,1.5fr]">
          {/* Students table */}
          <Card className="border border-slate-100 bg-white/90 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white">
                  <Users className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Student performance
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Scores per student for this quiz.
                  </p>
                </div>
              </div>
            </div>

            {students && students.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-medium">Student</th>
                      <th className="px-3 py-2 font-medium">Score</th>
                      <th className="px-3 py-2 font-medium">Relative</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {students.map((s) => {
                      const score = s.score;
                      const percent =
                        typeof score === "number" && max_marks > 0
                          ? (score / max_marks) * 100
                          : null;

                      let badgeColor =
                        "bg-slate-100 text-slate-700 border-slate-200";
                      if (percent != null) {
                        if (percent >= 80) {
                          badgeColor =
                            "bg-emerald-50 text-emerald-700 border-emerald-200";
                        } else if (percent < 50) {
                          badgeColor =
                            "bg-rose-50 text-rose-700 border-rose-200";
                        } else {
                          badgeColor =
                            "bg-amber-50 text-amber-700 border-amber-200";
                        }
                      }

                      return (
                        <tr key={s.student_id} className="hover:bg-slate-50/60">
                          <td className="px-3 py-2 text-slate-800">
                            {s.student_name}
                          </td>
                          <td className="px-3 py-2 text-slate-800">
                            {score != null ? score : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {percent != null ? (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${badgeColor}`}
                              >
                                {percent.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                No score yet
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center">
                <p className="text-sm font-medium text-slate-700">
                  No student attempts yet
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Once students submit this quiz, their scores will appear here.
                </p>
              </div>
            )}
          </Card>

          {/* Question difficulty */}
          <Card className="border border-slate-100 bg-white/90 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <Target className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Question difficulty
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Correct answer rate per question.
                  </p>
                </div>
              </div>
            </div>

            {questions_difficulty && questions_difficulty.length > 0 ? (
              <div className="space-y-3">
                {questions_difficulty.map((q, idx) => {
                  const pct =
                    typeof q.correct_percentage === "number"
                      ? q.correct_percentage
                      : null;

                  let difficultyLabel = "Medium";
                  let difficultyColor = "text-amber-700 bg-amber-50";
                  if (pct != null) {
                    if (pct >= 80) {
                      difficultyLabel = "Easy";
                      difficultyColor = "text-emerald-700 bg-emerald-50";
                    } else if (pct < 40) {
                      difficultyLabel = "Hard";
                      difficultyColor = "text-rose-700 bg-rose-50";
                    }
                  }

                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-slate-800 line-clamp-2">
                          Q{idx + 1}. {q.question_text}
                        </p>
                        <span
                          className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${difficultyColor}`}
                        >
                          {difficultyLabel}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-2 rounded-full bg-emerald-500"
                            style={{
                              width:
                                pct != null
                                  ? `${Math.max(
                                      0,
                                      Math.min(100, pct)
                                    )}%`
                                  : "0%",
                            }}
                          />
                        </div>
                        <span className="w-16 text-right text-[11px] text-slate-600">
                          {pct != null ? `${pct.toFixed(1)}%` : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center">
                <p className="text-sm font-medium text-slate-700">
                  No difficulty stats yet
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Stats appear after enough student attempts on this quiz.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LecturerQuizResults;
