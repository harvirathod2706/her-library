import React, { useState, useEffect } from 'react';
import { getBookFileName, getBookStatus, getProgressPct, getStatusInfo } from './BookGrid';

export default function BookDetailModal({ 
  book, 
  onClose, 
  onSaveProgress, 
  onToggleHide, 
  onDeleteBook, 
  onRecommendClick,
  onReadBook,
  onEditClick,
  isHidden 
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(100);
  
  // Image cover fallback states
  const fileName = book ? getBookFileName(book.title) : '';
  const [imgSrc, setImgSrc] = useState('');
  const [fallbackFormat, setFallbackFormat] = useState('png');
  const [showTextFallback, setShowTextFallback] = useState(false);

  useEffect(() => {
    if (!book) return;
    
    // Set initial progress page inputs
    setCurrentPage(book.current_page || 0);
    setTotalPages(book.pages || 100);

    // Reset image cover fallbacks
    setImgSrc(book.custom_cover || `/Covers/${fileName}.jpg`);
    setFallbackFormat('png');
    setShowTextFallback(false);
  }, [book, fileName]);

  if (!book) return null;

  const handleImageError = () => {
    if (book.custom_cover) {
      setShowTextFallback(true);
      return;
    }
    if (fallbackFormat === 'png') {
      setImgSrc(`/Covers/${fileName}.png`);
      setFallbackFormat('jpeg');
    } else if (fallbackFormat === 'jpeg') {
      setImgSrc(`/Covers/${fileName}.jpeg`);
      setFallbackFormat('done');
    } else {
      setShowTextFallback(true);
    }
  };

  const handleSaveProgress = () => {
    const cur = parseInt(currentPage, 10) || 0;
    const tot = parseInt(totalPages, 10) || book.pages || 100;
    onSaveProgress(book.id, cur, tot);
  };

  const calculatedPct = Math.min(100, Math.round((currentPage / totalPages) * 100)) || 0;
  const currentStatus = getBookStatus({ ...book, current_page: parseInt(currentPage, 10) || 0, pages: parseInt(totalPages, 10) || 100 });
  const statusInfo = getStatusInfo(currentStatus);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm select-none"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative bg-[#0d1117] border border-[#d4a853]/25 w-full max-w-2xl rounded-2xl p-6 md:p-8 text-[#e8dcc8] shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto font-lora">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full border border-white/10 hover:border-[#d4a853]/40 flex items-center justify-center text-lg text-[#a89880] hover:text-[#d4a853] transition-colors bg-none cursor-pointer"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Cover Art in Modal */}
          <div className={`relative w-[130px] md:w-[150px] aspect-[2/3] shrink-0 rounded-r-xl rounded-l-md overflow-hidden shadow-[-4px_6px_16px_rgba(0,0,0,0.6),inset_-3px_0_8px_rgba(0,0,0,0.3)] ${book.theme} flex items-center justify-center`}>
            <div className="book-spine z-10" />
            
            {!showTextFallback ? (
              <img 
                src={imgSrc} 
                onError={handleImageError} 
                alt={book.title} 
                className="absolute inset-0 w-full h-full object-cover z-[1] rounded-r-xl rounded-l-md"
              />
            ) : null}

            <div className="flex flex-col items-center justify-center p-3 text-center">
              <div className="text-3xl mb-1 drop-shadow">{book.icon || '📚'}</div>
              <div className="font-playfair font-semibold text-[10px] leading-snug text-[#f5efe3] drop-shadow-md line-clamp-3">
                {book.title}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1">
            <h3 className="font-playfair text-2xl md:text-3xl font-bold text-[#e8dcc8] leading-tight">
              {book.title}
            </h3>
            <p className="font-sans text-sm text-[#d4a853] font-medium tracking-wide mt-1.5">
              by {book.author}
            </p>
            
            {/* Tags wrapper */}
            <div className="flex flex-wrap gap-1.5 mt-4">
              {book.tags && book.tags.map((tag) => (
                <span key={tag} className="font-sans text-[10px] bg-white/[0.04] border border-white/5 text-[#a89880] px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
              <span className={`font-sans text-[10px] px-2 py-0.5 rounded-full ${statusInfo.cls}`}>
                {statusInfo.label}
              </span>
            </div>

            {/* Note block */}
            <p className="font-lora text-[0.9rem] italic text-[#a89880] leading-relaxed mt-5 border-l-2 border-[#d4a853]/40 pl-4 py-1">
              {book.note || 'No description or thoughts yet...'}
            </p>
          </div>
        </div>

        {/* Progress Tracker Section */}
        <div className="border-t border-[#d4a853]/15 pt-5">
          <div className="flex justify-between items-center text-sm font-sans mb-2 text-[#a89880]">
            <span>Reading Progress</span>
            <span className="font-bold text-[#d4a853]">{calculatedPct}%</span>
          </div>

          {/* Track slider */}
          <div className="w-full h-2 bg-white/5 border border-white/5 rounded-full overflow-hidden mb-4">
            <div 
              className="h-full bg-gradient-to-r from-[#c4869a] to-[#d4a853] rounded-full transition-all duration-300"
              style={{ width: `${calculatedPct}%` }}
            />
          </div>

          {/* Inputs Row */}
          <div className="flex flex-wrap gap-3 items-center justify-between font-sans">
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                value={currentPage}
                onChange={(e) => setCurrentPage(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-16 bg-white/[0.04] border border-[#d4a853]/25 rounded-lg px-2 py-1.5 text-center text-[#e8dcc8] font-semibold text-sm outline-none form-input-focus"
                min={0}
              />
              <span className="text-[#a89880] text-xs font-semibold">of</span>
              <input 
                type="number" 
                value={totalPages}
                onChange={(e) => setTotalPages(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-16 bg-white/[0.04] border border-[#d4a853]/25 rounded-lg px-2 py-1.5 text-center text-[#e8dcc8] font-semibold text-sm outline-none form-input-focus"
                min={1}
              />
            </div>

            <button 
              onClick={handleSaveProgress}
              className="bg-[#d4a853]/10 border border-[#d4a853]/40 hover:bg-[#d4a853]/20 hover:border-[#d4a853] px-4 py-1.5 rounded-lg text-[#d4a853] text-xs font-bold tracking-wide transition-all cursor-pointer"
            >
              💾 Save Progress
            </button>
          </div>
        </div>

        {/* Read Book PDF Section */}
        <div className="border-t border-[#d4a853]/15 pt-5 flex flex-row justify-center gap-4 items-center">
          <button 
            onClick={onReadBook}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#7c2d3a] to-[#c4869a] rounded-lg text-white font-sans text-xs font-bold shadow-md cursor-pointer hover:opacity-95 transition-opacity"
          >
            <span>📖</span> Read Book
          </button>
          
          <button 
            onClick={() => {
              const basePdfPath = book.pdf_url || `/Books/${fileName}.pdf`;
              window.open(basePdfPath, '_blank');
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#d4a853]/10 border border-[#d4a853]/45 hover:bg-[#d4a853]/15 rounded-lg text-[#d4a853] font-sans text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
          >
            <span>🌐</span> Drive View
          </button>
        </div>

        {/* Recommendations Section */}
        {book.similar && book.similar.length > 0 && (
          <div className="border-t border-[#d4a853]/15 pt-5">
            <h4 className="font-sans text-xs font-bold text-[#d4a853] tracking-wide mb-3">
              ✨ You Might Also Love
            </h4>
            <div className="flex flex-wrap gap-2">
              {book.similar.map((title) => (
                <button
                  key={title}
                  onClick={() => onRecommendClick(title)}
                  className="font-sans text-[10px] bg-white/[0.04] border border-white/5 hover:border-[#d4a853]/40 hover:bg-[#d4a853]/5 text-[#a89880] hover:text-[#d4a853] px-3 py-1 rounded-full cursor-pointer transition-all max-w-full truncate text-left"
                >
                  📚 {title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="border-t border-[#d4a853]/15 pt-5 flex justify-between gap-4 font-sans text-xs">
          <button 
            onClick={() => onToggleHide(book.id)}
            className="flex items-center gap-1.5 text-[#a89880] hover:text-white bg-white/[0.03] border border-white/5 hover:border-white/20 px-4 py-2 rounded-lg cursor-pointer transition-colors animate-all"
          >
            <span>{isHidden ? '👁️' : '🙈'}</span> {isHidden ? 'Unhide' : 'Hide'}
          </button>

          <button 
            onClick={onEditClick}
            className="flex items-center gap-1.5 text-[#d4a853]/90 hover:text-[#d4a853] bg-[#d4a853]/5 border border-[#d4a853]/10 hover:border-[#d4a853]/35 px-4 py-2 rounded-lg cursor-pointer transition-colors"
          >
            <span>✏️</span> Edit Book
          </button>
          
          <button 
            onClick={() => onDeleteBook(book.id, book.title)}
            className="flex items-center gap-1.5 text-[#e05252]/80 hover:text-[#e05252] bg-[#e05252]/5 border border-[#e05252]/10 hover:border-[#e05252]/30 px-4 py-2 rounded-lg cursor-pointer transition-colors"
          >
            <span>🗑️</span> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
