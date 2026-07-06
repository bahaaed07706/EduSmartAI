// src/api/chatbotApi.js
import axiosClient from "./axiosClient";

/**
 * Call the chatbot backend for a text query.
 *
 * Request  -> POST /chatbot/query
 * Body     -> { message: string, course_id?: number | null }
 * Response -> {
 *   answer: string;
 *   suggested_actions?: string[];
 *   data?: Record<string, any>;
 * }
 */
export const queryChatbot = (message, courseId = null) => {
  return axiosClient
    .post("/chatbot/query", {
      message,
      course_id: courseId,
    })
    .then((res) => res.data);
};

/**
 * Call the chatbot TTS backend to generate speech audio.
 *
 * Request  -> POST /chatbot/tts
 * Body     -> { text: string }
 * Response -> { audio_url: string }
 */
export const ttsChatbot = (text) => {
  return axiosClient
    .post("/chatbot/tts", { text })
    .then((res) => res.data);
};

/**
 * Default export used everywhere in the app.
 * It MUST contain `query` and `tts` as functions.
 */
const chatbotApi = {
  query: queryChatbot,
  tts: ttsChatbot,
};

export default chatbotApi;
