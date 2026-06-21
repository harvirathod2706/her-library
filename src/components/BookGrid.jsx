import React, { useState, useEffect } from 'react';

// Helper to get clean filename from book title
export function getBookFileName(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function getBookStatus(book) {
  const cur = book.current_page || 0;
  const total = book.pages || 100;
  if (cur === 0) {
    return book.status || 'want';
  } else if (cur >= total) {
    return 'read';
  } else {
    return 'reading';
  }
}

export function getProgressPct(book) {
  const cur = book.current_page || 0;
  const total = book.pages || 100;
  return Math.min(100, Math.round((cur / total) * 100));
}

export function getStatusInfo(status) {
  const map = {
    read: { label: "✓ Read", cls: "bg-emerald-950/50 text-[#4ade80] border border-emerald-500/20" },
    reading: { label: "◎ Reading", cls: "bg-sky-950/50 text-[#38bdf8] border border-sky-500/20" },
    slump: { label: "~ Slump", cls: "bg-amber-950/50 text-[#fbbf24] border border-amber-500/20" },
    want: { label: "◌ Want to Read", cls: "bg-zinc-800/50 text-[#a1a1aa] border border-[#a1a1aa]/10" },
  };
  return map[status] || map.want;
}

function ProgressRing({ pct }) {
  const size = 32;
  const r = size / 2 - 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-black/60 shadow-lg">
      <svg className="progress-ring w-8 h-8" viewBox={`0 0 ${size} ${size}`}>
        <circle className="progress-ring-bg" cx={size / 2} cy={size / 2} r={r} />
        <circle 
          className="progress-ring-fill" 
          cx={size / 2} 
          cy={size / 2} 
          r={r}
          strokeDasharray={circ} 
          strokeDashoffset={offset} 
        />
      </svg>
      <div className="absolute text-[8px] font-sans text-white font-bold leading-none">{pct}%</div>
    </div>
  );
}

export function BookCard({ book, index, onClick }) {
  const fileName = getBookFileName(book.title);
  const [imgSrc, setImgSrc] = useState(book.custom_cover || `/Covers/${fileName}.jpg`);
  const [fallbackFormat, setFallbackFormat] = useState('png'); // jpg -> png -> jpeg -> fallbackText
  const [showTextFallback, setShowTextFallback] = useState(false);

  // Sync image source if book changes or custom cover uploaded
  useEffect(() => {
    setImgSrc(book.custom_cover || `/Covers/${fileName}.jpg`);
    setFallbackFormat('png');
    setShowTextFallback(false);
  }, [book.custom_cover, book.title, fileName]);

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

  const status = getBookStatus(book);
  const statusInfo = getStatusInfo(status);
  const pct = getProgressPct(book);

  return (
    <div 
      onClick={() => onClick(book)}
      className="book-card relative cursor-pointer rounded-2xl p-2.5 bg-transparent hover:bg-white/[0.05] hover:-translate-y-2 hover:scale-[1.01] hover:shadow-[0_8px_32px_rgba(255,255,255,0.03),inset_0_0_0_1px_rgba(255,255,255,0.08)] transition-all duration-300 ease-out animate-card-appear"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      {/* Cover outer frame */}
      <div className="book-cover relative w-full aspect-[2/3] rounded-r-xl rounded-l-md overflow-hidden shadow-[-4px_6px_16px_rgba(0,0,0,0.6),inset_-3px_0_8px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.04)]">
        
        {/* Book spine simulation overlay */}
        <div className="book-spine z-10" />
        
        {/* Inner page representation */}
        <div className={`book-cover-inner ${book.theme} w-full h-full relative overflow-hidden flex flex-col items-center justify-center p-4 text-center`}>
          {!showTextFallback ? (
            <img 
              className="absolute inset-0 w-full h-full object-cover z-[1] rounded-r-xl rounded-l-md"
              src={imgSrc} 
              onError={handleImageError}
              alt={book.title} 
            />
          ) : null}

          {/* Fallback covers containing book details inside a theme color */}
          <div className="flex flex-col items-center justify-center w-full h-full p-4 select-none">
            <div className="book-icon text-3xl mb-2 drop-shadow-md">{book.icon || '📚'}</div>
            <div className="book-title-text font-playfair font-semibold text-xs leading-snug text-[#f5efe3] drop-shadow mb-1 line-clamp-3">
              {book.title}
            </div>
            <div className="book-author-text font-sans text-[10px] text-[#f0c97a] opacity-80 line-clamp-2">
              {book.author}
            </div>
          </div>

          {/* Progress circle display overlay */}
          <div className="absolute bottom-2 right-2 z-10">
            {pct > 0 && pct < 100 && <ProgressRing pct={pct} />}
            {pct === 100 && (
              <div className="relative z-10 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/90 text-white text-xs font-bold shadow-md drop-shadow">
                ✓
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Book Meta details below cover */}
      <div className="mt-3.5 px-1">
        <span className={`inline-block text-[9px] font-sans font-medium px-2 py-0.5 rounded-full ${statusInfo.cls}`}>
          {statusInfo.label}
        </span>
        <div className="font-playfair text-[#e8dcc8] font-bold text-sm tracking-wide mt-1.5 line-clamp-1">
          {book.title}
        </div>
        <div className="font-sans text-[10px] text-[#a89880] mt-0.5 line-clamp-1">
          {book.tags && book.tags.slice(0, 2).join(' · ')}
        </div>
      </div>
    </div>
  );
}

export default function BookGrid({ books, onBookSelect, onAddClick, showAddButton = true }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-7 mt-8">
      {books.map((book, index) => (
        <BookCard 
          key={book.id} 
          book={book} 
          index={index} 
          onClick={onBookSelect} 
        />
      ))}
      
      {showAddButton && (
        <button
          onClick={onAddClick}
          className="relative w-full aspect-[2/3] rounded-r-xl rounded-l-md border-2 border-dashed border-[#d4a853]/30 hover:border-[#d4a853]/60 hover:bg-[#d4a853]/5 flex flex-col items-center justify-center gap-2 text-[#a89880] hover:text-[#d4a853] transition-all cursor-pointer group"
        >
          <span className="text-3xl group-hover:scale-110 transition-transform">➕</span>
          <span className="font-sans text-[11px] font-semibold tracking-wide">Add Book</span>
        </button>
      )}

      {books.length === 0 && !showAddButton && (
        <div className="col-span-full text-center font-lora italic text-[#a89880] py-16 text-base">
          No books found... yet 📚
        </div>
      )}
    </div>
  );
}
