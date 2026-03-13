/*
 * HOMEPAGE - Using Waitlist Page Components
 * 
 * The original full landing page has been commented out.
 * We're now using the waitlist page components for the homepage.
 * 
 * To restore the original landing page:
 * 1. See page-backup.tsx for archived content
 * 2. Or check git history for the full page code
 */


import { Suspense } from 'react'
import type { Metadata } from 'next'
import { HeroSection } from '@/components/sections/HeroSection'
import { WaitlistForm } from '@/components/sections/WaitlistForm'
import { FeaturesSection } from '@/components/sections/FeaturesSection'
import { LeaderboardPreview } from '@/components/sections/LeaderboardPreview'
import { Footer } from '@/components/sections/Footer'

function FormSkeleton() {
  return (
    <section id="waitlist" className="px-6 pb-24">
      <div className="max-w-lg mx-auto bg-[#111] border border-white/[0.07] rounded-2xl p-8 animate-pulse">
        <div className="h-8 w-48 bg-[#1a1a1a] rounded mb-2" />
        <div className="h-4 w-64 bg-[#1a1a1a] rounded mb-8" />
        <div className="space-y-4" />
      </div>
    </section>
  )
}

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <div className="flex flex-col lg:flex-row items-start gap-8 px-6 pb-24 max-w-7xl mx-auto">
        <div className="flex-1 w-full">
          <Suspense fallback={<FormSkeleton />}>
            <WaitlistForm />
          </Suspense>
        </div>
        <div className="flex-1 w-full">
          <LeaderboardPreview />
        </div>
      </div>
      <FeaturesSection />
      <Footer />
    </>
  )
}
