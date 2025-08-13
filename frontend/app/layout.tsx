import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { QueryProvider } from "@/providers/QueryProvider";
import { FilterProvider } from "@/contexts/FilterContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Auto Leads Directory - Find Your Perfect Vehicle in Memphis, TN",
  description: "Browse quality pre-owned vehicles from trusted Buy Here Pay Here dealers in Memphis. Easy financing, low down payments, and quick approval for all credit types.",
  keywords: "buy here pay here, Memphis auto dealers, used cars Memphis, bad credit auto loans, subprime auto financing",
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
