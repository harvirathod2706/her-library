import React, { useState, useEffect, useRef } from 'react';

const PASSWORD_HASH = "1ace883bde1ae55dac42d5272b9cf426dc283faad31105ce7da5637c92753461";
const MAX_ATTEMPTS = 3;

// Helper to hash password using SHA-256
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

export default function LockScreen({ onUnlock }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [isShake, setIsShake] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [particles, setParticles] = useState([]);
  const [confetti, setConfetti] = useState([]);
  
  const inputRef = useRef(null);

  // Generate lock particles
  useEffect(() => {
    const list = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 3 + 1}px`,
      color: Math.random() > 0.5 ? "#d4a853" : "#c4869a",
      duration: `${Math.random() * 15 + 8}s`,
      delay: `${Math.random() * 6}s`,
    }));
    setParticles(list);

    // Focus input on load
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 600);
  }, []);

  // Handle lockout countdown timer
  useEffect(() => {
    if (lockoutTime === 0) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockoutTime - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutTime(0);
        setErrorMsg('You can try again now 🌸');
        setAttempts(0);
        clearInterval(interval);
      } else {
        setErrorMsg(`Too many tries! Locked for ${remaining}s 🔒`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTime]);

  const handleUnlockSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (lockoutTime > 0) {
      return;
    }

    const trimmed = password.trim();
    if (!trimmed) {
      shakeInput();
      setErrorMsg("Please enter the password ✨");
      return;
    }

    const hashed = await sha256(trimmed);

    if (hashed === PASSWORD_HASH) {
      // Success!
      setIsSuccess(true);
      
      // Generate success confetti
      const colors = ["#d4a853", "#c4869a", "#e8dcc8", "#7c2d3a", "#4a6741", "#f0c97a"];
      const petals = Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 30 + 30}%`,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: `${Math.random() * 0.4}s`,
        duration: `${Math.random() * 0.6 + 0.9}s`,
        rotate: `${Math.random() * 360}deg`,
        scale: Math.random() * 0.8 + 0.5,
        borderRadius: Math.random() > 0.5 ? "50% 0 50% 0" : "50%",
      }));
      setConfetti(petals);

      setTimeout(() => {
        setIsUnlocking(true);
        setTimeout(() => {
          onUnlock();
        }, 850);
      }, 600);
    } else {
      // Wrong password
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      shakeInput();
      setPassword('');

      if (newAttempts >= MAX_ATTEMPTS) {
        setLockoutTime(Date.now() + 30000); // 30s lockout
      } else {
        const left = MAX_ATTEMPTS - newAttempts;
        setErrorMsg(`Wrong password — ${left} attempt${left === 1 ? "" : "s"} left 🌹`);
      }
    }
  };

  const shakeInput = () => {
    setIsShake(true);
    setTimeout(() => setIsShake(false), 500);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-all duration-[800ms] ease-in-out
        ${isUnlocking ? 'opacity-0 scale-[1.04] pointer-events-none' : ''}`}
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, #1f0a1a 0%, #0d1117 70%)'
      }}
    >
      {/* Background Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <div 
            key={p.id}
            className="absolute rounded-full pointer-events-none animate-[float-particle_linear_infinite]"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              animationDuration: p.duration,
              animationDelay: p.delay,
              bottom: '-20px'
            }}
          />
        ))}
      </div>

      {/* Success Confetti Petals */}
      {isSuccess && (
        <div className="fixed inset-0 pointer-events-none z-[10000] overflow-hidden">
          {confetti.map((c) => (
            <div 
              key={c.id}
              className="absolute pointer-events-none animate-burst-fall"
              style={{
                left: c.left,
                top: c.top,
                backgroundColor: c.color,
                animationDelay: c.delay,
                animationDuration: c.duration,
                transform: `rotate(${c.rotate}) scale(${c.scale})`,
                borderRadius: c.borderRadius,
                width: '10px',
                height: '16px'
              }}
            />
          ))}
        </div>
      )}

      {/* Lock Box */}
      <div className="relative z-[1] text-center flex flex-col items-center max-w-[320px] w-full px-4">
        {/* Lock Icon Wrapper */}
        <div className="relative w-[90px] height-[90px] min-h-[90px] mb-8">
          <div className="w-[90px] h-[90px] rounded-full bg-[#d4a853]/10 border border-[#d4a853]/25 flex items-center justify-center text-[2.8rem] animate-icon-pulse">
            {isSuccess ? '📚' : '🔐'}
          </div>
          <div className="absolute -inset-2 rounded-full border border-transparent border-t-[#d4a853] border-r-[#c4869a] animate-spin-ring" />
        </div>

        {/* Titles */}
        <h2 className="font-playfair text-3xl font-bold italic text-[#e8dcc8] mb-2">
          Her <span className="text-[#d4a853]">Library</span>
        </h2>
        <p className="font-lora text-[0.9rem] italic text-[#a89880] mb-10 leading-relaxed">
          A private collection, curated with love.<br />
          Enter the secret password to step inside ✨
        </p>

        {/* Lock Form */}
        <form onSubmit={handleUnlockSubmit} className="flex flex-col items-center gap-[0.9rem] w-full">
          <div className="relative w-full">
            <input 
              ref={inputRef}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter the magic numbers..."
              autoComplete="off"
              maxLength={32}
              disabled={lockoutTime > 0}
              className={`w-full bg-white/[0.04] border border-[#d4a853]/25 rounded-xl py-3.5 pl-6 pr-12 text-[#e8dcc8] font-lora text-base tracking-[0.08em] outline-none text-center transition-all duration-250 form-input-focus
                ${isShake ? 'animate-shake border-[#e05252] shadow-[0_0_0_3px_rgba(224,82,82,0.15)]' : ''}`}
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-none border-none text-[#a89880] hover:text-[#d4a853] cursor-pointer text-base p-1 transition-colors duration-200"
              title="Show/hide password"
            >
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>

          {/* Lock Error Msg */}
          <div className={`font-sans text-[0.78rem] text-[#e05252] min-h-[1.2em] text-center transition-opacity duration-300 ${errorMsg ? 'opacity-100' : 'opacity-0'}`}>
            {errorMsg}
          </div>

          {/* Lock Attempts Dots */}
          <div className="flex gap-1.5 justify-center mb-1">
            <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${attempts >= 1 ? 'bg-[#e05252]' : 'bg-white/15'}`} />
            <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${attempts >= 2 ? 'bg-[#e05252]' : 'bg-white/15'}`} />
            <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${attempts >= 3 ? 'bg-[#e05252]' : 'bg-white/15'}`} />
          </div>

          {/* Unlock Button */}
          <button 
            type="submit"
            disabled={lockoutTime > 0}
            className="w-full bg-gradient-to-r from-[#7c2d3a] via-[#c4869a] to-[#d4a853] py-3.5 px-8 rounded-xl text-white font-playfair font-semibold text-base tracking-[0.04em] cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:opacity-95 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed animate-gradient-shift"
          >
            ✨ Open the Library
          </button>

          {/* Lock Hint */}
          <div className="font-sans text-[0.72rem] text-[#a89880] tracking-[0.06em] mt-1.5 opacity-70">
            Hint: Every great story has a beginning ✨
          </div>
        </form>
      </div>
    </div>
  );
}
