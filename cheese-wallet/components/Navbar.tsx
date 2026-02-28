"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { label: "Offers", href: "#offers" },
  { label: "Tiers", href: "#tiers" },
  { label: "How It Works", href: "#how" },
  { label: "Security", href: "#trust" },
];

export default function Navbar() {
  const [shrunk, setShrunk] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";

  useEffect(() => {
    const onScroll = () => setShrunk(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith("#")) return;
    e.preventDefault();
    setMenuOpen(false);
    if (isHome) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push(`/${href}`);
    }
  };

  return (
    <nav
      className={`nav-base ${shrunk ? "nav-shrunk" : ""}`}
      style={{ padding: shrunk ? "14px 6%" : "22px 6%" }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 no-underline" style={{ fontFamily: "var(--font-bebas)", fontSize: 30, letterSpacing: 4, color: "var(--gold)", textDecoration: "none" }}>
        {/* Cheese wedge icon — Heroicon style: 24px grid, 1.5px stroke, round caps */}
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 1 }}>
          <path d="M2 20h20L12 3 2 20z" />
          <circle cx="9.5" cy="15" r="1.25" strokeWidth={1.5} />
          <circle cx="14.5" cy="13.5" r="1" strokeWidth={1.5} />
          <circle cx="12" cy="18" r="0.875" strokeWidth={1.5} />
        </svg>
        CHEESE
        <span style={{ width: 7, height: 7, background: "var(--cream)", borderRadius: "50%", display: "inline-block", marginBottom: 2 }} />
      </Link>

      {/* Desktop nav */}
      <ul className="hidden md:flex gap-9 list-none">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              onClick={(e) => handleAnchor(e, l.href)}
              style={{ color: "var(--cream-faint)", textDecoration: "none", fontSize: 12, fontWeight: 500, letterSpacing: "1.8px", textTransform: "uppercase", transition: "color 0.3s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--cream-faint)")}
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>

      {/* Desktop CTA */}
      <Link
        href="/waitlist"
        className="hidden md:inline-block"
        style={{ background: "var(--gold)", color: "var(--black)", padding: "11px 26px", fontSize: 12, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", textDecoration: "none", transition: "background 0.3s, transform 0.2s" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--gold-light)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--gold)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
      >
        Get Access
      </Link>

      {/* Mobile hamburger */}
      <button
        className="md:hidden flex flex-col gap-1.5 p-2"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
        style={{ background: "none", border: "none", cursor: "pointer" }}
      >
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ display: "block", width: 22, height: 1.5, background: "var(--gold)", transition: "all 0.3s" }} />
        ))}
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(8,8,8,0.97)", zIndex: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 36 }}
        >
          <button
            onClick={() => setMenuOpen(false)}
            style={{ position: "absolute", top: 28, right: 28, background: "none", border: "none", color: "var(--gold)", fontSize: 28, cursor: "pointer" }}
          >
            ✕
          </button>
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={(e) => handleAnchor(e, l.href)}
              style={{ fontFamily: "var(--font-bebas)", fontSize: 36, letterSpacing: 4, color: "var(--cream)", textDecoration: "none", transition: "color 0.3s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--cream)")}
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/waitlist"
            onClick={() => setMenuOpen(false)}
            style={{ background: "var(--gold)", color: "var(--black)", padding: "14px 36px", fontSize: 13, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", textDecoration: "none", marginTop: 12 }}
          >
            Get Access
          </Link>
        </div>
      )}
    </nav>
  );
}
