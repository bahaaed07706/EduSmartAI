// src/hooks/useChatbot.js
import { useState, useCallback } from "react";
import chatbotApi from "../api/chatbotApi";

/**
 * Simple generic chatbot hook.
 *
 * مسؤول عن:
 * - حفظ الرسائل (user / bot)
 * - إدارة حالة التحميل loading
 * - استدعاء API /chatbot/query
 *
 * السيناريوهات الخاصة (Yes/No evaluation, etc)
 * تُدار في الـ UI (StudentChatbotPage أو ChatbotWidget) باستخدام
 * state خاص، وهذا الهوك فقط ينفّذ السؤال ويرجع الرد من الباك إند.
 */
const useChatbot = () => {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      from: "bot",
      text:
        "Hi, I’m your EduSmartAI assistant 🤖. I can show your evaluations, help you improve your performance, and answer questions about your courses and attendance.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  /**
   * Send a message to the chatbot backend.
   *
   * @param {string} text        - user message
   * @param {object} options
   * @param {number|null} options.courseId
   * @param {boolean} options.skipUserMessage - useful if أنت بتضيف رسالة
   *        المستخدم يدويًا في الـ UI (زي سيناريو Yes/No) وتبغى بس تنادي الـ API.
   *
   * @returns {Promise<object|undefined>} - الـ response الكامل من الباك إند
   */
  const sendMessage = useCallback(
    async (text, { courseId = null, skipUserMessage = false } = {}) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      // Debug صغيرة لو حاب تتأكد أن الـ API مضبوط
      // console.log("chatbotApi in useChatbot:", chatbotApi);

      if (typeof chatbotApi.query !== "function") {
        console.error(
          "chatbotApi.query is not a function. Check src/api/chatbotApi.js export."
        );
        setMessages((prev) => [
          ...prev,
          {
            id: `b-err-${Date.now()}`,
            from: "bot",
            text:
              "The assistant configuration seems broken (query function missing). Please contact support.",
          },
        ]);
        return;
      }

      // أضف رسالة المستخدم للكونفرسيشن إذا ما كنت ضفتها في الـ UI
      if (!skipUserMessage) {
        const userMsg = {
          id: `u-${Date.now()}`,
          from: "user",
          text: trimmed,
        };
        setMessages((prev) => [...prev, userMsg]);
      }

      setLoading(true);

      try {
        const res = await chatbotApi.query(trimmed, courseId);

        const botText =
          res && typeof res.answer === "string"
            ? res.answer
            : "I received your message, but I couldn't generate a proper answer.";

        const botMsg = {
          id: `b-${Date.now()}`,
          from: "bot",
          text: botText,
        };

        setMessages((prev) => [...prev, botMsg]);

        // نرجّع الريسبونس الكامل عشان صفحات زي StudentChatbotPage
        // تقدر تستفيد من data / suggested_actions لو حبت
        return res;
      } catch (err) {
        console.error("Chatbot error", err);
        setMessages((prev) => [
          ...prev,
          {
            id: `b-err-${Date.now()}`,
            from: "bot",
            text:
              "Sorry, something went wrong while contacting the assistant.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Reset conversation (مثلاً عند فتح صفحة الـ chatbot الرئيسية).
   */
  const resetConversation = useCallback(() => {
    setMessages([
      {
        id: "welcome",
        from: "bot",
        text:
          "Hi, I’m your EduSmartAI assistant 🤖. I can show your evaluations, help you improve your performance, and answer questions about your courses and attendance.",
      },
    ]);
  }, []);

  return {
    messages,
    loading,
    sendMessage,
    setMessages,
    resetConversation,
  };
};

export default useChatbot;
