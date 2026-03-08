"use client";

import { useEffect, useRef, useState } from "react";
import { checkUsernameAvailability, UsernameStatus } from "@/lib/waitlist";

interface UsernameFieldProps {
  value: string;
  onChange: (v: string) => void;
  onStatusChange: (s: UsernameStatus) => void;
}

const VALID_RE = /^[a-z0-9_]*$/;

function sanitise(v: string) {
  return v.toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_]/g, "");
}

export default function UsernameField({ value, onChange, onStatusChange }: UsernameFieldProps) {
  const [status, setStatus] = useState<UsernameStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateStatus = (s: UsernameStatus) => {
    setStatus(s);
    onStatusChange(s);
  };

  useEffect(() => {
    if (value.length < 4) { updateStatus("idle"); return; }
    if (!VALID_RE.test(value)) { updateStatus("invalid"); return; }
    updateStatus("checking");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const s = await checkUsernameAvailability(value);
      updateStatus(s);
    }, 600);
    return () => { if (timer.current) clearTimeout(timer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const borderColor =
    status === "available" ? "rgba(60,184,122,0.4)" :
    status === "taken" || status === "invalid" ? "rgba(224,92,92,0.5)" :
    "rgba(201,168,76,0.2)";

  const badgeConfig: Record<string, { color: string; bg: string; text: string }> = {
    checking:  { color: "rgba(245,238,216,0.5)", bg: "rgba(245,238,216,0.06)", text: "Checking…" },
    available: { color: "#3CB87A", bg: "rgba(60,184,122,0.08)", text: "✓ Available" },
    taken:     { color: "#E05C5C", bg: "rgba(224,92,92,0.08)", text: "✗ Already reserved" },
    invalid:   { color: "#E05C5C", bg: "rgba(224,92,92,0.08)", text: "Letters, numbers & _ only" },
  };
  const badge = badgeConfig[status];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" as const, color: "rgba(245,238,216,0.5)" }}>
          Reserve a Username
        </label>
        {badge && (
          <span style={{ fontSize: 11, fontWeight: 600, color: badge.color, background: badge.bg, padding: "3px 10px", letterSpacing: "0.5px" }}>
            {badge.text}
          </span>
        )}
      </div>

      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "rgba(245,238,216,0.3)", fontSize: 15, pointerEvents: "none", fontFamily: "var(--font-syne)" }}>@</span>
        <input
          type="text"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(sanitise(e.target.value))}
          placeholder="yourname"
          autoComplete="username"
          maxLength={20}
          style={{
            width: "100%",
            background: "var(--charcoal)",
            border: `1px solid ${borderColor}`,
            color: "var(--cream)",
            padding: "15px 16px 15px 32px",
            fontSize: 15,
            fontFamily: "var(--font-syne)",
            outline: "none",
            transition: "border-color 0.25s",
            display: "block",
            boxSizing: "border-box" as const,
          }}
          onFocus={(e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = "var(--gold)")}
          onBlur={(e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = borderColor)}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <p style={{ fontSize: 11.5, color: "rgba(245,238,216,0.3)", letterSpacing: "0.3px" }}>
          Min 4 chars · letters, numbers, underscore
        </p>
        <p style={{ fontSize: 11.5, color: "rgba(245,238,216,0.3)", letterSpacing: "0.3px" }}>
          {value.length}/20
        </p>
      </div>

      {status === "available" && (
        <p style={{ fontSize: 12, color: "rgba(245,238,216,0.35)", marginTop: 8, lineHeight: 1.5, letterSpacing: "0.2px" }}>
          Your reserved username will be locked for 3 months after launch. No other user can claim it.
        </p>
      )}
    </div>
  );
}
