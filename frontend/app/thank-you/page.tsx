'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

function ThankYouContent() {
  const searchParams = useSearchParams();
  const confirmationNumber = searchParams.get('confirmation');

  return (
    <div className="max-w-md w-full">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-text-primary mb-4">
          Thank You for Your Interest!
        </h1>
        
        <p className="text-text-secondary mb-6">
          We've received your request and a dealer representative will contact you within 24-48 hours.
        </p>
        
        {confirmationNumber && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-text-secondary mb-1">Confirmation Number</p>
            <p className="font-semibold text-primary">{confirmationNumber}</p>
          </div>
        )}
        
        <div className="space-y-4">
          <div className="text-left">
            <h3 className="font-semibold text-text-primary mb-2">What happens next?</h3>
            <ul className="text-sm text-text-secondary space-y-1">
              <li className="flex items-start">
                <span className="text-primary mr-2">1.</span>
                A dealer representative will review your information
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">2.</span>
                They'll contact you to discuss vehicle options and financing
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">3.</span>
                Schedule a test drive and complete your application
              </li>
            </ul>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Important:</strong> If you don't hear from us within 48 hours, please call us at <span className="font-semibold">(901) 555-0123</span>
            </p>
          </div>
        </div>
        
        <div className="mt-8 space-y-3">
          <Link href="/" className="block">
            <Button className="w-full">
              Browse More Vehicles
            </Button>
          </Link>
          
          <Link href="/dealers" className="block">
            <Button variant="outline" className="w-full">
              View All Dealers
            </Button>
          </Link>
        </div>
        
        <div className="mt-6 text-xs text-text-secondary">
          <p>Questions? Contact us at support@autoleadsdirectory.com</p>
        </div>
      </div>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Suspense fallback={<div>Loading...</div>}>
        <ThankYouContent />
      </Suspense>
    </div>
  );
}