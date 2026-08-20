"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Plus, Skull, ShieldCheck, Terminal, Cpu } from "lucide-react";

interface JobRow {
  id: string;
  idempotencyKey: string;
  queue: string;
  priority: number;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "DLQ";
  workerId: string | null;
  leaseTtl: number; // in seconds
  attempts: number;
  maxAttempts: number;
  lsn: string;
  isContended?: boolean;
  isJustClaimed?: boolean;
}

interface LogEntry {
  timestamp: string;
  txId: string;
  message: string;
  type: "claim" | "skip" | "complete" | "sweep" | "enqueue" | "crash";
}

const INITIAL_JOBS: JobRow[] = [
  {
    id: "e4a1",
    idempotencyKey: "ORD_CHARGE_9901",
    queue: "critical",
    priority: 1,
    status: "RUNNING",
    workerId: "worker-alpha",
    leaseTtl: 18,
    attempts: 1,
    maxAttempts: 3,
    lsn: "0/01A4B0",
  },
  {
    id: "e4a2",
    idempotencyKey: "ORD_CHARGE_9902",
    queue: "critical",
    priority: 1,
    status: "RUNNING",
    workerId: "worker-beta",
    leaseTtl: 24,
    attempts: 1,
    maxAttempts: 3,
    lsn: "0/01A4C8",
  },
  {
    id: "e4a3",
    idempotencyKey: "PAY_INVOICE_8810",
    queue: "critical",
    priority: 2,
    status: "PENDING",
    workerId: null,
    leaseTtl: 0,
    attempts: 0,
    maxAttempts: 3,
    lsn: "0/01A4E0",
  },
  {
    id: "e4a4",
    idempotencyKey: "EMAIL_DISPATCH_331",
    queue: "default",
    priority: 5,
    status: "PENDING",
    workerId: null,
    leaseTtl: 0,
    attempts: 0,
    maxAttempts: 3,
    lsn: "0/01A4F8",
  },
  {
    id: "e4a5",
    idempotencyKey: "WEBHOOK_SYNC_4419",
    queue: "default",
    priority: 5,
    status: "PENDING",
    workerId: null,
    leaseTtl: 0,
    attempts: 0,
    maxAttempts: 3,
    lsn: "0/01A510",
  },
  {
    id: "e4a6",
    idempotencyKey: "REPORT_GEN_7701",
    queue: "bulk",
    priority: 9,
    status: "PENDING",
    workerId: null,
    leaseTtl: 0,
    attempts: 0,
    maxAttempts: 3,
    lsn: "0/01A528",
  },
];

