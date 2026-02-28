"use client";

import { useEffect, useRef, useState } from "react";
import { checkUsernameAvailability, UsernameStatus } from "@/lib/waitlist";

interface UsernameFieldProps {
  value: string;
  onChange: (value: string) => void;
  onStatusChange: (status: UsernameStatus) => void;
}

const USERNAME_RE = /^[a-zA-Z0-9_]+$/;

function validate(value: string): string | null {
  if (value.length === 0) return null;
  if (value.length < 4) return "Must be at least 4 characters";
  if (!USERNAME_RE.test(value)) return "Only letters, numbers, and underscores";
  return null;
}

function StatusIndicator({ status }: { status: UsernameStatus }) {
  if (status === "idle") return null;

  const configs: Record<Exclude<UsernameStatus, "idle" | "invalid">, { icon: React.ReactNode; text: string; color: string; bg: string; border: string }> = {
    checking: {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
          <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
      ),
      text: "Checking availability…",
      color: "rgba(245,238,216,0.5)",
      bg: "rgba(245,238,216,0.04)",
      border: "rgba(245,238,216,0.1)",
    },
    available: {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      text: "Available — claim it now",
      color: "var(--green)",
      bg: "rgba(60,184,122,0.06)",
      border: "rgba(60,184,122,0.2)",
    },
    taken: {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      text: "Already reserved — try another",
      color: "#E05C5C",
      bg: "rgba(224,92,92,0.06)",
      border: "rgba(224,92,92,0.2)",
    },
  };

  const cfg = configs[status as keyof typeof configs];
  if (!cfg) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "10px 14px",
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      marginTop: 8,
      color: cfg.color,
      fontSize: 12, fontWeight: 500, letterSpacing: "0.3px",
      transition: "all 0.3s",
    }}>
      {cfg.icon}
      {cfg.text}
    </div>
  );
}

export default function UsernameField({ value, onChange, onStatusChange }: UsernameFieldProps) {
  const [status, setStatus] = useState<UsernameStatus>("idle");
  const [validationError, setValidationError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const error = validate(value);
    setValidationError(error);

    if (!value || error) {
      const next = !value ? "idle" : "invalid";
      setStatus(next);
      onStatusChange(next);
      return;
    }

    setStatus("checking");
    onStatusChange("checking");

    debounceRef.current = setTimeout(async () => {
      try {
        const result = await checkUsernameAvailability(value);
        setStatus(result);
        onStatusChange(result);
      } catch {
        setStatus("idle");
        onStatusChange("idle");
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, onStatusChange]);

  const borderColor = validationError
    ? "rgba(224,92,92,0.5)"
    : status === "available"
    ? "rgba(60,184,122,0.4)"
    : status === "taken"
    ? "rgba(224,92,92,0.5)"
    : "rgba(201,168,76,0.2)";

  const focusBorderColor = "var(--gold)";

  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(245,238,216,0.5)", marginBottom: 10 }}>
        Reserve Username
      </label>

      <div style={{ position: "relative" }}>
        {/* @ prefix */}
        <div style={{
          position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
          fontFamily: "var(--font-bebas)", fontSize: 18, letterSpacing: 1,
          color: "var(--gold)", pointerEvents: "none", lineHeight: 1,
        }}>
          @
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
          placeholder="your_username"
          maxLength={24}
          autoComplete="off"
          spellCheck={false}
          className="waitlist-input"
          style={{
            width: "100%",
            background: "var(--charcoal)",
            border: `1px solid ${borderColor}`,
            color: "var(--cream)",
            padding: "15px 16px 15px 36px",
            fontSize: 15,
            fontFamily: "var(--font-syne)",
            outline: "none",
            transition: "border-color 0.25s",
            "--focus-border": focusBorderColor,
          } as React.CSSProperties}
          onFocus={(e) => (e.currentTarget.style.borderColor = focusBorderColor)}
          onBlur={(e) => (e.currentTarget.style.borderColor = borderColor)}
        />

        {/* Character count */}
        {value.length > 0 && (
          <span style={{
            position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
            fontSize: 11, color: "rgba(245,238,216,0.25)", fontWeight: 500,
          }}>
            {value.length}/24
          </span>
        )}
      </div>

      {/* Validation error */}
      {validationError && value.length > 0 && (
        <p style={{ fontSize: 12, color: "#E05C5C", marginTop: 7, letterSpacing: "0.3px" }}>
          {validationError}
        </p>
      )}

      {/* Availability status */}
      {!validationError && <StatusIndicator status={status} />}

      {/* Reservation notice */}
      <p style={{
        fontSize: 12, lineHeight: 1.6,
        color: "rgba(245,238,216,0.35)",
        marginTop: validationError || status !== "idle" ? 10 : 8,
        letterSpacing: "0.2px",
      }}>
        Your reserved username will be locked for 3 months after launch. No other user can claim it.
      </p>
    </div>
  );
}
