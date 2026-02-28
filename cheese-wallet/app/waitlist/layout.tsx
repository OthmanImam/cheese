import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join the Waitlist — Cheese Wallet",
  description:
    "Reserve your username and claim your early access spot. First 5,000 get Gold benefits free for 90 days.",
};

export default function WaitlistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
