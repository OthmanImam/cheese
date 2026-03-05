import type { Metadata, Viewport } from 'next'
import './wallet.css'

export const metadata: Metadata = {
  title: 'Cheese Wallet',
  description: 'Your dollar wallet',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Cheese' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function WalletLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      {children}
    </>
  )
}
