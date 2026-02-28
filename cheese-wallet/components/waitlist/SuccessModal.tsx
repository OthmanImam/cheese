"use client";

import Link from "next/link";
import { useEffect } from "react";

interface SuccessModalProps {
  username: string;
  email: string;
  onClose: () => void;
}

export default function SuccessModal({ username, email, onClose }: SuccessModalProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(8,8,8,0.92)",
        backdropFilter: "blur(18px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
        animation: "fadeIn 0.3s ease forwards",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--charcoal-2)",
          border: "1px solid rgba(201,168,76,0.25)",
          maxWidth: 480, width: "100%",
          padding: "56px 48px",
          position: "relative",
          animation: "modalSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        }}
      >
        {/* Gold top bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--gold), var(--gold-light))" }} />

        {/* Success icon */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72,
            border: "1.5px solid var(--gold)",
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(201,168,76,0.08)",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h2 style={{
          fontFamily: "var(--font-playfair)", fontSize: "clamp(26px,3.5vw,34px)",
          fontWeight: 900, lineHeight: 1.15, textAlign: "center",
          marginBottom: 16,
        }}>
          You&apos;re on the<br />
          <em style={{ color: "var(--gold)", fontStyle: "italic" }}>waitlist.</em>
        </h2>

        {/* Username reservation confirmation */}
        <div style={{
          background: "rgba(201,168,76,0.06)",
          border: "1px solid rgba(201,168,76,0.18)",
          padding: "14px 20px",
          marginBottom: 20,
          textAlign: "center",
        }}>
          <span style={{ fontFamily: "var(--font-bebas)", fontSize: 18, letterSpacing: 3, color: "var(--gold)" }}>
            @{username}
          </span>
          <span style={{ display: "block", fontSize: 11, color: "rgba(245,238,216,0.4)", letterSpacing: "1px", marginTop: 4 }}>
            USERNAME RESERVED
          </span>
        </div>

        {/* Body copy */}
        <p style={{ fontSize: 14, lineHeight: 1.75, color: "var(--cream-dim)", textAlign: "center", marginBottom: 8 }}>
          We&apos;ll notify <strong style={{ color: "var(--cream)", fontWeight: 600 }}>{email}</strong> the moment Cheese launches.
          Your username is locked — no one else can claim it for 3 months after launch.
        </p>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(201,168,76,0.1)", margin: "28px 0" }} />

        {/* CTA */}
        <Link
          href="/"
          style={{
            display: "block", width: "100%",
            background: "var(--gold)", color: "var(--black)",
            padding: "16px", textAlign: "center",
            fontSize: 13, fontWeight: 700, letterSpacing: "2px",
            textTransform: "uppercase", textDecoration: "none",
            transition: "background 0.3s",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--gold-light)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--gold)")}
        >
          Back to Home
        </Link>

        <p style={{ fontSize: 11, color: "rgba(245,238,216,0.25)", textAlign: "center", marginTop: 16, letterSpacing: "0.5px" }}>
          Share the word — the list fills fast.
        </p>
      </div>

      <style>{`
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
