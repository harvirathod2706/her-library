import React from 'react';

const SPINE_COLORS = [
  "#4a1520",
  "#1a3a5c",
  "#2d4a2d",
  "#2d1b4e",
  "#1a4a4a",
  "#4a2c15",
  "#5a2d3f",
  "#4a3215",
  "#1f2d4a",
  "#3a1a2a",
  "#2a3d2a",
  "#1a2d4a",
];

export default function BookShelf({ books, onBookSelect }) {
  return (
    <div className="mt-16 w-full">
      {/* Section Header */}
      <div className="text-center mb-10">
        <div className="font-sans text-[0.72rem] tracking-[0.22em] uppercase text-[#c4869a] mb-2">
          🏛️ The Shelf
        </div>
        <h2 className="font-playfair text-3xl font-semibold text-[#e8dcc8]">
          Browse by <em className="text-[#d4a853] not-italic">Spine</em>
        </h2>
        <div className="w-[60px] h-[2px] bg-gradient-to-r from-transparent via-[#d4a853] to-transparent mx-auto mt-4" />
      </div>

      {/* Shelf books row container */}
      <div className="relative w-full max-w-5xl mx-auto px-4 flex flex-col justify-end">
        {/* Books container */}
        <div className="flex items-end justify-start gap-0.5 overflow-x-auto overflow-y-hidden px-4 pb-0 h-[220px] scrollbar-thin scrollbar-thumb-white/10 select-none">
          {books.map((book, index) => {
            const bgGradient = `linear-gradient(to right, ${SPINE_COLORS[index % SPINE_COLORS.length]}, ${SPINE_COLORS[(index + 3) % SPINE_COLORS.length]})`;
            const height = `${100 + (index % 4) * 25}px`;

            return (
              <div
                key={book.id}
                onClick={() => onBookSelect(book)}
                className="spine-book"
                style={{
                  background: bgGradient,
                  height: height,
                }}
                title={`${book.title} by ${book.author}`}
              >
                <span className="spine-title pointer-events-none line-clamp-1 block text-ellipsis truncate tracking-wider py-1 font-semibold text-[10px]">
                  {book.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Ledge board (shelf base) */}
        <div className="shelf-base w-full" />
      </div>
    </div>
  );
}
