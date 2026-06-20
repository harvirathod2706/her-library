import React from 'react';

export default function ExploreAddModal({ isOpen, bookTitle, onClose, onAddBookClick }) {
  if (!isOpen) return null;

  const handleExploreClick = () => {
    const url = `https://www.google.com/search?q=${encodeURIComponent(bookTitle + " book")}`;
    window.open(url, '_blank');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative bg-[#0d1117] border border-[#d4a853]/25 w-full max-w-[380px] rounded-2xl p-6 text-center text-[#e8dcc8] shadow-2xl flex flex-col items-center gap-4 font-lora">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full border border-white/10 hover:border-[#d4a853]/40 flex items-center justify-center text-lg text-[#a89880] hover:text-[#d4a853] transition-colors bg-none cursor-pointer"
        >
          ✕
        </button>

        {/* Icon & Title */}
        <div className="text-4xl mt-3">🔍✨</div>
        <h3 className="font-playfair text-xl font-bold text-[#e8dcc8]">
          Book Not Found
        </h3>
        
        {/* Description */}
        <p className="font-lora text-[0.88rem] text-[#a89880] leading-relaxed px-2">
          "<strong><span className="text-[#d4a853]">{bookTitle}</span></strong>" does not exist in your database. Would you like to explore it or add it to your library?
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center w-full mt-3 font-sans text-xs">
          <button 
            onClick={handleExploreClick}
            className="flex-1 py-2.5 px-4 bg-white/[0.04] border border-[#d4a853]/35 hover:bg-[#d4a853]/5 text-[#d4a853] font-bold rounded-lg cursor-pointer transition-all"
          >
            🌐 Explore
          </button>
          
          <button 
            onClick={onAddBookClick}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#7c2d3a] to-[#c4869a] text-white font-bold rounded-lg cursor-pointer shadow-md hover:opacity-95 transition-opacity"
          >
            ➕ Add Book
          </button>
        </div>
      </div>
    </div>
  );
}
