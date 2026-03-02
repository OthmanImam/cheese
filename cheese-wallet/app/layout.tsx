import type { Metadata } from "next";
import { Playfair_Display, Syne, Bebas_Neue } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "900"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-syne",
});

const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-bebas",
});

export const metadata: Metadata = {
  title: "Cheese Wallet — Hold Dollars. Move Different.",
  description:
    "Cheese holds your money in USDC — digital US dollars — so it stays strong no matter what happens to the Naira. Fund it, spend it, earn yield on it.",
  keywords: ["USDC wallet Nigeria", "dollar wallet Nigeria", "crypto payment Nigeria", "Naira inflation hedge"],
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
  openGraph: {
    title: "Cheese Wallet — Hold Dollars. Move Different.",
    description: "Your secure digital dollar wallet for everyday Nigeria.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${syne.variable} ${bebas.variable}`}>
      <body className="font-syne">{children}</body>
    </html>
  );
}
