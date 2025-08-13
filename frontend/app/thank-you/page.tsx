'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function ThankYouPage() {
  const searchParams = useSearchParams();
  const confirmationNumber = searchParams.get('confirmation');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-success"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Thank You!
          </h1>
          <p className="text-xl text-text-secondary mb-6">
            Your request has been submitted successfully
          </p>

          {confirmationNumber && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-text-secondary mb-1">Confirmation Number</p>
              <p className="text-2xl font-bold text-primary">{confirmationNumber}</p>
            </div>
          )}

          <div className="text-left bg-primary/5 rounded-lg p-6 mb-6">
            <h2 className="font-semibold text-text-primary mb-3">What happens next?</h2>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-primary mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                A dealer representative will contact you within 24-48 hours
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-primary mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                They'll provide detailed pricing and financing options
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-primary mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                You can schedule a test drive at your convenience
              </li>
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-primary mr-2 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Check your email for confirmation and next steps
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <Link href="/" className="block">
              <Button className="w-full" variant="primary">
                Browse More Vehicles
              </Button>
            </Link>
            <Link href="/dealers" className="block">
              <Button className="w-full" variant="outline">
                View All Dealers
              </Button>
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-text-secondary">
              Have questions? Contact us at{' '}
              <a href="mailto:support@autoleadsdirectory.com" className="text-primary hover:underline">
                support@autoleadsdirectory.com
              </a>
              {' '}or call{' '}
              <a href="tel:9015550123" className="text-primary hover:underline">
                (901) 555-0123
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}