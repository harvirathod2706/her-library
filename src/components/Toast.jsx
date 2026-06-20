import React, { useEffect } from 'react';

export default function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#1a2332]/95 border border-[#d4a853]/30 px-6 py-3 rounded-full text-[#e8dcc8] font-sans text-sm tracking-wide shadow-2xl transition-all duration-300 flex items-center gap-2">
      <span className="text-[#d4a853]">✨</span>
      {message}
    </div>
  );
}
