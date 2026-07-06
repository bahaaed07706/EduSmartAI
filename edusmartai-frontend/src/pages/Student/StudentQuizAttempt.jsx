// src/pages/Student/StudentQuizAttempt.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import studentApi from "../../api/studentApi";

const StudentQuizAttempt = () => {
  const { courseId, quizId, attemptId } = useParams();
  const navigate = useNavigate();
  const [attemptData, setAttemptData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    // Fetch attempt state (questions, etc.)
    studentApi.getAttempt(attemptId)
      .then(data => {
        setAttemptData(data);
        // Initialize remaining time
        if (data.end_time) {
          const endTime = new Date(data.end_time);
          const now = new Date();
          const secondsLeft = Math.floor((endTime - now) / 1000);
          setTimeLeft(secondsLeft > 0 ? secondsLeft : 0);
        }
      })
      .catch(err => {
        console.error("Failed to load attempt:", err);
        alert("Could not load quiz attempt.");
      });
  }, [attemptId]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      // Time is up: auto-submit
      handleSubmitQuiz();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return prev;
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleSelectOption = (questionId, optionId) => {
    // Save answer immediately
    studentApi.saveAnswer(attemptId, { question_id: questionId, selected_option_id: optionId })
      .then(() => {
        // Update local state selected_option_id for that question
        setAttemptData(prev => {
          if (!prev) return prev;
          const updatedQuestions = prev.questions.map(q => 
            q.id === questionId ? { ...q, selected_option_id: optionId } : q
          );
          return { ...prev, questions: updatedQuestions };
        });
      })
      .catch(err => {
        console.error("Error saving answer:", err);
      });
  };

  const handleSubmitQuiz = () => {
    if (!window.confirm("Submit quiz? Once submitted, you cannot change your answers.")) {
      return;
    }
    studentApi.submitAttempt(attemptId)
      .then(res => {
        // Navigate to results page
        navigate(`/student/courses/${courseId}/quizzes/${quizId}/result`);
      })
      .catch(err => {
        console.error("Error submitting quiz:", err);
        alert(err.response?.data?.detail || "Failed to submit quiz.");
      });
  };

  if (!attemptData) {
    return <p className="p-4">Loading quiz...</p>;
  }

  const questions = attemptData.questions;
  const currentQuestion = questions[currentIndex];

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">{attemptData.title}</h2>
      <div className="mb-4 flex justify-between items-center">
        <div className="text-gray-700">Question {currentIndex + 1} of {questions.length}</div>
        {timeLeft !== null && (
          <div className={`font-bold ${timeLeft < 60 ? "text-red-600" : ""}`}>
            Time Remaining: {formatTime(timeLeft)}
          </div>
        )}
      </div>

      <div className="mb-4">
        <p className="text-lg mb-3">{currentQuestion.question_text}</p>
        <ul>
          {currentQuestion.options.map(opt => (
            <li key={opt.id} className="mb-2">
              <label className="flex items-center cursor-pointer">
                <input 
                  type="radio" 
                  name={`q-${currentQuestion.id}`} 
                  checked={currentQuestion.selected_option_id === opt.id} 
                  onChange={() => handleSelectOption(currentQuestion.id, opt.id)} 
                  className="mr-2"
                />
                {opt.option_text}
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-between items-center">
        <button 
          type="button" 
          onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} 
          disabled={currentIndex === 0}
          className="bg-gray-200 px-4 py-2 rounded disabled:opacity-50"
        >
          Previous
        </button>
        {currentIndex < questions.length - 1 ? (
          <button 
            type="button" 
            onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Next
          </button>
        ) : (
          <button 
            type="button" 
            onClick={handleSubmitQuiz}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Submit Quiz
          </button>
        )}
      </div>
    </div>
  );
};

export default StudentQuizAttempt;
