import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';

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
  const { data: response } = await api.post<{ success: boolean; data: RegisterResponse }>(
    '/waitlist/register',
    payload
  );
  return response.data;
}

export async function checkUsername(username: string): Promise<UsernameCheckResponse> {
  try {
    const { data: response } = await api.get<{ success: boolean; data: UsernameCheckResponse }>(
      '/waitlist/check-username',
      { params: { username } }
    );
    return response.data;
  } catch (error: any) {
    // Validation error from backend (400 Bad Request)
    if (error.response?.status === 400) {
      // Return error message but mark as unavailable
      return {
        available: false,
        username,
        reason: error.response?.data?.message || 'Invalid username format',
      };
    }
    // Network or server errors - treat as unavailable
    return {
      available: false,
      username,
      reason: 'Unable to check availability',
    };
  }
}

export async function trackShare(payload: SharePayload): Promise<ShareResponse> {
  const { data: response } = await api.post<{ success: boolean; data: ShareResponse }>(
    '/waitlist/share',
    payload
  );
  return response.data;
}

export async function getLeaderboard(): Promise<LeaderboardResponse> {
  const { data: response } = await api.get<{ success: boolean; data: LeaderboardResponse }>(
    '/waitlist/leaderboard'
  );
  return response.data;
}

export async function getReferralInfo(code: string) {
  const { data: response } = await api.get<{ success: boolean; data: any }>(
    `/waitlist/referral/${code}`
  );
  return response.data;
}

export async function getUserPoints(userId: string): Promise<PointsResponse> {
  const { data: response } = await api.get<{ success: boolean; data: PointsResponse }>(
    `/waitlist/points/${userId}`
  );
  return response.data;
}

export async function getUserRank(userId: string): Promise<RankResponse> {
  const { data: response } = await api.get<{ success: boolean; data: RankResponse }>(
    `/waitlist/leaderboard/rank/${userId}`
  );
  return response.data;
}
