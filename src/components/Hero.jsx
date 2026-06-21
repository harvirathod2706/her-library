import React from 'react';
import StarBorder from './StarBorder';

export default function Hero({ onEnterLibrary }) {
  return (
    <section className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center p-8 bg-[radial-gradient(ellipse_at_50%_30%,#1f0a1a_0%,var(--midnight)_70%)] before:content-[''] before:absolute before:inset-0 before:bg-[url('data:image/svg+xml,%3Csvg_width=%2260%22_height=%2260%22_viewBox=%220_0_60_60%22_xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg_fill=%22none%22_fill-rule=%22evenodd%22%3E%3Cg_fill=%22%23d4a853%22_fill-opacity=%220.03%22%3E%3Cpath_d=%22M36_34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6_34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6_4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] before:pointer-events-none">

      {/* Birthday badge */}
      <StarBorder
        as="div"
        color="var(--blush)"
        speed="5s"
        className="mb-6 animate-[fade-in_1s_ease_both]"
      >
        ✨ A Birthday Gift For You ✨
      </StarBorder>

      {/* Title */}
      <h1 className="font-playfair text-[clamp(2.5rem,7vw,5.5rem)] font-bold leading-[1.05] tracking-tight mb-2 animate-[fade-up_1s_ease_0.2s_both]">
        <span className="text-[#e8b4c0]">Her</span>{' '}
        <span className="text-[#d4a853] italic">Library</span>
      </h1>

      {/* Subtitle */}
      <p className="font-lora text-[clamp(1rem,2.5vw,1.3rem)] italic text-[#a89880] max-w-[480px] mx-auto mt-4 mb-10 leading-relaxed animate-[fade-up_1s_ease_0.4s_both]">
        Every book a world you've lived in.<br />
        Every page, a part of you.
      </p>

      {/* Custom Note */}
      <div className="relative bg-[#d4a853]/[0.07] border border-[#d4a853]/20 rounded-2xl py-6 px-8 max-w-[520px] text-[0.95rem] leading-[1.8] text-[#e8dcc8] italic animate-[fade-up_1s_ease_0.6s_both] before:content-['❝'] before:text-5xl before:text-[#d4a853] before:opacity-30 before:absolute before:top-[-0.5rem] before:left-4 before:not-italic">
        To my favourite bookworm... this is every story you've fallen into, every
        character you've loved, every world you've wandered through. Happy
        Birthday, dear Harviii 🎂📚
      </div>

      {/* Scroll Cue Button */}
      <button
        onClick={onEnterLibrary}
        className="mt-12 flex flex-col items-center gap-2 animate-[fade-in_1s_ease_1.2s_both] cursor-pointer text-[#a89880] font-sans text-[0.8rem] tracking-[0.1em] uppercase hover:text-[#d4a853] border-none bg-none outline-none"
      >
        Enter the Library
        <div className="w-6 h-6 border-r-2 border-b-2 border-[#c4869a] rotate-45 animate-arrow-bounce" />
      </button>
    </section>
  );
}
