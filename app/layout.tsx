import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "RunFuel",
  description: "Your running, cycling, and nutrition training log",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="theme-color" content="#070707" />
      </head>
      <body className="flex min-h-screen bg-[#090909]">
        <Sidebar />
        {/* pb-20 = space for mobile bottom nav; md:pb-0 removes it on desktop */}
        <main className="flex-1 md:ml-60 min-h-screen pb-24 md:pb-0" style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
