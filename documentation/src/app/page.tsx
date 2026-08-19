"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import SearchModal from "@/components/SearchModal";
import CodeBlock from "@/components/CodeBlock";
import SkipLockedSimulator from "@/components/SkipLockedSimulator";
import { ArrowRight, Terminal, Zap, Database, Layers, GitFork } from "lucide-react";

export default function LandingPage() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bgBase text-textMain flex flex-col">
      <Navbar onOpenSearch={() => setIsSearchOpen(true)} />
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
          {/* Top Engine Status Monospace Banner */}
          <div className="inline-flex items-center gap-2 bg-[#141214] border border-borderColor px-3.5 py-1.5 rounded text-[11px] font-mono text-textMuted mb-8 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-stateSuccess"></span>
            <span>WAL_EPOCH: 0x4F</span>
            <span className="text-[#3d3330]">|</span>
            <span className="text-brandActiveCursor font-medium">FOR UPDATE SKIP LOCKED</span>
            <span className="text-[#3d3330]">|</span>
            <span>POSTGRESQL 15+ NATIVE</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
            The Lock-Free Workload Fabric for PostgreSQL.
          </h1>

          <p className="mt-6 text-base sm:text-lg text-textMuted max-w-2xl mx-auto font-sans leading-relaxed">
            Eliminate Redis and RabbitMQ operational overhead. Execute atomic, non-blocking queue polling, transactional outbox relays, and choreographed sagas inside your existing database.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 font-mono text-xs">
            <Link
              href="/docs"
              className="w-full sm:w-auto bg-brandAccent hover:bg-brandAccentHover text-white font-bold px-6 py-3 rounded flex items-center justify-center gap-2 transition shadow-md"
            >
              <span>EXPLORE ARCHITECTURE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <a
              href="http://localhost:8080"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-[#141214] border border-borderColor hover:border-brandAccent text-textMain font-semibold px-6 py-3 rounded flex items-center justify-center gap-2 transition"
            >
              <Terminal className="w-3.5 h-3.5 text-stateSuccess" />
              <span>LAUNCH OPERATIONS CONSOLE</span>
            </a>
          </div>

          {/* Signature Interactive Centerpiece: SKIP LOCKED Simulator */}
          <div className="mt-14 max-w-4xl mx-auto text-left">
            <div className="mb-3 flex items-center justify-between text-xs font-mono text-textMuted">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brandAccent animate-pulse"></span>
                <span>SIGNATURE ENGINE SIMULATOR</span>
              </span>
              <span>INTERACTIVE // CLICK ACTION BUTTONS BELOW</span>
            </div>
            <SkipLockedSimulator />
          </div>
        </section>

        {/* 4 Core Distributed Architecture Pillars */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-borderColor">
          <div className="text-center mb-12">
            <div className="text-[11px] font-mono uppercase text-brandActiveCursor font-semibold tracking-wider">
              CORE SYSTEM CAPABILITIES
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
              Built on Database Internals & Immutable Logs
            </h2>
            <p className="text-textMuted text-xs sm:text-sm mt-2 max-w-xl mx-auto">
              Everything required for multi-tenant distributed execution without distributed dual-write hazards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-[#121010] border border-borderColor p-5 rounded">
              <div className="w-8 h-8 bg-[#1c1817] border border-borderColor rounded flex items-center justify-center text-brandActiveCursor mb-3 font-mono">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="font-display font-semibold text-base text-white mb-1.5">
                SKIP LOCKED
              </h3>
              <p className="text-textMuted text-xs leading-relaxed">
                Non-blocking concurrent tuple reservations across 100+ worker threads with zero lock serialization.
              </p>
            </div>

            <div className="bg-[#121010] border border-borderColor p-5 rounded">
              <div className="w-8 h-8 bg-[#1c1817] border border-borderColor rounded flex items-center justify-center text-stateSuccess mb-3 font-mono">
                <Database className="w-4 h-4" />
              </div>
              <h3 className="font-display font-semibold text-base text-white mb-1.5">
                Transactional Outbox
              </h3>
              <p className="text-textMuted text-xs leading-relaxed">
                Enqueue tasks in the exact same SQL transaction as your business records. 100% dual-write proof.
              </p>
            </div>

            <div className="bg-[#121010] border border-borderColor p-5 rounded">
              <div className="w-8 h-8 bg-[#1c1817] border border-borderColor rounded flex items-center justify-center text-[#e29377] mb-3 font-mono">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="font-display font-semibold text-base text-white mb-1.5">
                CQRS Projections
              </h3>
              <p className="text-textMuted text-xs leading-relaxed">
                PostgreSQL write engine decoupled from MongoDB read telemetry models for zero-contention dashboards.
              </p>
            </div>

            <div className="bg-[#121010] border border-borderColor p-5 rounded">
              <div className="w-8 h-8 bg-[#1c1817] border border-borderColor rounded flex items-center justify-center text-stateWarning mb-3 font-mono">
                <GitFork className="w-4 h-4" />
              </div>
              <h3 className="font-display font-semibold text-base text-white mb-1.5">
                Choreographed Sagas
              </h3>
              <p className="text-textMuted text-xs leading-relaxed">
                Multi-step distributed transactions with automated reverse compensating rollbacks upon step failure.
              </p>
            </div>
          </div>
        </section>

        {/* Quickstart Terminal Section */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-borderColor">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl font-bold text-white">
                5-Minute  Quickstart
              </h2>
              <p className="text-textMuted text-xs mt-1">
                Launch the PostgreSQL/MongoDB cluster and run the multi-threaded Java Client SDK demo.
              </p>
            </div>

            <CodeBlock
              filename="Terminal Quickstart"
              language="bash"
              code={`# 1. Launch PostgreSQL & MongoDB cluster
docker-compose up -d

# 2. Compile & start Evora Distributed Queue Engine
mvn clean compile exec:java -Dexec.mainClass="com.evora.EvoraApplication"

# 3. Run multi-threaded Client SDK worker demo
mvn exec:java -Dexec.mainClass="com.evora.demo.EvoraWorkerDemo"`}
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-borderColor py-8 bg-[#070607] text-xs font-mono text-textMuted">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span>EVORA WORKLOAD FABRIC // POSTGRESQL FOR UPDATE SKIP LOCKED</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/docs" className="hover:text-brandActiveCursor transition">
              Documentation
            </Link>
            <Link href="/docs/api-reference" className="hover:text-brandActiveCursor transition">
              REST API
            </Link>
            <a
              href="https://github.com/jhanvi857/Evora"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brandActiveCursor transition"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
