import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });
const mono = JetBrains_Mono({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Evora - Distributed Job Queue Documentation",
  description: "Production-grade distributed job queue engine built on PostgreSQL FOR UPDATE SKIP LOCKED with Java Client SDK, CQRS Event Sourcing, and Visibility Timeouts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${space.variable} ${mono.variable} bg-[#0a0a0c] text-[#f4f4f5] antialiased`}>
        {children}
      </body>
    </html>
  );
}
