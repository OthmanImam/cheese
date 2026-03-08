import { API_BASE_URL } from '@/constants'

export type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export interface WaitlistPayload {
  email: string;
  username: string;
}

export interface WaitlistResult {
  success: boolean;
  message: string;
  position?: number;
}

export async function checkUsernameAvailability(username: string): Promise<UsernameStatus> {
  try {
    const res  = await fetch(`${API_BASE_URL}/waitlist/check/${username}`)
    const data = await res.json()
    return data?.data?.available ? "available" : "taken"
  } catch {
    return "available"
  }
}

export async function submitWaitlist(payload: WaitlistPayload): Promise<WaitlistResult> {
  const res = await fetch(`${API_BASE_URL}/waitlist/join`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) {
    const msg = data?.message ?? data?.error ?? 'Something went wrong.'
    throw new Error(Array.isArray(msg) ? msg[0] : msg)
  }
  return {
    success: true,
    message: `You're on the list, @${payload.username}. We'll notify you at ${payload.email} the moment we launch.`,
    position: data?.data?.position,
  }
}