export default function SkipLockedSimulator() {
  const [jobs, setJobs] = useState<JobRow[]>(INITIAL_JOBS);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      timestamp: "12:00:01.102",
      txId: "0x10A1",
      message: "TX_BEGIN: worker-alpha locked row #e4a1 (PRIORITY: 1, LEASE: 30s)",
      type: "claim",
    },
    {
      timestamp: "12:00:01.103",
      txId: "0x10A2",
      message: "TX_BEGIN: worker-beta SKIPPED #e4a1 (LOCKED) -> claimed row #e4a2 (0.0ms lock wait)",
      type: "skip",
    },
  ]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeWorker, setActiveWorker] = useState<string>("worker-gamma");
  const [crashedWorker, setCrashedWorker] = useState<string | null>(null);
  const [activeCursorRow, setActiveCursorRow] = useState<string | null>(null);

  const txCounter = useRef(4260);

  const addLog = useCallback((message: string, type: LogEntry["type"]) => {
    const now = new Date();
    const ts = `${now.toTimeString().split(" ")[0]}.${String(now.getMilliseconds()).padStart(3, "0")}`;
    const tx = `0x${txCounter.current.toString(16).toUpperCase()}`;
    txCounter.current += 1;
    setLogs((prev) => [{ timestamp: ts, txId: tx, message, type }, ...prev.slice(0, 7)]);
  }, []);

  // Step the simulation
  const stepSimulation = useCallback(() => {
    setJobs((prevJobs) => {
      const nextJobs = [...prevJobs];

      // 1. Tick lease timers and complete running jobs
      for (let i = 0; i < nextJobs.length; i++) {
        const job = nextJobs[i];
        if (job.status === "RUNNING") {
          if (job.workerId === crashedWorker) {
            // Crashed worker lease ticks down to 0
            job.leaseTtl = Math.max(0, job.leaseTtl - 3);
          } else {
            job.leaseTtl -= 3;
            if (job.leaseTtl <= 12) {
              // Complete the job
              job.status = "COMPLETED";
              job.workerId = null;
              job.leaseTtl = 0;
              addLog(`TX_COMMIT: Completed job #${job.id} (${job.idempotencyKey})`, "complete");
            }
          }
        }
      }

      // 2. Worker attempts to claim the highest-priority pending job
      const workers = ["worker-alpha", "worker-beta", "worker-gamma"].filter((w) => w !== crashedWorker);
      const freeWorker = workers.find((w) => !nextJobs.some((j) => j.status === "RUNNING" && j.workerId === w));

      if (freeWorker) {
        const pendingIdx = nextJobs.findIndex((j) => j.status === "PENDING");
        if (pendingIdx !== -1) {
          const target = nextJobs[pendingIdx];
          target.status = "RUNNING";
          target.workerId = freeWorker;
          target.leaseTtl = 30;
          target.attempts += 1;
          target.isJustClaimed = true;
          setActiveCursorRow(target.id);
          setActiveWorker(freeWorker);

          const skippedRows = nextJobs.filter((j, idx) => idx < pendingIdx && j.status === "RUNNING");
          if (skippedRows.length > 0) {
            addLog(
              `FOR UPDATE SKIP LOCKED: ${freeWorker} skipped ${skippedRows.length} locked row(s) -> claimed #${target.id} (0.0ms wait)`,
              "skip"
            );
          } else {
            addLog(`FOR UPDATE SKIP LOCKED: ${freeWorker} claimed pending row #${target.id}`, "claim");
          }
        }
      }

      return nextJobs;
    });
  }, [crashedWorker, addLog]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      stepSimulation();
    }, 1800);
    return () => clearInterval(interval);
  }, [isPlaying, stepSimulation]);

  const handleEnqueueBatch = () => {
    const newId = Math.random().toString(36).substring(2, 6);
    const newLsn = `0/01A${(Math.floor(Math.random() * 800) + 100).toString(16).toUpperCase()}`;
    const newJob: JobRow = {
      id: newId,
      idempotencyKey: `ORD_SUBMIT_${Math.floor(Math.random() * 9000) + 1000}`,
      queue: "critical",
      priority: 1,
      status: "PENDING",
      workerId: null,
      leaseTtl: 0,
      attempts: 0,
      maxAttempts: 3,
      lsn: newLsn,
    };

    setJobs((prev) => [newJob, ...prev.slice(0, 6)]);
    addLog(`INSERT INTO jobs (idempotency_key, queue, priority) -> Enqueued #${newId}`, "enqueue");
  };

  const handleKillWorker = () => {
    if (crashedWorker) {
      setCrashedWorker(null);
      addLog("Node heartbeat restored: worker-beta recovered.", "claim");
    } else {
      setCrashedWorker("worker-beta");
      addLog("CRITICAL: worker-beta crashed (heartbeat lost). Active lease locked_until expiring...", "crash");
    }
  };

  const handleRunSweeper = () => {
    setJobs((prev) => {
      const updated = prev.map((job) => {
        if (job.status === "RUNNING" && job.leaseTtl <= 5) {
          if (job.attempts >= job.maxAttempts) {
            addLog(`SWEEPER: Job #${job.id} exceeded max attempts (${job.attempts}/${job.maxAttempts}) -> Escalated to DLQ!`, "crash");
            return { ...job, status: "DLQ" as const, workerId: null, leaseTtl: 0 };
          } else {
            addLog(`SWEEPER: Expired lease detected on #${job.id}. Requeued to PENDING.`, "sweep");
            return { ...job, status: "PENDING" as const, workerId: null, leaseTtl: 0 };
          }
        }
        return job;
      });
      return updated;
    });
  };

  const handleReset = () => {
    setJobs(INITIAL_JOBS);
    setCrashedWorker(null);
    setActiveCursorRow(null);
    addLog("Simulator state reset to initial WAL checkpoint.", "sweep");
  };

  return (
    <div className="rounded-xl border border-borderColor bg-bgSurface overflow-hidden shadow-2xl">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-[#0d0b0c] border-b border-borderColor text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-brandActiveCursor font-semibold">
            <Cpu className="w-4 h-4 text-brandAccent" />
            <span>POSTGRES_ENGINE — FOR UPDATE SKIP LOCKED MATRIX</span>
          </div>
          <span className="hidden sm:inline-block text-[#473b37]">|</span>
          <span className="hidden sm:inline-block text-textMuted">
            ACTIVE WORKERS: <strong className="text-textMain">3 THREADS</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-2.5 py-1 rounded border flex items-center gap-1.5 transition ${
              isPlaying
                ? "bg-bgBase border-borderColor text-textMuted hover:text-textMain"
                : "bg-brandAccent/20 border-brandAccent text-brandActiveCursor font-semibold"
            }`}
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{isPlaying ? "Pause" : "Live Run"}</span>
          </button>

          <button
            onClick={stepSimulation}
            className="px-2.5 py-1 rounded bg-bgBase border border-borderColor hover:border-textMuted text-textMain transition"
          >
            Step Poll
          </button>

          <button
            onClick={handleReset}
            className="p-1 rounded bg-bgBase border border-borderColor text-textMuted hover:text-textMain transition"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Control Action Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-[#0a0809] border-b border-borderColor text-xs">
        <button
          onClick={handleEnqueueBatch}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1c1817] border border-borderColor hover:border-brandAccent text-textMain transition font-mono"
        >
          <Plus className="w-3 h-3 text-brandAccent" />
          <span>Enqueue Priority Job</span>
        </button>

        <button
          onClick={handleKillWorker}
          className={`flex items-center gap-1 px-2.5 py-1 rounded border font-mono transition ${
            crashedWorker
              ? "bg-stateDanger/20 border-stateDanger text-stateDanger font-semibold"
              : "bg-[#1c1817] border-borderColor hover:border-stateDanger text-textMuted hover:text-stateDanger"
          }`}
        >
          <Skull className="w-3 h-3" />
          <span>{crashedWorker ? "Revive Worker-Beta" : "Crash Worker-Beta"}</span>
        </button>

        <button
          onClick={handleRunSweeper}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1c1817] border border-borderColor hover:border-stateSuccess text-textMuted hover:text-stateSuccess font-mono transition"
        >
          <ShieldCheck className="w-3 h-3 text-stateSuccess" />
          <span>Trigger Visibility Sweeper</span>
        </button>

        <div className="ml-auto hidden md:flex items-center gap-3 text-[11px] font-mono text-textMuted">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-stateSuccess"></span> COMPLETED
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-brandAccent animate-pulse"></span> RUNNING
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#352c2a]"></span> PENDING
          </span>
        </div>
      </div>

      {/* Real-time Table Grid */}
      <div className="overflow-x-auto p-4 bg-[#09090b]">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="border-b border-[#282322] text-[#857770] text-[11px] uppercase tracking-wider">
              <th className="pb-2.5 px-3">ROW ID</th>
              <th className="pb-2.5 px-3">IDEMPOTENCY KEY</th>
              <th className="pb-2.5 px-3">QUEUE / PRIORITY</th>
              <th className="pb-2.5 px-3">STATUS</th>
              <th className="pb-2.5 px-3">LOCKED BY</th>
              <th className="pb-2.5 px-3">LEASE TTL</th>
              <th className="pb-2.5 px-3 text-right">LSN OFFSET</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1c1716]">
            {jobs.map((job) => {
              const isClaimed = job.id === activeCursorRow && job.isJustClaimed;
              return (
                <tr
                  key={job.id}
                  className={`transition-colors ${
                    isClaimed
                      ? "bg-brandAccent/10 border-l-2 border-brandAccent"
                      : job.status === "RUNNING"
                      ? "bg-[#161314] hover:bg-[#1f191a]"
                      : "hover:bg-[#110f10]"
                  }`}
                >
                  <td className="py-2.5 px-3 text-textMuted font-semibold">#{job.id}</td>
                  <td className="py-2.5 px-3 text-textMain font-medium">
                    <span className="bg-[#1a1616] border border-[#2e2624] px-1.5 py-0.5 rounded text-[11px]">
                      {job.idempotencyKey}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        job.queue === "critical"
                          ? "bg-stateDanger/15 text-stateDanger border border-stateDanger/30"
                          : job.queue === "default"
                          ? "bg-brandAccent/15 text-brandActiveCursor border border-brandAccent/30"
                          : "bg-[#241e1c] text-textMuted"
                      }`}
                    >
                      {job.queue} (p:{job.priority})
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        job.status === "RUNNING"
                          ? "bg-brandAccent/20 text-brandActiveCursor border border-brandAccent/40"
                          : job.status === "COMPLETED"
                          ? "bg-stateSuccess/15 text-stateSuccess border border-stateSuccess/30"
                          : job.status === "DLQ"
                          ? "bg-stateDanger/20 text-stateDanger border border-stateDanger/40"
                          : "bg-[#1a1717] text-textMuted border border-[#2d2524]"
                      }`}
                    >
                      {job.status === "RUNNING" && <span className="w-1.5 h-1.5 rounded-full bg-brandAccent animate-ping"></span>}
                      {job.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-textMain">
                    {job.workerId ? (
                      <span className={`font-semibold ${job.workerId === crashedWorker ? "text-stateDanger line-through" : "text-brandActiveCursor"}`}>
                        {job.workerId}
                      </span>
                    ) : (
                      <span className="text-[#594d48] italic">(unlocked)</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {job.leaseTtl > 0 ? (
                      <span className={`font-mono font-medium ${job.leaseTtl <= 6 ? "text-stateDanger font-bold" : "text-textMain"}`}>
                        {job.leaseTtl}s remaining
                      </span>
                    ) : (
                      <span className="text-[#594d48]">-</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right text-textMuted font-mono text-[11px]">{job.lsn}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Live Transaction Ledger Stream */}
      <div className="p-3.5 bg-[#060607] border-t border-borderColor font-mono text-[11.5px]">
        <div className="flex items-center gap-2 text-textMuted mb-2 text-[10.5px] uppercase tracking-wider">
          <Terminal className="w-3.5 h-3.5 text-brandAccent" />
          <span>WAL TRANSACTION LEDGER STREAM (REAL-TIME CONCURRENCY AUDIT)</span>
        </div>
        <div className="space-y-1.5 overflow-y-auto max-h-28 text-left">
          {logs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-2.5 leading-tight">
              <span className="text-[#5c504a] shrink-0">{log.timestamp}</span>
              <span className="text-brandAccent shrink-0 font-bold">{log.txId}</span>
              <span
                className={`truncate ${
                  log.type === "skip"
                    ? "text-brandActiveCursor font-semibold"
                    : log.type === "complete"
                    ? "text-stateSuccess"
                    : log.type === "crash"
                    ? "text-stateDanger font-semibold"
                    : log.type === "sweep"
                    ? "text-brandAccent font-medium"
                    : "text-textMain"
                }`}
              >
                {log.message}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
