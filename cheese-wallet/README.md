# Cheese Wallet — Next.js PWA

A custodial USDC dollar wallet for Nigerians, built as an installable Progressive Web App.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| PWA | @ducanh2912/next-pwa + Workbox |
| Client state | **Zustand** |
| Server state | **TanStack React Query v5** |
| HTTP client | Axios (with auto token refresh) |
| Language | TypeScript 5 |

## State Management Architecture

### Zustand stores (`src/lib/stores/`)
| Store | Owns |
|---|---|
| `authStore` | User session, device key, auth screen, signup temp data |
| `uiStore` | Theme, active screen, modals, balance visibility, send/bank flow |
| `walletStore` | Cached exchange rate, pending transaction tracking |

### React Query hooks (`src/lib/hooks/`)
| Hook file | Covers |
|---|---|
| `useAuth.ts` | Login, signup, OTP, device registration, logout |
| `useWallet.ts` | Balance, address, transactions, send |
| `useBanks.ts` | Bank list, account resolve, bank transfer, exchange rate, card |

### API services (`src/lib/api/`)
| File | Endpoints |
|---|---|
| `client.ts` | Axios instance, Bearer token inject, 401 → refresh logic |
| `auth.ts` | All `/auth/*` and `/devices/*` calls |
| `wallet.ts` | Wallet, transactions, send, banks, rates, card |

### Key design decisions
- **Access token lives in memory only** (`tokenStore` in `api/client.ts`) — never localStorage
- **Refresh token is an httpOnly cookie** — set by the server, invisible to JS
- **Device key persisted in sessionStorage** via Zustand persist middleware
- **Theme persisted in localStorage** — survives browser restarts
- React Query **invalidates balance + transactions** after every mutating operation

## Theme

The app ships with two themes toggled by the 🌙 / ☀️ button:

| | Dark (default) | Light |
|---|---|---|
| Background | `#0a0904` | `#ffffff` |
| Text | `#f0e8d0` | `#111111` |
| Accent | Gold `#c9a84c` | Black `#111111` |
| Gradients | Yes | **None** |

Theme preference is persisted to `localStorage` under `cheese-theme`.

## Getting started

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit NEXT_PUBLIC_API_URL to point at your NestJS backend

# 3. Run dev server
npm run dev          # http://localhost:3000
# → /           landing page
# → /wallet     full PWA wallet app

# 4. Production build
npm run build && npm start
```

## Deploy to Vercel

```bash
# Push to GitHub, connect repo in Vercel dashboard.
# Add environment variable:
#   NEXT_PUBLIC_API_URL = https://your-nestjs-api.railway.app/v1
```

## Consuming endpoints

When you're ready to wire up the real API:

1. All API functions are stubs in `src/lib/api/auth.ts` and `src/lib/api/wallet.ts`
2. React Query hooks in `src/lib/hooks/` are already set up — just ensure the backend URL is correct in `.env.local`
3. Replace the mock UI logic in `wallet/page.tsx` with proper React components that call the hooks

## Project structure

```
src/
├── app/
│   ├── layout.tsx          Root layout (QueryProvider + ThemeProvider)
│   ├── page.tsx            Landing page
│   └── wallet/
│       ├── layout.tsx      PWA meta tags (manifest, apple-web-app)
│       └── page.tsx        Full wallet app (vanilla JS prototype)
├── constants/
│   └── index.ts            API base URL, ENDPOINTS, QUERY_KEYS, STALE_TIMES
├── lib/
│   ├── api/
│   │   ├── client.ts       Axios instance + token refresh interceptor
│   │   ├── auth.ts         Auth API functions
│   │   └── wallet.ts       Wallet/bank/card API functions
│   ├── hooks/
│   │   ├── useAuth.ts      Auth React Query hooks
│   │   ├── useWallet.ts    Wallet React Query hooks
│   │   └── useBanks.ts     Banks/rates/card React Query hooks
│   └── stores/
│       ├── authStore.ts    Zustand auth store
│       ├── uiStore.ts      Zustand UI store
│       └── walletStore.ts  Zustand wallet store
├── providers/
│   ├── QueryProvider.tsx   TanStack QueryClient setup
│   └── ThemeProvider.tsx   Syncs Zustand theme → data-theme attribute
└── types/
    └── index.ts            All TypeScript interfaces
```
