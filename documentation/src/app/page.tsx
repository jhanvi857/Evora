"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import SearchModal from "@/components/SearchModal";
import CodeBlock from "@/components/CodeBlock";
import { ArrowRight, Terminal, Shield, Zap, Database, Cpu, Layers } from "lucide-react";

export default function LandingPage() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 flex flex-col">
      <Navbar onOpenSearch={() => setIsSearchOpen(true)} />
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-[#121215] border border-[#27272a] px-3.5 py-1.5 rounded-full text-xs text-zinc-300 mb-8">
            <span className="w-2 h-2 rounded-full bg-brandSuccess"></span>
            <span>Evora v1.0.0 is Live & Ready for Production</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            The Lock-Free Distributed Job Queue Engine for PostgreSQL.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto font-sans leading-relaxed">
            Eliminate Redis and RabbitMQ operational overhead. Execute atomic, lock-free queue polling using PostgreSQL native <code className="text-brandPrimary bg-[#18181b] px-1.5 py-0.5 rounded font-mono text-sm">FOR UPDATE SKIP LOCKED</code>.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/docs"
              className="w-full sm:w-auto bg-brandPrimary hover:bg-brandPrimaryHover text-white font-semibold px-6 py-3 rounded-md text-sm flex items-center justify-center gap-2 transition"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="http://localhost:8080"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-[#18181b] border border-[#27272a] hover:border-zinc-500 text-zinc-200 font-semibold px-6 py-3 rounded-md text-sm flex items-center justify-center gap-2 transition"
            >
              <Terminal className="w-4 h-4 text-brandSuccess" />
              <span>Launch Operations Console</span>
            </a>
          </div>

          {/* Quick Terminal Code Box */}
          <div className="mt-14 max-w-2xl mx-auto text-left">
            <CodeBlock
              filename="Terminal Quickstart"
              language="bash"
              code={`# 1. Start PostgreSQL & MongoDB infrastructure
docker-compose up -d

# 2. Run Evora Distributed Queue Engine
mvn clean compile exec:java -Dexec.mainClass="com.evora.EvoraApplication"

# 3. Run Runnable Client SDK Demo
mvn exec:java -Dexec.mainClass="com.evora.demo.EvoraWorkerDemo"`}
            />
          </div>
        </section>

        {/* Feature Cards Section */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[#27272a]">
          <div className="text-center mb-12">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Built for Enterprise Reliability & Scalability
            </h2>
            <p className="text-zinc-400 text-sm mt-2">
              Everything you need for multi-project background processing without broker complexity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#121215] border border-[#27272a] p-6 rounded-lg">
              <div className="w-10 h-10 bg-[#1c1c21] border border-[#27272a] rounded flex items-center justify-center text-brandPrimary mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-display font-semibold text-lg text-white mb-2">
                FOR UPDATE SKIP LOCKED
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Atomic, lock-free row reservation across 100+ concurrent worker nodes. Zero thread blocking or table locks under high load.
              </p>
            </div>

            <div className="bg-[#121215] border border-[#27272a] p-6 rounded-lg">
              <div className="w-10 h-10 bg-[#1c1c21] border border-[#27272a] rounded flex items-center justify-center text-brandSuccess mb-4">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-display font-semibold text-lg text-white m-4">
                Lightweight Java SDK
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Enqueue and process tasks with multi-threaded workers (<code className="text-zinc-300">EvoraWorker</code>), automated background heartbeats, and error retries.
              </p>
            </div>

            <div className="bg-[#121215] border border-[#27272a] p-6 rounded-lg">
              <div className="w-10 h-10 bg-[#1c1c21] border border-[#27272a] rounded flex items-center justify-center text-brandWarning mb-4">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-display font-semibold text-lg text-white mb-2">
                Visibility Timeout Sweeper
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Lease-based worker crash detection automatically re-queues expired jobs or escalates them to the Dead Letter Queue (DLQ).
              </p>
            </div>

            <div className="bg-[#121215] border border-[#27272a] p-6 rounded-lg">
              <div className="w-10 h-10 bg-[#1c1c21] border border-[#27272a] rounded flex items-center justify-center text-brandBulk mb-4">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="font-display font-semibold text-lg text-white mb-2">
                CQRS & Event Sourcing
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Separates operational queue transactions (PostgreSQL) from analytical monitoring queries (MongoDB event projections).
              </p>
            </div>

            <div className="bg-[#121215] border border-[#27272a] p-6 rounded-lg">
              <div className="w-10 h-10 bg-[#1c1c21] border border-[#27272a] rounded flex items-center justify-center text-brandDanger mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-display font-semibold text-lg text-white mb-2">
                Spring Boot Starter
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Drop <code className="text-zinc-300">EvoraClient</code> and <code className="text-zinc-300">EvoraWorker</code> into Spring Boot applications with standard <code className="text-zinc-300">@Bean</code> configuration.
              </p>
            </div>

            <div className="bg-[#121215] border border-[#27272a] p-6 rounded-lg">
              <div className="w-10 h-10 bg-[#1c1c21] border border-[#27272a] rounded flex items-center justify-center text-brandPrimary mb-4">
                <Terminal className="w-5 h-5" />
              </div>
              <h3 className="font-display font-semibold text-lg text-white mb-2">
                Real-Time Control Plane
              </h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Single-Page Console featuring live throughput area graphs, status distribution doughnut charts, and DLQ recovery tools.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#27272a] bg-[#0a0a0c] py-8 text-center text-xs text-zinc-500 font-mono">
        <p>Evora Distributed Job Queue Fabric &bull; Released under MIT License</p>
      </footer>
    </div>
  );
}
