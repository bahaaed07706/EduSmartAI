// src/components/Chatbot/ChatbotWidget.jsx
import React, { useState, useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import Button from "../UI/Button";
import chatbotApi from "../../api/chatbotApi";

// نفس الماب المستخدم في StudentChatbotPage
const SUGGESTED_ACTIONS = {
  get_current_courses: {
    label: "Show my current courses",
    prompt: "What courses am I taking this semester?",
  },
  get_all_grades: {
    label: "Show all my grades",
    prompt: "Show all my grades",
  },
  get_attendance_overall: {
    label: "Show my attendance",
    prompt: "Show my attendance",
  },
  get_upcoming_assessments: {
    label: "Show upcoming assessments",
    prompt: "What upcoming assessments do I have?",
  },
  get_improvement_advice: {
    label: "Help me improve",
    prompt: "Help me improve my performance",
  },
  get_evaluation_summary: {
    label: "Show my evaluation",
    prompt: "Show my evaluation",
  },
  get_quiz_attempts: {
    label: "Show my quiz attempts",
    prompt: "Show my quiz attempts",
  },
};

const createBotMessage = (text, chips = []) => ({
  id: `bot-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  sender: "bot",
  text,
  chips, // [{ key, label }]
});

const createUserMessage = (text) => ({
  id: `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  sender: "user",
  text,
});

const ChatbotWidget = () => {
  const [open, setOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [messages, setMessages] = useState([]);
  const [scenarioStep, setScenarioStep] = useState("q1"); // "q1" | "q2" | "done"
  const [assistantEnabled, setAssistantEnabled] = useState(false);

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);

  // Init Q1 when widget mounts
  useEffect(() => {
    const initial = createBotMessage(
      "Hi! Would you like to see your evaluation based on your courses and activity? (Yes / No)"
    );
    setMessages([initial]);
    setScenarioStep("q1");
    setAssistantEnabled(false);
  }, []);

  // Auto scroll when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isSending]);

  const buildChipsFromSuggested = (suggested) => {
    if (!suggested || !suggested.length) return [];
    return suggested
      .map((actionKey) => {
        const config = SUGGESTED_ACTIONS[actionKey];
        if (!config) return null;
        return { key: actionKey, label: config.label || actionKey };
      })
      .filter(Boolean);
  };

  // Generic backend call
  const sendToBackend = async (text) => {
    setIsSending(true);
    setError("");

    const userMsg = createUserMessage(text);
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await chatbotApi.query(text); // يستخدم /chatbot/query
      const chips = buildChipsFromSuggested(res.suggested_actions || []);
      const botMsg = createBotMessage(
        res.answer || "I received your message.",
        chips
      );
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Chatbot error:", err);
      const fallback = createBotMessage(
        "Sorry, something went wrong while contacting the assistant. Please try again."
      );
      setMessages((prev) => [...prev, fallback]);
      setError("Failed to contact the chatbot. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // Q1: "Would you like to see your evaluation? (Yes / No)"
  const handleQ1Answer = async (answer) => {
    if (isSending) return;

    if (answer === "No") {
      const userMsg = createUserMessage("No");
      const skipMsg = createBotMessage("Okay, I’ll skip your evaluation.");
      const q2Msg = createBotMessage(
        "Would you like me to help you improve yourself? (Yes / No)"
      );

      setMessages((prev) => [...prev, userMsg, skipMsg, q2Msg]);
      setScenarioStep("q2");
      return;
    }

    // Yes -> call evaluation
    setIsSending(true);
    setError("");

    const userMsg = createUserMessage("Yes");
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await chatbotApi.query("Show my evaluation");
      const chips = buildChipsFromSuggested(res.suggested_actions || []);
      const evalMsg = createBotMessage(
        res.answer || "Here is your evaluation.",
        chips
      );

      const q2Msg = createBotMessage(
        "Would you like me to help you improve yourself? (Yes / No)"
      );

      setMessages((prev) => [...prev, evalMsg, q2Msg]);
      setScenarioStep("q2");
    } catch (err) {
      console.error("Evaluation error:", err);
      const fallback = createBotMessage(
        "Sorry, I couldn’t load your evaluation right now. You can try again later."
      );
      const q2Msg = createBotMessage(
        "Would you like me to help you improve yourself? (Yes / No)"
      );
      setMessages((prev) => [...prev, fallback, q2Msg]);
      setScenarioStep("q2");
      setError("Failed to load evaluation.");
    } finally {
      setIsSending(false);
    }
  };

  // Q2: "Would you like me to help you improve yourself? (Yes / No)"
  const handleQ2Answer = async (answer) => {
    if (isSending) return;

    if (answer === "No") {
      const userMsg = createUserMessage("No");
      const botMsg = createBotMessage(
        "No problem. You can always come back and chat with me later."
      );
      setMessages((prev) => [...prev, userMsg, botMsg]);
      setScenarioStep("done");
      setAssistantEnabled(true); // نسمح بالشات الحر حتى لو قال لا
      return;
    }

    // Yes -> improvement advice
    setIsSending(true);
    setError("");

    const userMsg = createUserMessage("Yes");
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await chatbotApi.query("Help me improve my performance");
      const chips = buildChipsFromSuggested(res.suggested_actions || []);
      const botMsg = createBotMessage(
        res.answer || "Here are some suggestions to improve yourself:",
        chips
      );

      setMessages((prev) => [...prev, botMsg]);
      setScenarioStep("done");
      setAssistantEnabled(true);
    } catch (err) {
      console.error("Improvement advice error:", err);
      const fallback = createBotMessage(
        "Sorry, I couldn’t generate improvement advice right now. You can still ask me questions about your courses."
      );
      setMessages((prev) => [...prev, fallback]);
      setScenarioStep("done");
      setAssistantEnabled(true);
      setError("Failed to load improvement advice.");
    } finally {
      setIsSending(false);
    }
  };

  // Assistant free text
  const handleSend = async () => {
    if (!assistantEnabled || isSending) return;
    const trimmed = input.trim();
    if (!trimmed) return;

    setInput("");
    await sendToBackend(trimmed);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  // Chips under messages (suggested_actions)
  const handleChipClick = async (actionKey) => {
    if (isSending) return;
    const config = SUGGESTED_ACTIONS[actionKey];
    const prompt = config?.prompt || actionKey;
    await sendToBackend(prompt);
    setScenarioStep("done");
    setAssistantEnabled(true);
  };

  const toggleOpen = () => {
    setOpen((prev) => !prev);
    if (!open) {
      setIsFullscreen(false);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  const showQ1Buttons = scenarioStep === "q1";
  const showQ2Buttons = scenarioStep === "q2";
  const inputDisabled = !assistantEnabled || isSending;

  // Layout (مشابه لواجهة ChatGPT – ألوان داكنة ولهجة تركواز)
  const outerContainerClass = isFullscreen
    ? "fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    : "fixed bottom-24 right-4 z-40";

  const innerContainerClass = isFullscreen
    ? "w-full h-full md:h-[90vh] md:max-w-4xl bg-[#343541] text-[#ECECF1] rounded-none md:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#3f4147]"
    : // ⬇️ Bigger width & height when not maximized
      "w-[26rem] h-[32rem] bg-[#343541] text-[#ECECF1] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[#3f4147]";

  return (
    <>
      {/* Floating open button */}
      {!open && (
        <button
          className="fixed bottom-4 right-4 z-40 w-14 h-14 rounded-full bg-[#10a37f] text-white shadow-xl flex items-center justify-center text-2xl hover:scale-105 transition-transform"
          onClick={toggleOpen}
        >
          💬
        </button>
      )}

      {open && (
        <div className={outerContainerClass}>
          <div className={innerContainerClass}>
            {/* Header (شبيه بشريط ChatGPT العلوي) */}
            <div className="px-4 py-3 border-b border-[#3f4147] bg-[#202123] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#10a37f] flex items-center justify-center text-sm font-semibold text-white">
                  AI
                </div>
                <div>
                  <p className="text-sm font-semibold">EduSmartAI Assistant</p>
                  <p className="text-[11px] text-[#9ca3af]">
                    Personalized help based on your real data.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[11px] text-[#9ca3af] mr-1">
                  <span className="w-2 h-2 rounded-full bg-[#10a37f] animate-pulse" />
                  <span>{isSending ? "Thinking..." : "Online"}</span>
                </div>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="w-8 h-8 rounded-lg border border-[#3f4147] bg-[#343541] text-[#e5e7eb] hover:bg-[#40414f] hover:text-white flex items-center justify-center text-xs"
                  title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? "🗗" : "⛶"}
                </button>
                <button
                  type="button"
                  onClick={toggleOpen}
                  className="w-8 h-8 rounded-lg border border-[#3f4147] bg-[#343541] text-[#e5e7eb] hover:bg-[#40414f] hover:text-white flex items-center justify-center text-sm"
                  title="Close"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-3 bg-[#343541]">
              {messages.map((m) => (
                <ChatMessage
                  key={m.id}
                  from={m.sender}
                  text={m.text}
                  chips={m.chips}
                  onChipClick={handleChipClick}
                />
              ))}

              {error && (
                <div className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/40 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              {isSending && (
                <div className="text-xs text-[#9ca3af] mt-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#10a37f] animate-pulse" />
                  <span>Assistant is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Footer: Q1/Q2 + input */}
            <div className="px-4 pt-2 pb-4 border-t border-[#3f4147] bg-[#343541]">
              {/* Scenario buttons */}
              {(showQ1Buttons || showQ2Buttons) && (
                <div className="flex justify-between mb-3 gap-2">
                  {showQ1Buttons && (
                    <>
                      <Button
                        type="button"
                        onClick={() => handleQ1Answer("Yes")}
                        disabled={isSending}
                      >
                        Yes
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleQ1Answer("No")}
                        disabled={isSending}
                      >
                        No
                      </Button>
                    </>
                  )}
                  {showQ2Buttons && (
                    <>
                      <Button
                        type="button"
                        onClick={() => handleQ2Answer("Yes")}
                        disabled={isSending}
                      >
                        Yes
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleQ2Answer("No")}
                        disabled={isSending}
                      >
                        No
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Input row (assistant mode) */}
              <div className="flex gap-2 mb-2">
                <input
                  className="flex-1 text-sm px-3 py-2 rounded-xl border border-[#3f4147] bg-[#40414f] text-[#ECECF1] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#10a37f]/60"
                  placeholder={
                    assistantEnabled
                      ? "Ask anything about your courses, grades, or how to improve..."
                      : "Answer with Yes / No to start..."
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  disabled={inputDisabled}
                />
                <Button
                  type="button"
                  onClick={handleSend}
                  disabled={inputDisabled || !input.trim()}
                >
                  Send
                </Button>
              </div>

              {/* Quick suggestions (only بعد الدخول في assistant mode) */}
              {assistantEnabled && (
                <div className="flex flex-wrap gap-2 mt-1 text-[11px]">
                  <button
                    type="button"
                    className="px-2 py-1 rounded-full border border-white/10 bg-white/5 text-[#e5e7eb] hover:bg-white/10"
                    onClick={() => sendToBackend("Show my evaluation")}
                  >
                    Show my evaluation
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 rounded-full border border-white/10 bg-white/5 text-[#e5e7eb] hover:bg-white/10"
                    onClick={() =>
                      sendToBackend("Help me improve my performance")
                    }
                  >
                    Help me improve
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 rounded-full border border-white/10 bg-white/5 text-[#e5e7eb] hover:bg-white/10"
                    onClick={() => sendToBackend("Show my attendance")}
                  >
                    Show my attendance
                  </button>
                </div>
              )}

              {/* Hint */}
              <div className="mt-2 text-[11px] text-[#9ca3af]">
                {scenarioStep !== "done" ? (
                  <span>
                    Start by answering with <strong>Yes / No</strong> to unlock
                    your assistant.
                  </span>
                ) : (
                  <span>
                    You can ask things like:{" "}
                    <em>"Which courses am I weak in?"</em> or{" "}
                    <em>"When is my next quiz?"</em>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;
