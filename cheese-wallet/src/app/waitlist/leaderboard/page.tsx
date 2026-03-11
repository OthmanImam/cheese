'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { Trophy, Users, ArrowLeft, Zap } from 'lucide-react';
import Link from 'next/link';
import { getLeaderboard, type LeaderboardEntry } from '@/lib/api';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-xl">🥇</span>;
  if (rank === 2) return <span className="text-xl">🥈</span>;
  if (rank === 3) return <span className="text-xl">🥉</span>;
  return <span className="text-sm font-mono text-[#444] w-6 text-right">{rank}</span>;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLive, setIsLive] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: getLeaderboard,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (data) { setEntries(data.entries); setTotal(data.total); }
  }, [data]);

  useEffect(() => {
    const socket: Socket = io(`${WS_URL}/leaderboard`, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 3000,
    });
    socket.on('connect', () => setIsLive(true));
    socket.on('disconnect', () => setIsLive(false));
    socket.on('leaderboard:update', (data: LeaderboardEntry[]) => setEntries(data));
    socket.emit('leaderboard:subscribe');
    return () => { socket.disconnect(); };
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-6 py-16">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[radial-gradient(ellipse_at_top,rgba(212,168,67,0.05)_0%,transparent_70%)]" />
      </div>

      <div className="relative max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#555] hover:text-white mb-10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to waitlist
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8 opacity-0 animate-fade-up">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-[#d4a843]" />
              <span className="text-xs text-[#d4a843] uppercase tracking-widest font-medium">Founding Members</span>
            </div>
            <h1 className="font-display text-5xl font-bold text-white tracking-tight">Leaderboard</h1>
          </div>
          <div className="flex flex-col items-end gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-[#d4a843] animate-pulse' : 'bg-[#333]'}`} />
              <span className="text-xs text-[#555]">{isLive ? 'Live' : 'Offline'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#555]">
              <Users className="w-3.5 h-3.5" />
              <span>{total.toLocaleString()} members</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden opacity-0 animate-fade-up delay-100">
          <div className="grid grid-cols-[40px_1fr_80px] gap-4 px-6 py-3.5 border-b border-white/[0.05]">
            <span className="text-[10px] text-[#444] uppercase tracking-widest">Rank</span>
            <span className="text-[10px] text-[#444] uppercase tracking-widest">Username</span>
            <span className="text-[10px] text-[#444] uppercase tracking-widest text-right">Points</span>
          </div>

          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[40px_1fr_80px] gap-4 px-6 py-4 border-b border-white/[0.03] animate-pulse">
                <div className="h-4 w-6 bg-[#222] rounded" />
                <div className="h-4 w-32 bg-[#222] rounded" />
                <div className="h-4 w-16 bg-[#222] rounded ml-auto" />
              </div>
            ))
          ) : entries.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-[#444] text-sm">No entries yet.</p>
              <p className="text-[#333] text-xs mt-1">Be the first to join!</p>
            </div>
          ) : (
            entries.map((entry, i) => (
              <div
                key={entry.username}
                className={`grid grid-cols-[40px_1fr_80px] items-center gap-4 px-6 py-4 border-b border-white/[0.03] last:border-0 transition-colors ${
                  i < 3 ? 'bg-[#d4a843]/[0.015]' : 'hover:bg-white/[0.01]'
                }`}
              >
                <div className="flex items-center justify-center">
                  <RankBadge rank={entry.rank} />
                </div>
                <span className={`font-mono text-sm truncate ${i < 3 ? 'text-white font-medium' : 'text-[#777]'}`}>
                  @{entry.username}
                </span>
                <div className="flex items-center justify-end gap-1.5">
                  {i < 3 && <Zap className="w-3 h-3 text-[#d4a843]" />}
                  <span className={`font-mono text-sm font-semibold ${i < 3 ? 'text-[#d4a843]' : 'text-[#555]'}`}>
                    {entry.points.toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* CTA */}
        <div className="mt-6 text-center opacity-0 animate-fade-up delay-200">
          <p className="text-sm text-[#555] mb-3">Not on the list yet?</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#d4a843] hover:bg-[#c49535] text-[#0a0a0a] font-semibold text-sm px-6 py-3 rounded-xl transition-colors"
          >
            Reserve My Username →
          </Link>
        </div>
      </div>
    </main>
  );
}
