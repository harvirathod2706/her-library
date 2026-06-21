import React, { useState, useEffect, useRef } from 'react';

function StatItem({ value, label, borderClass = "" }) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef(null);

  // Restart animation if value changes
  useEffect(() => {
    setHasAnimated(false);
  }, [value]);

  useEffect(() => {
    if (hasAnimated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasAnimated(true);
          let start = 0;
          const target = parseInt(value, 10) || 0;
          if (target <= 0) {
            setDisplayValue(0);
            return;
          }
          const duration = 1200;
          const stepTime = 16;
          const steps = duration / stepTime;
          const increment = target / steps;

          const timer = setInterval(() => {
            start += increment;
            if (start >= target) {
              setDisplayValue(target);
              clearInterval(timer);
            } else {
              setDisplayValue(Math.round(start));
            }
          }, stepTime);
        }
      },
      { threshold: 0.2 }
    );

    const currentRef = elementRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [value, hasAnimated]);

  return (
    <div 
      ref={elementRef} 
      className={`py-4 md:py-6 px-4 md:px-12 text-center flex-1 min-w-[140px] sm:min-w-[150px] ${borderClass}`}
    >
      <div className="font-playfair text-2xl md:text-3xl font-bold text-[#d4a853]">{displayValue}</div>
      <div className="font-sans text-[0.7rem] md:text-[0.75rem] text-[#a89880] uppercase tracking-[0.12em] mt-1">{label}</div>
    </div>
  );
}

export default function Stats({ total, read, reading, similar = 12 }) {
  return (
    <div className="relative z-10 grid grid-cols-2 md:flex md:justify-center bg-[#111827] border-t border-b border-[#d4a853]/10">
      <StatItem value={total} label="Books in Shelf" borderClass="border-r border-b md:border-b-0 border-[#d4a853]/10" />
      <StatItem value={read} label="Books Devoured" borderClass="border-b md:border-b-0 md:border-r border-[#d4a853]/10" />
      <StatItem value={reading} label="Currently Reading" borderClass="border-r border-[#d4a853]/10" />
      <StatItem value={similar} label="Recommendations" borderClass="" />
    </div>
  );
}
