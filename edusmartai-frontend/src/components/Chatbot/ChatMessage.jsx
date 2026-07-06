// src/components/Chatbot/ChatMessage.jsx
import React from "react";

const ChatMessage = ({ from, text, chips, onChipClick }) => {
  const isBot = from === "bot";

  return (
    <div
      className={`flex mb-3 ${isBot ? "justify-start" : "justify-end"}`}
    >
      {/* Avatar */}
      {isBot && (
        <div className="mr-2 flex-shrink-0 w-8 h-8 rounded-full bg-[#10a37f] flex items-center justify-center text-xs font-semibold text-white shadow-md">
          AI
        </div>
      )}

      <div
        className={`flex max-w-[85%] ${
          isBot ? "flex-row" : "flex-row-reverse"
        }`}
      >
        {!isBot && (
          <div className="ml-2 flex-shrink-0 w-8 h-8 rounded-full bg-[#40414f] flex items-center justify-center text-xs font-semibold text-white shadow-md">
            You
          </div>
        )}

        <div
          className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-line shadow-sm leading-relaxed ${
            isBot
              ? "bg-[#444654] text-[#ECECF1] rounded-tl-none"
              : "bg-[#10a37f] text-white rounded-tr-none"
          }`}
        >
          {/* نص الرسالة (مع دعم الأسطر الجديدة) */}
          {text?.split("\n").map((line, idx) => (
            <p key={idx} className="mb-[2px] last:mb-0">
              {line}
            </p>
          ))}

          {/* Suggested action chips تحت رسائل البوت */}
          {isBot && chips && chips.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => onChipClick && onChipClick(chip.key)}
                  className="px-2 py-1 rounded-full border border-white/10 bg-white/5 text-[11px] text-[#e5e7eb] hover:bg-white/10 transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
