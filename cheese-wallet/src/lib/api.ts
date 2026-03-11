import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Types ────────────────────────────────────────────────────────────────────

export interface RegisterPayload {
  email: string;
  username: string;
  referralCode?: string;
}

export interface RegisterResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    username: string;
    referralCode: string;
    points: number;
    createdAt: string;
  };
  referralLink: string;
}

export interface UsernameCheckResponse {
  available: boolean;
  username: string;
  reason?: string;
}

export type SharePlatform = 'twitter' | 'linkedin' | 'whatsapp' | 'telegram' | 'facebook';

export interface SharePayload {
  userId: string;
  platform: SharePlatform;
}

export interface ShareResponse {
  success: boolean;
  shareEventId: string;
  message: string;
  pendingPoints: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  points: number;
  joinDate: string;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
}

export interface PointsResponse {
  points: number;
  shareCount: number;
  referralCount: number;
}

export interface RankResponse {
  rank: number | null;
}

// ── API Functions ────────────────────────────────────────────────────────────

export async function registerWaitlist(payload: RegisterPayload): Promise<RegisterResponse> {
  const { data } = await api.post<RegisterResponse>('/waitlist/register', payload);
  return data;
}

export async function checkUsername(username: string): Promise<UsernameCheckResponse> {
  const { data } = await api.get<UsernameCheckResponse>('/waitlist/check-username', {
    params: { username },
  });
  return data;
}

export async function trackShare(payload: SharePayload): Promise<ShareResponse> {
  const { data } = await api.post<ShareResponse>('/waitlist/share', payload);
  return data;
}

export async function getLeaderboard(): Promise<LeaderboardResponse> {
  const { data } = await api.get<LeaderboardResponse>('/waitlist/leaderboard');
  return data;
}

export async function getReferralInfo(code: string) {
  const { data } = await api.get(`/waitlist/referral/${code}`);
  return data;
}

export async function getUserPoints(userId: string): Promise<PointsResponse> {
  const { data } = await api.get<PointsResponse>(`/waitlist/points/${userId}`);
  return data;
}

export async function getUserRank(userId: string): Promise<RankResponse> {
  const { data } = await api.get<RankResponse>(`/waitlist/leaderboard/rank/${userId}`);
  return data;
}
