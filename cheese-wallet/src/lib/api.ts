import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';
// console.log('API_BASE:', API_BASE);

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
    const { data } = await api.post<any>('/waitlist/register', payload);
    console.log('Register response:', data);
    return data?.data || data;
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
  try {
    const { data } = await api.post<any>('/waitlist/share', payload);
    return data?.data || data;
  } catch (error: any) {
    console.error('[trackShare] Error:', error);
    throw error;
  }
}

export async function getLeaderboard(): Promise<LeaderboardResponse> {
  try {
    const { data } = await api.get<any>('/leaderboard');
    // Handle wrapped response: { success: true, data: {...} }
    const response = data?.data || data;

    // Normalize both object and array shapes
    if (Array.isArray(response)) {
      return { entries: response, total: response.length };
    }

    if (response && typeof response === 'object') {
      const rawEntries = Array.isArray(response.entries) ? response.entries : [];
      const entriesWithRank = rawEntries.map((entry: any, index: number) => ({
        ...entry,
        rank: typeof entry.rank === 'number' ? entry.rank : index + 1,
      }));
      return {
        entries: entriesWithRank,
        total: typeof response.total === 'number' ? response.total : rawEntries.length,
      };
    }

    return { entries: [], total: 0 };
  } catch (error: any) {
    console.error('[getLeaderboard] Error:', error);
    return { entries: [], total: 0 };
  }
}

export async function getReferralInfo(code: string) {
  try {
    const { data } = await api.get<any>(`/waitlist/referral/${code}`);
    return data?.data || data;
  } catch (error: any) {
    console.error('[getReferralInfo] Error:', error);
    throw error;
  }
}

export async function getUserPoints(userId: string): Promise<PointsResponse> {
  try {
    const { data } = await api.get<any>(`/waitlist/points/${userId}`);
    return data?.data || data;
  } catch (error: any) {
    console.error('[getUserPoints] Error:', error);
    throw error;
  }
}

export async function getUserRank(userId: string): Promise<RankResponse> {
  try {
    const { data } = await api.get<any>(`/leaderboard/rank/${userId}`);
    return data?.data || data;
  } catch (error: any) {
    console.error('[getUserRank] Error:', error);
    throw error;
  }
}




// export async function getReservedUsernamesCount(): Promise<number> {
//   try {
//     const { data } = await api.get<any>('/waitlist/count');
//     console.log('[count] raw response:', JSON.stringify(data));
    
//     const payload = data?.data ?? data;
//     console.log('[count] payload:', JSON.stringify(payload));

//     if (typeof payload === 'number') return payload;
//     if (typeof payload?.count === 'number') return payload.count;

//     return 0;
//   } catch (error: any) {
//     console.error('[getReservedUsernamesCount] Error:', error);
//     return 0;
//   }
// }

export async function getReservedUsernamesCount(): Promise<number> {
  const { data } = await api.get<any>('/waitlist/count');
  
  const value = data?.data ?? data;
  if (typeof value === 'number') return value;
  
  throw new Error('Invalid response format for count');
}