'use client';

import { Suspense } from 'react';
import WaitlistForm from './form';

export default function WaitlistPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <WaitlistForm />
    </Suspense>
  );
}
