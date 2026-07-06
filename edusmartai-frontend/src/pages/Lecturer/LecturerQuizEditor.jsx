// src/pages/Lecturer/LecturerQuizEditor.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import DOMPurify from "dompurify";

import {
  ClipboardList,
  Clock,
  CalendarRange,
  Target,
  ArrowLeft,
  BarChart3,
  PlusCircle,
  HelpCircle,
  Trash2,
  Edit3,
  CheckCircle2,
  X,
  Check,
} from "lucide-react";

import lecturerApi from "../../api/lecturerApi";
import Card from "../../components/UI/Card";
import Button from "../../components/UI/Button";
import RichTextEditor from "../../components/RichTextEditor";

const emptyOption = (idx = 0) => ({
  id: `temp-${idx}-${Date.now()}`,
  option_text: "",
  is_correct: false,
});

const LecturerQuizEditor = () => {
  const { courseId, quizId } = useParams();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create question form state
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionMarks, setNewQuestionMarks] = useState(1);
  const [newOptions, setNewOptions] = useState([
    emptyOption(0),
    emptyOption(1),
  ]);

  // Inline edit state for questions
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editingQuestionText, setEditingQuestionText] = useState("");
  const [editingQuestionMarks, setEditingQuestionMarks] = useState(1);

  // Inline edit state for options
  const [editingOptionId, setEditingOptionId] = useState(null);
  const [editingOptionText, setEditingOptionText] = useState("");

  useEffect(() => {
    loadQuizDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  const loadQuizDetails = () => {
    setLoading(true);
    lecturerApi
      .getQuizDetails(quizId)
      .then((data) => {
        setQuiz(data.quiz);
        setQuestions(data.questions || []);
      })
      .catch((err) => {
        console.error("Failed to load quiz details:", err);
        setError("Failed to load quiz details.");
      })
      .finally(() => setLoading(false));
  };

  /* ---------- Create Question ---------- */

  const handleAddOptionRow = () => {
    setNewOptions((prev) => [...prev, emptyOption(prev.length)]);
  };

  const handleNewOptionChange = (id, field, value) => {
    setNewOptions((prev) =>
      prev.map((opt) => (opt.id === id ? { ...opt, [field]: value } : opt))
    );
  };

  const handleNewOptionSetCorrect = (id) => {
    setNewOptions((prev) =>
      prev.map((opt) => ({
        ...opt,
        is_correct: opt.id === id,
      }))
    );
  };

  const handleRemoveNewOption = (id) => {
    setNewOptions((prev) => prev.filter((opt) => opt.id !== id));
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();

    const cleanedOptions = newOptions
      .map((o) => ({
        option_text: o.option_text.trim(),
        is_correct: o.is_correct,
      }))
      .filter((o) => o.option_text.length > 0);

    if (cleanedOptions.length < 2) {
      alert("Please provide at least 2 options.");
      return;
    }

    if (!cleanedOptions.some((o) => o.is_correct)) {
      alert("Please mark one option as correct.");
      return;
    }

    const questionHtml = newQuestionText?.trim();
    if (!questionHtml) {
      alert("Question text is required.");
      return;
    }

    const payload = {
      question_text: questionHtml, // HTML string
      marks: Number(newQuestionMarks),
      options: cleanedOptions,
    };

    try {
      const created = await lecturerApi.createQuizQuestion(quizId, payload);
      setQuestions((prev) => [...prev, created]);
      // reset form
      setNewQuestionText("");
      setNewQuestionMarks(1);
      setNewOptions([emptyOption(0), emptyOption(1)]);
      setShowCreatePanel(false);
    } catch (err) {
      console.error("Failed to create question:", err);
      alert("Could not create question. Please try again.");
    }
  };

  /* ---------- Edit / Delete Question ---------- */

  const startEditQuestion = (q) => {
    setEditingQuestionId(q.id);
    setEditingQuestionText(q.question_text || "");
    setEditingQuestionMarks(q.marks);
  };

  const cancelEditQuestion = () => {
    setEditingQuestionId(null);
    setEditingQuestionText("");
    setEditingQuestionMarks(1);
  };

  const saveEditQuestion = async (questionId) => {
    const questionHtml = editingQuestionText?.trim();
    if (!questionHtml) {
      alert("Question text is required.");
      return;
    }

    const payload = {
      question_text: questionHtml,
      marks: Number(editingQuestionMarks),
    };

    try {
      await lecturerApi.updateQuizQuestion(quizId, questionId, payload);
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? {
                ...q,
                question_text: payload.question_text,
                marks: payload.marks,
              }
            : q
        )
      );
      cancelEditQuestion();
    } catch (err) {
      console.error("Failed to update question:", err);
      alert("Could not update question.");
    }
  };

  const deleteQuestion = async (questionId) => {
    if (
      !window.confirm(
        "Delete this question and all its options? This cannot be undone."
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

  /* ---------- Options CRUD ---------- */

  const startEditOption = (questionId, opt) => {
    setEditingOptionId(opt.id);
    setEditingOptionText(opt.option_text);
  };

  const cancelEditOption = () => {
    setEditingOptionId(null);
    setEditingOptionText("");
  };

  const saveEditOption = async (questionId, optionId) => {
    const text = editingOptionText.trim();
    if (!text) {
      alert("Option text is required.");
      return;
    }
    try {
      await lecturerApi.updateQuizOption(optionId, {
        option_text: text,
      });
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? {
                ...q,
                options: q.options.map((o) =>
                  o.id === optionId ? { ...o, option_text: text } : o
                ),
              }
            : q
        )
      );
      cancelEditOption();
    } catch (err) {
      console.error("Failed to update option:", err);
      alert("Could not update option.");
    }
  };

  const markOptionCorrect = async (questionId, optionId) => {
    try {
      await lecturerApi.updateQuizOption(optionId, { is_correct: true });
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? {
                ...q,
                options: q.options.map((o) => ({
                  ...o,
                  is_correct: o.id === optionId,
                })),
              }
            : q
        )
      );
    } catch (err) {
      console.error("Failed to mark option correct:", err);
      alert("Could not update correct option.");
    }
  };

  const deleteOption = async (questionId, optionId) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    if (question.options.length <= 2) {
      alert("A question must have at least 2 options.");
      return;
    }

    if (
      !window.confirm(
        "Delete this option? Make sure the question still has at least one correct answer."
      )
    ) {
      return;
    }

    try {
      await lecturerApi.deleteQuizOption(optionId);
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? {
                ...q,
                options: q.options.filter((o) => o.id !== optionId),
              }
            : q
        )
      );
    } catch (err) {
      console.error("Failed to delete option:", err);
      alert("Could not delete option.");
    }
  };

  const addOptionToQuestion = async (questionId, text, isCorrect) => {
    const trimmed = text.trim();
    if (!trimmed) {
      alert("Option text is required.");
      return;
    }
    try {
      const created = await lecturerApi.createQuizOption(questionId, {
        option_text: trimmed,
        is_correct: isCorrect,
      });
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? {
                ...q,
                options: [
                  ...q.options.map((o) =>
                    isCorrect ? { ...o, is_correct: false } : o
                  ),
                  created,
                ],
              }
            : q
        )
      );
    } catch (err) {
      console.error("Failed to add option:", err);
      alert("Could not add option.");
    }
  };

  /* ---------- Derived values ---------- */

  const totalQuestions = questions.length;
  const totalMarks = questions.reduce(
    (sum, q) => sum + (Number(q.marks) || 0),
    0
  );

  /* ---------- UI ---------- */

  if (loading && !quiz) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
            <Clock className="h-5 w-5 animate-spin text-slate-400" />
          </div>
          <p className="text-sm text-slate-500">
            Loading quiz builder for you...
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

  if (!quiz) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">Quiz not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto px-3 md:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 flex flex-wrap items-center gap-2">
                Quiz Builder
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  {quiz.title}
                </span>
              </h1>
              <p className="mt-1 text-xs md:text-sm text-slate-500 flex items-center gap-2">
                <span>
                  Course #{courseId} · Quiz ID {quizId}
                </span>
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-400">
                  <HelpCircle className="h-3 w-3" />
                  Manage questions, options, and marks for this quiz.
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <Link
              to={`/lecturer/courses/${courseId}/quizzes`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Quizzes
            </Link>
            <Link
              to={`/lecturer/courses/${courseId}/quizzes/${quizId}/results`}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              View Results
            </Link>
          </div>
        </div>

        {/* Quiz summary + stats */}
        <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
          <Card className="relative overflow-hidden bg-white/90 backdrop-blur-sm border border-slate-100">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-50" />
            <div className="relative space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                  <ClipboardList className="h-3.5 w-3.5" />
                </span>
                Quiz overview
              </p>

              <div className="grid gap-3 md:grid-cols-4 text-xs md:text-sm">
                <div>
                  <p className="text-[11px] uppercase text-slate-500">
                    Description
                  </p>
                  <p className="mt-1 text-slate-800">
                    {quiz.description || "No description provided."}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-500 flex items-center gap-1">
                    <CalendarRange className="h-3.5 w-3.5" />
                    Availability
                  </p>
                  <p className="mt-1 text-slate-800 text-xs md:text-[13px]">
                    {quiz.start_date
                      ? new Date(quiz.start_date).toLocaleString()
                      : "—"}{" "}
                    –{" "}
                    {quiz.end_date
                      ? new Date(quiz.end_date).toLocaleString()
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-500 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Duration
                  </p>
                  <p className="mt-1 text-slate-800">
                    {quiz.duration_minutes
                      ? `${quiz.duration_minutes} min`
                      : "No limit"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-slate-500 flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" />
                    Max Marks
                  </p>
                  <p className="mt-1 text-slate-800">{quiz.max_marks}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900 text-slate-50 border-none shadow-md">
            <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-2">
              Quick stats
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Questions
                </span>
                <span className="font-semibold text-slate-50">
                  {totalQuestions}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-200">
                  <Target className="h-4 w-4 text-sky-400" />
                  Sum of marks
                </span>
                <span className="font-semibold text-sky-100">
                  {totalMarks}
                </span>
              </div>
              <div className="mt-3 text-[11px] text-slate-400 leading-relaxed">
                Tip: Keep the total marks close to the quiz{" "}
                <span className="font-semibold text-slate-100">
                  Max Marks ({quiz.max_marks})
                </span>{" "}
                for a balanced assessment.
              </div>
            </div>
          </Card>
        </div>

        {/* Create Question Panel */}
        <Card className="bg-white/90 backdrop-blur-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-base font-semibold text-slate-900">
                Question bank
              </h2>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                {totalQuestions} questions
              </span>
            </div>
            <Button
              size="sm"
              className="flex items-center gap-2 text-xs"
              type="button"
              onClick={() => setShowCreatePanel((v) => !v)}
            >
              <PlusCircle className="h-4 w-4" />
              {showCreatePanel ? "Close" : "Add question"}
            </Button>
          </div>

          {showCreatePanel && (
            <form
              onSubmit={handleCreateQuestion}
              className="mt-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Question text
                </label>
                <div className="rounded-xl border border-slate-200 bg-white">
                  <RichTextEditor
                    value={newQuestionText}
                    onChange={setNewQuestionText}
                    placeholder="Type your question here. You can format text, add images, math, etc."
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Marks
                  </label>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={newQuestionMarks}
                    onChange={(e) => setNewQuestionMarks(e.target.value)}
                    required
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Fractional marks are allowed (e.g. 0.5).
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Options
                  </label>
                  <button
                    type="button"
                    onClick={handleAddOptionRow}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Add option
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  At least 2 options are required, and exactly one must be
                  marked as correct.
                </p>

                <div className="space-y-2">
                  {newOptions.map((opt) => (
                    <div
                      key={opt.id}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
                    >
                      <input
                        type="radio"
                        name="newCorrect"
                        checked={opt.is_correct}
                        onChange={() => handleNewOptionSetCorrect(opt.id)}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      <input
                        type="text"
                        className="flex-1 border-none bg-transparent text-sm focus:outline-none"
                        placeholder="Option text"
                        value={opt.option_text}
                        onChange={(e) =>
                          handleNewOptionChange(
                            opt.id,
                            "option_text",
                            e.target.value
                          )
                        }
                      />
                      {newOptions.length > 2 && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-red-100 px-2 py-0.5 text-[11px] text-red-600 hover:bg-red-50"
                          onClick={() => handleRemoveNewOption(opt.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreatePanel(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Save question
                </Button>
              </div>
            </form>
          )}
        </Card>

        {/* Existing Questions */}
        <div className="space-y-4">
          {questions.length === 0 ? (
            <Card className="border border-dashed border-slate-200 bg-white/80">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                  <HelpCircle className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    No questions yet
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click “Add question” above to start building this quiz.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            questions.map((q, index) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={index}
                // question edit state + setters
                editingQuestionId={editingQuestionId}
                editingQuestionText={editingQuestionText}
                editingQuestionMarks={editingQuestionMarks}
                setEditingQuestionText={setEditingQuestionText}
                setEditingQuestionMarks={setEditingQuestionMarks}
                startEditQuestion={startEditQuestion}
                cancelEditQuestion={cancelEditQuestion}
                saveEditQuestion={saveEditQuestion}
                deleteQuestion={deleteQuestion}
                // option edit state + setters
                editingOptionId={editingOptionId}
                editingOptionText={editingOptionText}
                setEditingOptionText={setEditingOptionText}
                startEditOption={startEditOption}
                cancelEditOption={cancelEditOption}
                saveEditOption={saveEditOption}
                markOptionCorrect={markOptionCorrect}
                deleteOption={deleteOption}
                addOptionToQuestion={addOptionToQuestion}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------- Child Component: QuestionCard ---------- */

const QuestionCard = ({
  question,
  index,
  editingQuestionId,
  editingQuestionText,
  editingQuestionMarks,
  setEditingQuestionText,
  setEditingQuestionMarks,
  startEditQuestion,
  cancelEditQuestion,
  saveEditQuestion,
  deleteQuestion,
  editingOptionId,
  editingOptionText,
  setEditingOptionText,
  startEditOption,
  cancelEditOption,
  saveEditOption,
  markOptionCorrect,
  deleteOption,
  addOptionToQuestion,
}) => {
  const [newOptionText, setNewOptionText] = useState("");
  const [newOptionCorrect, setNewOptionCorrect] = useState(false);

  const isEditing = editingQuestionId === question.id;

  const handleAddOption = () => {
    addOptionToQuestion(question.id, newOptionText, newOptionCorrect);
    setNewOptionText("");
    setNewOptionCorrect(false);
  };

  const questionHtml = DOMPurify.sanitize(question.question_text || "");

  return (
    <Card className="border border-slate-100 bg-white/90 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-3">
        <div className="flex-1">
          {isEditing ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-semibold">
                  {index + 1}
                </span>
                <span className="text-xs font-medium text-slate-500 uppercase">
                  Editing question
                </span>
              </div>
              <label className="block text-xs text-slate-500 mb-1">
                Question text
              </label>
              <div className="rounded-xl border border-slate-200 bg-white">
                <RichTextEditor
                  value={editingQuestionText}
                  onChange={setEditingQuestionText}
                  placeholder="Update the question..."
                />
              </div>
              <div className="mt-3">
                <label className="block text-xs text-slate-500 mb-1">
                  Marks
                </label>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  className="w-24 rounded-xl border border-slate-200 px-2 py-1 text-sm shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={editingQuestionMarks}
                  onChange={(e) => setEditingQuestionMarks(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-semibold">
                  {index + 1}
                </span>
                <span className="text-[11px] uppercase tracking-wide text-slate-500">
                  Question
                </span>
              </div>
              <div
                className="prose prose-sm max-w-none text-slate-800"
                dangerouslySetInnerHTML={{ __html: questionHtml }}
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Question ID {question.id}
              </p>
            </>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 text-sm">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
            <Target className="h-3.5 w-3.5 text-slate-700" />
            Marks: {question.marks}
          </span>
          {isEditing ? (
            <div className="flex gap-1">
              <button
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                onClick={cancelEditQuestion}
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
              <button
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
                onClick={() => saveEditQuestion(question.id)}
              >
                <Check className="h-3.5 w-3.5" />
                Save
              </button>
            </div>
          ) : (
            <div className="flex gap-1">
              <button
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                onClick={() => startEditQuestion(question)}
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit
              </button>
              <button
                className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-1 text-[11px] text-red-600 hover:bg-red-50"
                onClick={() => deleteQuestion(question.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="mt-3 border-t border-slate-100 pt-3">
        <p className="mb-2 text-xs font-semibold text-slate-700">Options</p>
        <div className="space-y-2">
          {question.options.map((opt) => {
            const isOptEditing = editingOptionId === opt.id;
            return (
              <div
                key={opt.id}
                className={`flex flex-col md:flex-row md:items-center gap-2 rounded-xl border px-3 py-2 ${
                  opt.is_correct
                    ? "border-emerald-200 bg-emerald-50/60"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2 flex-1">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      opt.is_correct ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  />
                  {isOptEditing ? (
                    <input
                      type="text"
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={editingOptionText}
                      onChange={(e) => setEditingOptionText(e.target.value)}
                    />
                  ) : (
                    <span className="flex-1 text-sm text-slate-800">
                      {opt.option_text}
                      {opt.is_correct && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Correct answer
                        </span>
                      )}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1 text-[11px]">
                  {!isOptEditing && (
                    <>
                      <button
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-50"
                        onClick={() => markOptionCorrect(question.id, opt.id)}
                      >
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        Set correct
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-50"
                        onClick={() => startEditOption(question.id, opt)}
                      >
                        <Edit3 className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-white px-2 py-0.5 text-[11px] text-red-600 hover:bg-red-50"
                        onClick={() => deleteOption(question.id, opt.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </>
                  )}
                  {isOptEditing && (
                    <>
                      <button
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-50"
                        onClick={cancelEditOption}
                      >
                        <X className="h-3 w-3" />
                        Cancel
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-emerald-700"
                        onClick={() => saveEditOption(question.id, opt.id)}
                      >
                        <Check className="h-3 w-3" />
                        Save
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add option inline */}
        <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-3 py-3 flex flex-col md:flex-row md:items-center gap-2">
          <input
            type="text"
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Add new option..."
            value={newOptionText}
            onChange={(e) => setNewOptionText(e.target.value)}
          />
          <label className="flex items-center gap-1 text-[11px] text-slate-700">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 text-emerald-600 focus:ring-emerald-500"
              checked={newOptionCorrect}
              onChange={(e) => setNewOptionCorrect(e.target.checked)}
            />
            Mark as correct
          </label>
          <button
            type="button"
            onClick={handleAddOption}
            className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-slate-950"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Add option
          </button>
        </div>
      </div>
    </Card>
  );
};

export default LecturerQuizEditor;
