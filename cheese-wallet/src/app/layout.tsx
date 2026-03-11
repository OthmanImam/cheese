// import type { Metadata } from 'next'
// import { QueryProvider } from '@/providers/QueryProvider'
// import { ThemeProvider } from '@/providers/ThemeProvider'

// export const metadata: Metadata = {
//   title: 'Cheese Wallet — Dollar Wallet for Smart Nigerians',
//   description: 'Hold your money in US dollars. Send and receive Naira instantly. Built for Nigeria.',
//   openGraph: {
//     type: 'website',
//     title: 'Cheese Wallet',
//     description: 'Dollar wallet for smart Nigerians',
//     siteName: 'Cheese Wallet',
//   },
//   icons: { icon: '/icons/icon-192.png' },
// }

// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <html lang="en">
//       <head>
//         <link rel="preconnect" href="https://fonts.googleapis.com" />
//         <link
//           href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=DM+Mono:wght@300;400&family=Syne:wght@400;500;700;800&display=swap"
//           rel="stylesheet"
//         />
//       </head>
//       <body style={{ margin: 0, padding: 0 }}>
//         <QueryProvider>
//           <ThemeProvider>
//             {children}
//           </ThemeProvider>
//         </QueryProvider>
//       </body>
//     </html>
//   )
// }
import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import { Providers } from '@/lib/providers';

export const metadata: Metadata = {
  title: 'Cheese Wallet — Reserve Your Username',
  description: 'Cheese is a USD wallet where you send money with a username. Reserve yours before launch.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://cheese.app'),
  openGraph: {
    title: 'Reserve your @username on Cheese Wallet',
    description: 'Send money to anyone with just a username. Secure yours before launch.',
    images: ['/og-image.png'],
    url: 'https://cheese.app',
    siteName: 'Cheese Wallet',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reserve your @username on Cheese Wallet',
    description: 'Send money to anyone with just a username. Secure yours before launch.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#d4a843', secondary: '#0a0a0a' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
