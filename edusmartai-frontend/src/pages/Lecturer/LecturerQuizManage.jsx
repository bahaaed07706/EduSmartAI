// src/pages/Lecturer/LecturerQuizManage.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import DOMPurify from "dompurify";

import lecturerApi from "../../api/lecturerApi";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";

import {
  FileQuestion,
  PlusCircle,
  Trash2,
  Clock,
  Target,
  ArrowLeft,
  ListChecks,
} from "lucide-react";

const LecturerQuizManage = () => {
  const { courseId, quizId } = useParams();

  const [quizInfo, setQuizInfo] = useState(null);
  const [questions, setQuestions] = useState([]);

  const [newQuestion, setNewQuestion] = useState({
    question_text: "",
    marks: 1,
  });
  const [newOptions, setNewOptions] = useState([
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);
  const [correctIndex, setCorrectIndex] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ----------------- Load quiz data -----------------

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await lecturerApi.getQuizDetails(quizId);
        setQuizInfo(data.quiz || null);
        setQuestions(Array.isArray(data.questions) ? data.questions : []);
      } catch (err) {
        console.error("Failed to load quiz details:", err);
        setError("Failed to load quiz details.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [quizId]);

  // ----------------- Form handlers -----------------

  const handleQuestionInput = (e) => {
    const { name, value } = e.target;
    setNewQuestion((prev) => ({ ...prev, [name]: value }));
  };

  const handleOptionTextChange = (index, value) => {
    setNewOptions((prev) => {
      const opts = [...prev];
      opts[index].text = value;
      return opts;
    });
  };

  const handleAddOptionField = () => {
    setNewOptions((prev) => [...prev, { text: "", isCorrect: false }]);
  };

  const handleRemoveOptionField = (index) => {
    setNewOptions((prev) => prev.filter((_, i) => i !== index));
    if (correctIndex === index) {
      setCorrectIndex(null);
    } else if (correctIndex !== null && index < correctIndex) {
      setCorrectIndex((prev) => prev - 1);
    }
  };

  const handleOptionCorrectSelect = (index) => {
    setCorrectIndex(index);
  };

  const resetForm = () => {
    setNewQuestion({ question_text: "", marks: 1 });
    setNewOptions([
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ]);
    setCorrectIndex(null);
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();

    if (!newQuestion.question_text.trim()) {
      alert("Question text is required.");
      return;
    }

    if (correctIndex === null) {
      alert("Please mark one option as correct.");
      return;
    }

    const optionsPayload = newOptions.map((opt, idx) => ({
      option_text: opt.text.trim(),
      is_correct: idx === correctIndex,
    }));

    if (optionsPayload.some((o) => !o.option_text)) {
      alert("All options must have text.");
      return;
    }

    if (optionsPayload.length < 2) {
      alert("Please provide at least 2 options.");
      return;
    }

    const payload = {
      question_text: newQuestion.question_text.trim(),
      marks: Number(newQuestion.marks) || 1,
      options: optionsPayload,
    };

    try {
      setSaving(true);
      setError("");
      // Use the same API style as in LecturerQuizEditor
      const createdQ = await lecturerApi.createQuizQuestion(quizId, payload);
      setQuestions((prev) => [...prev, createdQ]);
      resetForm();
    } catch (err) {
      console.error("Failed to add question:", err);
      alert(
        err?.response?.data?.detail || "Error adding question. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (
      !window.confirm(
        "Delete this question? All options (and any student answers) will be removed."
      )
    ) {
      return;
    }

    try {
      await lecturerApi.deleteQuizQuestion(quizId, questionId);
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    } catch (err) {
      console.error("Failed to delete question:", err);
      alert("Could not delete question.");
    }
  };

  // ----------------- Render helpers -----------------

  const renderQuizMeta = () => {
    if (!quizInfo) return null;

    const start = quizInfo.start_date
      ? new Date(quizInfo.start_date).toLocaleString()
      : "—";
    const end = quizInfo.end_date
      ? new Date(quizInfo.end_date).toLocaleString()
      : "—";

    return (
      <Card className="border border-slate-100 bg-white/90 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
              <FileQuestion className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900">
                Manage Quiz Questions
              </h1>
              <p className="mt-1 text-xs md:text-sm text-slate-500">
                {quizInfo.title || "Untitled quiz"} · Course #{courseId} · Quiz
                ID {quizId}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <Link
              to={`/lecturer/courses/${courseId}/quizzes/${quizId}/results`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300"
            >
              <ListChecks className="h-3.5 w-3.5" />
              View Results
            </Link>
            <Link
              to={`/lecturer/courses/${courseId}/quizzes`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Quizzes
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs md:text-sm">
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <Clock className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Availability
              </p>
              <p className="text-slate-800">
                {start} – {end}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <Target className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Max Marks
              </p>
              <p className="text-slate-800">{quizInfo.max_marks}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <Clock className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Duration
              </p>
              <p className="text-slate-800">
                {quizInfo.duration_minutes
                  ? `${quizInfo.duration_minutes} min`
                  : "No time limit"}
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  // ----------------- Main render -----------------

  if (loading && !quizInfo) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
            <Clock className="h-5 w-5 animate-spin text-slate-400" />
          </div>
          <p className="text-sm text-slate-500">Loading quiz details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100">
      <div className="mx-auto max-w-5xl px-3 md:px-6 py-6 space-y-6">
        {/* Error banner */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Quiz meta */}
        {renderQuizMeta()}

        {/* Existing Questions */}
        <Card className="border border-slate-100 bg-white/90 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white">
                <FileQuestion className="h-3.5 w-3.5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Existing questions
                </h2>
                <p className="text-[11px] text-slate-500">
                  Review and clean up your current questions before adding more.
                </p>
              </div>
            </div>
            <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500">
              {questions.length} question{questions.length !== 1 && "s"}
            </span>
          </div>

          {questions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center">
              <p className="text-sm font-medium text-slate-700">
                No questions yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Use the form below to add your first question to this quiz.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, qi) => {
                const safeHtml = DOMPurify.sanitize(q.question_text || "");
                return (
                  <div
                    key={q.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-xs">
                            {qi + 1}
                          </span>
                          <div
                            className="prose prose-sm max-w-none text-slate-800"
                            dangerouslySetInnerHTML={{ __html: safeHtml }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Question ID {q.id} · {q.marks} mark
                          {q.marks !== 1 && "s"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>

                    {q.options && q.options.length > 0 && (
                      <ul className="mt-2 ml-8 space-y-1 text-xs">
                        {q.options.map((opt) => (
                          <li
                            key={opt.id}
                            className={`flex items-center gap-2 rounded-lg px-2 py-1 ${
                              opt.is_correct
                                ? "bg-emerald-50 text-emerald-800"
                                : "bg-white text-slate-700 border border-slate-100"
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                opt.is_correct
                                  ? "bg-emerald-500"
                                  : "bg-slate-300"
                              }`}
                            />
                            <span className="flex-1">{opt.option_text}</span>
                            {opt.is_correct && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                Correct
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Add Question Form */}
        <Card className="border border-slate-100 bg-white/95 shadow-sm">
          <form onSubmit={handleAddQuestion} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <PlusCircle className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Add new question
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Define the question text, marks, and options (single
                    correct answer).
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Question text
              </label>
              <textarea
                name="question_text"
                value={newQuestion.question_text}
                onChange={handleQuestionInput}
                required
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Type your question here..."
              />
            </div>

            <div className="w-full sm:w-40">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Points (marks)
              </label>
              <input
                type="number"
                name="marks"
                min={0.5}
                step={0.5}
                value={newQuestion.marks}
                onChange={handleQuestionInput}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">
                  Options
                </label>
                <button
                  type="button"
                  onClick={handleAddOptionField}
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:underline"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Add option
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                Provide at least 2 options and mark exactly one as correct.
              </p>

              <div className="space-y-2">
                {newOptions.map((opt, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center"
                  >
                    <div className="flex-1">
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) =>
                          handleOptionTextChange(idx, e.target.value)
                        }
                        placeholder={`Option ${idx + 1}`}
                        required
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-1 text-xs text-slate-700">
                        <input
                          type="radio"
                          name="correctOption"
                          checked={correctIndex === idx}
                          onChange={() => handleOptionCorrectSelect(idx)}
                        />
                        Mark as correct
                      </label>
                      {newOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOptionField(idx)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={resetForm}
                disabled={saving}
              >
                Reset
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Adding..." : "Add Question"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default LecturerQuizManage;
