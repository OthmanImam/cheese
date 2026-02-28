export type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export interface WaitlistPayload {
  email: string;
  username: string;
}

export interface WaitlistResult {
  success: boolean;
  message: string;
}

const TAKEN_USERNAMES = new Set([
  "cheese",
  "admin",
  "support",
  "temi",
  "fatimah",
  "adebisi",
  "chukwuemeka",
  "blackcard",
  "goldtier",
  "naira",
]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function checkUsernameAvailability(username: string): Promise<UsernameStatus> {
  await sleep(800);
  return TAKEN_USERNAMES.has(username.toLowerCase()) ? "taken" : "available";
}

export async function submitWaitlist(payload: WaitlistPayload): Promise<WaitlistResult> {
  await sleep(1200);
  return {
    success: true,
    message: `You're on the list, @${payload.username}. We'll notify you at ${payload.email} the moment we launch.`,
  };
}
