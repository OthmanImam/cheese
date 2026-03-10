export function Footer() {
  return (
    <footer className="border-t border-white/[0.04] px-6 py-10 text-center">
      <p className="text-2xl mb-3">🧀</p>
      <p className="text-xs text-[#333] tracking-wide">
        © {new Date().getFullYear()} Cheese Wallet. All rights reserved.
      </p>
      <p className="text-xs text-[#222] mt-1">USD wallets for the modern world.</p>
    </footer>
  );
}
