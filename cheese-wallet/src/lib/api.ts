import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3001/v1';

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
  success?: boolean;
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
  try {
    const { data } = await api.post<RegisterResponse>('/waitlist/register', payload);
    console.log('Register response:', data);
    return data;
  } catch (error) {
    console.error('Register error:', error);
    throw error;
  }
}

export async function checkUsername(username: string): Promise<UsernameCheckResponse> {
  try {
    console.log('[checkUsername] Checking:', username);
    const { data } = await api.get<any>('/waitlist/check-username', {
      params: { username },
    });
    
    console.log('[checkUsername] Raw response:', data);
    
    // Handle wrapped response: { success: true, data: {...} }
    const response = data?.data || data;
    
    if (response && typeof response === 'object') {
      return {
        available: response.available === true, // Explicitly check for true
        username: response.username ?? username,
        reason: response.reason,
      };
    }
    
    return { available: true, username, reason: undefined };
  } catch (error: any) {
    const status = error.response?.status;
    const errorData = error.response?.data;
    
    console.error('[checkUsername] ❌ Error:', {
      status,
      message: error.message,
      errorData,
    });
    
    // Handle validation errors (400)
    if (status === 400) {
      let msgStr = 'Invalid username';
      
      if (errorData?.message) {
        msgStr = Array.isArray(errorData.message) 
          ? errorData.message.join(', ')
          : String(errorData.message);
      } else if (errorData?.error) {
        msgStr = String(errorData.error);
      }
      
      console.warn('[checkUsername] Validation error:', msgStr);
      return {
        available: true, // Don't block on validation errors
        username,
        reason: msgStr,
      };
    }
    
    // For any other error, return available to not block
    console.warn('[checkUsername] Other error, treating as available');
    return {
      available: true,
      username,
      reason: error.message || 'Could not verify',
    };
  }
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
