import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { QueryProvider } from "@/providers/QueryProvider";
import { FilterProvider } from "@/contexts/FilterContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "The Car Buyer Assistant - Stop Begging Dealerships, Make Them Compete for YOU",
  description: "We'll share your info with our network of 50+ dealerships who WANT subprime buyers. Watch them fight to earn your business with their best offers.",
  keywords: "subprime auto financing, bad credit car loans, dealership competition, car buying assistant, Memphis auto financing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-background`}>
        <QueryProvider>
          <FilterProvider>
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
          </FilterProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
