'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { getLeaderboard } from '@/lib/api';

export function LeaderboardPreview() {
  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard-preview'],
    queryFn: getLeaderboard,
    refetchInterval: 30_000,
  });

  const top5 = data?.entries?.slice(0, 5) || [];

  return (
    <section className="px-6 py-16 max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-[#d4a843]" />
          <span className="text-xs text-[#d4a843] uppercase tracking-widest font-medium">Founding Members</span>
        </div>
        <h2 className="font-display text-4xl font-bold text-white tracking-tight">Leaderboard</h2>
        <p className="text-xl text-[#555] mt-2">Top 100 members get $5 after their first transaction .</p>
      </div>

      <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden mb-4">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-6 h-4 bg-[#222] rounded" />
                <div className="h-4 bg-[#222] rounded flex-1" />
                <div className="w-14 h-4 bg-[#222] rounded" />
              </div>
            ))}
          </div>
        ) : top5.length === 0 ? (
          <div className="py-10 text-center text-[#444] text-sm">Be the first to join!</div>
        ) : (
          top5.map((entry) => (
            <div key={entry.username} className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.04] last:border-0">
              <span className="text-sm font-mono text-[#d4a843] w-4 font-bold">{entry.rank}</span>
              <span className="flex-1 text-sm font-mono text-[#888]">@{entry.username}</span>
              <span className="text-sm font-semibold text-[#d4a843] font-mono">{entry.points.toLocaleString()} pts</span>
            </div>
          ))
        )}
      </div>

      <Link
        href="/waitlist/leaderboard"
        className="flex items-center justify-center gap-2 w-full py-3.5 text-sm text-[#666] hover:text-white border border-white/[0.06] hover:border-white/10 rounded-xl transition-colors"
      >
        View full leaderboard →
      </Link>
    </section>
  );
}
