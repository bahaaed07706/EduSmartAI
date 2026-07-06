// src/components/chat/StudentChatbotDrawer.jsx

import React, { useEffect, useRef, useState } from "react";
import studentApi from "../../api/studentApi";
import Button from "../UI/Button";

const SEMESTER_ID_KEY = "edusmart_selected_semester_id";
const SEMESTER_LABEL_KEY = "edusmart_selected_semester_label";

const StudentChatbotDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSemesterId, setSelectedSemesterId] = useState(null);
  const [selectedSemesterLabel, setSelectedSemesterLabel] = useState(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // read initial semester from localStorage
  useEffect(() => {
    try {
      const rawId = localStorage.getItem(SEMESTER_ID_KEY);
      const rawLabel = localStorage.getItem(SEMESTER_LABEL_KEY);
      if (rawId) {
        const num = Number(rawId);
        if (!Number.isNaN(num)) {
          setSelectedSemesterId(num);
        }
      }
      if (rawLabel) {
        setSelectedSemesterLabel(rawLabel);
      }
    } catch {
      // ignore
    }
  }, []);

  // listen for events from StudentHome
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);

    const handleSemesterChanged = (event) => {
      const detail = event.detail || {};
      setSelectedSemesterId(
        typeof detail.semesterId === "number" ? detail.semesterId : null
      );
      setSelectedSemesterLabel(detail.label || null);
    };

    window.addEventListener("open-chatbot", handleOpen);
    window.addEventListener("semester-changed", handleSemesterChanged);

    return () => {
      window.removeEventListener("open-chatbot", handleOpen);
      window.removeEventListener("semester-changed", handleSemesterChanged);
    };
  }, []);

  // auto-scroll
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage = {
      role: "user",
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    let semesterId = null;
    try {
      const raw = localStorage.getItem(SEMESTER_ID_KEY);
      if (raw) {
        const n = Number(raw);
        if (!Number.isNaN(n)) semesterId = n;
      }
    } catch {
      // ignore
    }

    try {
      const res = await studentApi.askChatbot({
        message: trimmed,
        semester_id: semesterId,
      });

      const payload = res || {};
      const answer =
        payload.answer ||
        "I couldn't understand the response from the assistant.";

      const assistantMessage = {
        role: "assistant",
        text: answer,
        suggested_actions: payload.suggested_actions || [],
        data: payload.data || null,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("EduSmartAI chatbot error", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            "Sorry, something went wrong while contacting EduSmartAI assistant.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* overlay */}
      <div
        className="flex-1 bg-black/30"
        onClick={() => setIsOpen(false)}
      ></div>

      {/* drawer */}
      <div className="w-full max-w-md bg-white shadow-xl flex flex-col">
        {/* header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-primary/70 font-semibold">
              EduSmartAI Assistant
            </p>
            <p className="text-[11px] text-slate-500">
              {selectedSemesterLabel
                ? `Answers are focused on ${selectedSemesterLabel}.`
                : "No semester selected – answers use the current semester."}
            </p>
          </div>
          <Button size="sm" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>

        {/* messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
          {messages.length === 0 ? (
            <p className="text-xs text-slate-500">
              Ask about your grades, attendance, quizzes, or how to improve.
            </p>
          ) : (
            messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {m.text}

                  {m.role === "assistant" &&
                    m.suggested_actions &&
                    m.suggested_actions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {m.suggested_actions.map((action) => (
                          <button
                            key={action}
                            type="button"
                            className="text-[10px] bg-white/70 border border-slate-200 rounded-full px-2 py-0.5 hover:bg-white"
                            onClick={() => {
                              // just fill the input with the action
                              setInput(action.replace(/_/g, " "));
                            }}
                          >
                            {action.replace(/_/g, " ")}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* input */}
        <div className="border-t border-slate-200 p-3 space-y-2">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            placeholder="Ask about your courses, grades, attendance, or how to improve..."
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] text-slate-400">
              Enter to send, Shift+Enter for a new line.
            </p>
            <Button size="sm" onClick={sendMessage} disabled={loading}>
              {loading ? "Thinking..." : "Send"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentChatbotDrawer;
