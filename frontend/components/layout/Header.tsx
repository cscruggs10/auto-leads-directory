'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-surface shadow-sm border-b border-border-light">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="text-2xl font-bold text-primary">
              The Car<span className="text-secondary">Buyer</span> Assistant
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className="text-text-primary hover:text-primary transition-colors"
            >
              Browse Vehicles
            </Link>
            <Link 
              href="/dealers" 
              className="text-text-primary hover:text-primary transition-colors"
            >
              Dealers
            </Link>
            <Link 
              href="/about" 
              className="text-text-primary hover:text-primary transition-colors"
            >
              About
            </Link>
            <Link 
              href="/contact" 
              className="text-text-primary hover:text-primary transition-colors"
            >
              Contact
            </Link>
          </div>

          {/* CTA Button - Desktop */}
          <div className="hidden md:flex">
            <Button variant="primary">
              Get Pre-Approved
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-text-primary hover:text-primary focus:outline-none focus:text-primary"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link
                href="/"
                className="block px-3 py-2 text-text-primary hover:text-primary transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Browse Vehicles
              </Link>
              <Link
                href="/dealers"
                className="block px-3 py-2 text-text-primary hover:text-primary transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Dealers
              </Link>
              <Link
                href="/about"
                className="block px-3 py-2 text-text-primary hover:text-primary transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About
              </Link>
              <Link
                href="/contact"
                className="block px-3 py-2 text-text-primary hover:text-primary transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Contact
              </Link>
              <div className="px-3 py-2">
                <Button variant="primary" className="w-full">
                  Get Pre-Approved
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}