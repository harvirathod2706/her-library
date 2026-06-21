import React, { useState, useEffect } from 'react';

export default function CreateSeriesModal({ isOpen, onClose, onCreateSeries, books }) {
  const [seriesName, setSeriesName] = useState('');
  const [selectedBookIds, setSelectedBookIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSeriesName('');
      setSelectedBookIds([]);
      setSearchQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleBook = (bookId) => {
    setSelectedBookIds((prev) =>
      prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = seriesName.trim();
    if (!name) return;
    if (selectedBookIds.length === 0) {
      return;
    }
    onCreateSeries(name, selectedBookIds);
  };

  // Filter books based on search query
  const filteredBooks = books.filter((b) => {
    if (b.is_deleted) return false;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      b.title.toLowerCase().includes(query) ||
      b.author.toLowerCase().includes(query)
    );
  });

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm select-none"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative bg-[#0d1117] border border-[#d4a853]/25 w-full max-w-md rounded-2xl p-6 md:p-8 text-[#e8dcc8] shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto font-lora">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full border border-white/10 hover:border-[#d4a853]/40 flex items-center justify-center text-lg text-[#a89880] hover:text-[#d4a853] transition-colors bg-none cursor-pointer"
        >
          ✕
        </button>

        <div>
          <h3 className="font-playfair text-xl md:text-2xl font-bold text-[#e8dcc8]">
            📦 Create New Series
          </h3>
          <div className="w-[40px] h-[2px] bg-gradient-to-r from-[#d4a853] to-transparent mt-2 mb-4" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-sans text-xs">
          {/* Series Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#a89880] font-medium tracking-wide">Series Name</label>
            <input 
              type="text" 
              value={seriesName}
              onChange={(e) => setSeriesName(e.target.value)}
              placeholder="e.g. Shatter Me, The Inheritance Games" 
              className="bg-white/[0.04] border border-[#d4a853]/20 rounded-lg p-2.5 text-[#e8dcc8] font-lora text-sm outline-none form-input-focus"
              required 
            />
          </div>

          {/* Search Books */}
          <div className="flex flex-col gap-1.5 mt-1">
            <label className="text-[#a89880] font-medium tracking-wide">Select Books (At least one required)</label>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search books to add..." 
              className="bg-white/[0.04] border border-white/10 rounded-lg p-2 text-[#e8dcc8] font-lora text-xs outline-none focus:border-[#d4a853]/40"
            />
          </div>

          {/* Book List Selection */}
          <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto p-2 bg-white/[0.02] border border-white/5 rounded-lg no-scrollbar">
            {filteredBooks.length === 0 ? (
              <div className="text-center italic text-[#a89880] py-4">No books found...</div>
            ) : (
              filteredBooks.map((book) => {
                const isSelected = selectedBookIds.includes(book.id);
                return (
                  <div 
                    key={book.id}
                    onClick={() => handleToggleBook(book.id)}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer select-none transition-all
                      ${isSelected 
                        ? 'bg-[#d4a853]/10 border-[#d4a853]/40 text-[#d4a853]' 
                        : 'bg-transparent border-white/5 hover:bg-white/[0.02] text-[#e8dcc8]'}`}
                  >
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // handled by parent onClick
                      className="cursor-pointer accent-[#d4a853] w-3.5 h-3.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs truncate">{book.title}</div>
                      <div className="text-[10px] text-[#a89880] truncate">{book.author}</div>
                    </div>
                    {book.series_name && (
                      <span className="text-[9px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[#a89880]">
                        {book.series_name}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Create Button */}
          <button 
            type="submit"
            disabled={!seriesName.trim() || selectedBookIds.length === 0}
            className="w-full bg-[#d4a853]/15 border border-[#d4a853]/40 hover:bg-[#d4a853]/25 hover:border-[#d4a853] py-3 rounded-lg text-[#d4a853] font-bold text-xs tracking-wider uppercase transition-all cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed mt-2"
          >
            Create Series
          </button>
        </form>
      </div>
    </div>
  );
}
