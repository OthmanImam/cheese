import type { Metadata } from 'next'
import { QueryProvider } from '@/providers/QueryProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'

export const metadata: Metadata = {
  title: 'Cheese Wallet — Dollar Wallet for Smart Nigerians',
  description: 'Hold your money in US dollars. Send and receive Naira instantly. Built for Nigeria.',
  openGraph: {
    type: 'website',
    title: 'Cheese Wallet',
    description: 'Dollar wallet for smart Nigerians',
    siteName: 'Cheese Wallet',
  },
  icons: { icon: '/icons/icon-192.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=DM+Mono:wght@300;400&family=Syne:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <QueryProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
