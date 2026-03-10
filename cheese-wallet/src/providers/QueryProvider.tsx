'use client'

// ─────────────────────────────────────────────────────────
// CHEESE WALLET — React Query Provider
// ─────────────────────────────────────────────────────────

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense, useState, useEffect, type ReactNode } from 'react'

const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((mod) => ({
    default: mod.ReactQueryDevtools,
  }))
)

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 30s by default.
        // Individual hooks override this with STALE_TIMES constants.
        staleTime:     30_000,

        // Retry failed requests twice before surfacing the error.
        retry:         2,
        retryDelay:    (attempt) => Math.min(1000 * 2 ** attempt, 10_000),

        // Refetch when the user returns to the tab
        refetchOnWindowFocus: true,

        // Do NOT refetch when reconnecting (we handle that manually)
        refetchOnReconnect: false,
      },
      mutations: {
        // Surface errors — individual hooks attach onError as needed
        retry: 0,
      },
    },
  })
}

// Singleton for server rendering; fresh instance per browser session
let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  if (typeof window === 'undefined') return makeQueryClient()
  if (!browserQueryClient) browserQueryClient = makeQueryClient()
  return browserQueryClient
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => getQueryClient())

  // When token refresh fails, cheese:query:clear fires — wipe all cached user data.
  useEffect(() => {
    function onAuthCleared() { queryClient.clear() }
    window.addEventListener('cheese:query:clear', onAuthCleared)
    return () => window.removeEventListener('cheese:query:clear', onAuthCleared)
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        </Suspense>
      )}
    </QueryClientProvider>
  )
}
