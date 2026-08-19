import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz", "SOFT", "WONK"],
  display: "swap",
});

const mono = JetBrains_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Evora - Distributed Job Queue & Workload Fabric",
  description: "-grade distributed job queue engine built on PostgreSQL FOR UPDATE SKIP LOCKED, Transactional Outbox, Event Sourcing, and CQRS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${sans.variable} ${fraunces.variable} ${mono.variable} bg-[#09090b] text-[#f2ede4] font-sans antialiased selection:bg-[#c85a32]/25 selection:text-[#e8845e]`}>
        {children}
      </body>
    </html>
  );
}
