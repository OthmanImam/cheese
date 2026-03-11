'use client';

import { useEffect, useState } from 'react';

const USERNAMES = [
  '@alex', '@sarah', '@david', '@maya', '@james', '@zara',
  '@michael', '@luna', '@kai', '@priya', '@noah', '@ada',
  '@felix', '@nia', '@omar', '@yuki', '@liam', '@sofia',
];

export function HeroSection() {
  const [displayCount, setDisplayCount] = useState(0);
  const TARGET = 2847;

  useEffect(() => {
    const duration = 1800;
    const start = Date.now();
    const tick = setInterval(() => {
      const t = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayCount(Math.floor(eased * TARGET));
      if (t >= 1) clearInterval(tick);
    }, 16);
    return () => clearInterval(tick);
  }, []);

  return (
    <section className="relative pt-32 pb-16 px-6 text-center">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 py-5 bg-[rgba(10,10,10,0.85)] backdrop-blur-md border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🧀</span>
          <span className="font-display text-xl font-bold text-white tracking-tight">Cheese</span>
        </div>
        <a
          href="#waitlist"
          className="hidden sm:inline-flex items-center text-sm font-semibold text-[#0a0a0a] bg-[#d4a843] hover:bg-[#c49535] px-4 py-2 rounded-full transition-colors"
        >
          Reserve username
        </a>
      </nav>

      {/* Live count pill */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#d4a843]/30 bg-[#d4a843]/10 mb-10 opacity-0 animate-fade-up delay-100">
        <span className="w-2 h-2 rounded-full bg-[#d4a843] animate-pulse" />
        <span className="text-xs font-medium text-[#d4a843] tracking-wide">
          {displayCount.toLocaleString()} usernames reserved
        </span>
      </div>

      {/* Headline */}
      <h1
        className="font-display text-6xl sm:text-7xl md:text-8xl font-bold text-white leading-[0.95] mb-6 opacity-0 animate-fade-up delay-200"
        style={{ letterSpacing: '-0.03em' }}
      >
        Reserve your
        <br />
        <span className="text-shimmer">Cheese username</span>
        <br />
        before it&apos;s taken.
      </h1>

      {/* Subtext */}
      <p className="max-w-md mx-auto text-lg text-[#888] leading-relaxed mb-12 opacity-0 animate-fade-up delay-300">
        Cheese is a USD wallet where your username{' '}
        <em className="text-white not-italic">is</em> your bank account.
        Send money to anyone, anywhere.
      </p>

      {/* Marquee — @keyframes marquee defined in tailwind.config.js */}
      <div className="overflow-hidden mb-16 opacity-0 animate-fade-up delay-400" aria-hidden="true">
        <div className="flex gap-4 w-max animate-marquee">
          {[...USERNAMES, ...USERNAMES].map((u, i) => (
            <span
              key={i}
              className="px-4 py-2 rounded-full border border-white/[0.08] text-sm text-[#555] font-mono whitespace-nowrap"
            >
              {u}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
