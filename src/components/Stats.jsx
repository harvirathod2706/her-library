import React, { useState, useEffect, useRef } from 'react';

function StatItem({ value, label }) {
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
      className="py-6 px-12 text-center border-r border-[#d4a853]/10 last:border-r-0 flex-1 min-w-[150px]"
    >
      <div className="font-playfair text-3xl font-bold text-[#d4a853]">{displayValue}</div>
      <div className="font-sans text-[0.75rem] text-[#a89880] uppercase tracking-[0.12em] mt-1">{label}</div>
    </div>
  );
}

export default function Stats({ total, read, reading, similar = 12 }) {
  return (
    <div className="relative z-10 flex justify-center flex-wrap bg-[#111827] border-t border-b border-[#d4a853]/10">
      <StatItem value={total} label="Books in Shelf" />
      <StatItem value={read} label="Books Devoured" />
      <StatItem value={reading} label="Currently Reading" />
      <StatItem value={similar} label="Recommendations" />
    </div>
  );
}
