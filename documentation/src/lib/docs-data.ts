export interface DocSection {
  id: string;
  title: string;
  category: string;
  slug: string;
  description: string;
  content: string;
  toc: { id: string; text: string; level: number }[];
}

export interface NavCategory {
  category: string;
  items: { title: string; slug: string }[];
}

export const DOC_NAVIGATION: NavCategory[] = [
  {
    category: "Getting Started",
    items: [
      { title: "Introduction & Quickstart", slug: "getting-started" },
      { title: "Installation & Setup", slug: "installation" },
    ],
  },
  {
    category: "Core Architecture",
    items: [
      { title: "FOR UPDATE SKIP LOCKED", slug: "lock-mechanics" },
      { title: "Visibility Timeout Sweeper", slug: "sweeper" },
      { title: "CQRS & Event Projections", slug: "cqrs-telemetry" },
    ],
  },
  {
    category: "Client SDK",
    items: [
      { title: "EvoraClient & Worker SDK", slug: "java-sdk" },
      { title: "Spring Boot Integration", slug: "spring-boot" },
    ],
  },
  {
    category: "API Reference",
    items: [
      { title: "REST API v1 Specification", slug: "api-reference" },
    ],
  },
  {
    category: "Performance & Ops",
    items: [
      { title: "Benchmarks & Comparison", slug: "benchmarks" },
      { title: "Troubleshooting & FAQ", slug: "faq" },
    ],
  },
];

export const DOC_CONTENT: Record<string, DocSection> = {
  "getting-started": {
    id: "getting-started",
    title: "Introduction & Quickstart",
    category: "Getting Started",
    slug: "getting-started",
    description: "Learn how to get started with Evora, a lock-free distributed job queue system built on PostgreSQL.",
    toc: [
      { id: "overview", text: "Overview", level: 2 },
      { id: "core-features", text: "Core Features", level: 2 },
      { id: "quickstart-tutorial", text: "5-Minute Quickstart", level: 2 },
    ],
    content: `
# Introduction & Quickstart

Evora is a high-throughput, production-grade distributed job queue platform built on top of PostgreSQL using native lock-free row reservation (\`FOR UPDATE SKIP LOCKED\`). It provides exactly-once idempotency guarantees, lease-based visibility timeouts, CQRS telemetry projection with MongoDB, a Java Client SDK, and an Operations Console.

## Overview

Unlike traditional message queues (RabbitMQ, SQS) or in-memory queues (Redis BullMQ), Evora uses your existing PostgreSQL database as the operational queue store. This eliminates the operational overhead of managing external broker clusters while ensuring job creation and business data writes happen in the exact same database transaction.

## Core Features

- **Lock-Free Worker Reservation**: Atomic, non-blocking polling across 100+ parallel worker nodes using PostgreSQL \`FOR UPDATE SKIP LOCKED <br/> <br/>\`
- **Lightweight Java Client SDK**: Enqueue and process jobs with automated polling loops, lease heartbeat renewals, and exception retries in under 5 lines of code. <br/> <br/>
- **Visibility Timeout Sweeper**: Prevents job loss by tracking worker lease timestamps (\`locked_until\`). Crashed worker nodes are automatically detected, and hanging jobs are safely requeued or escalated to the Dead Letter Queue (DLQ). <br/> <br/>
- **CQRS Telemetry**: Separates operational queue tables (PostgreSQL) from analytical read queries (MongoDB) via event projections.

## 5-Minute Quickstart

### 1. Launch Supporting Infrastructure
Start PostgreSQL and MongoDB using Docker Compose:

\`\`\`bash
docker-compose up -d
\`\`\`

### 2. Start Evora Engine Server
Run the application server:

\`\`\`bash
mvn clean compile exec:java -Dexec.mainClass="com.evora.EvoraApplication"
\`\`\`

### 3. Submit Your First Job via cURL
Submit a job payload to the default queue:

\`\`\`bash
curl -X POST http://localhost:8080/api/v1/jobs \\
  -H "Content-Type: application/json" \\
  -d '{
    "queue": "critical",
    "priority": 1,
    "idempotencyKey": "PAYMENT-8812",
    "payload": {"action": "CHARGE_CARD", "amount": 299.99}
  }'
\`\`\`
`,
  },

  "installation": {
    id: "installation",
    title: "Installation & Setup",
    category: "Getting Started",
    slug: "installation",
    description: "Install Evora Java Client SDK and configure environment settings.",
    toc: [
      { id: "maven-setup", text: "Maven Dependency Setup", level: 2 },
      { id: "env-variables", text: "Environment Configuration", level: 2 },
      { id: "database-schema", text: "Database Schema Setup", level: 2 },
    ],
    content: `
# Installation & Setup

## Maven Dependency Setup

Add the Evora Client SDK dependency to your project's \`pom.xml\`:

\`\`\`xml
<dependency>
    <groupId>com.evora</groupId>
    <artifactId>evora-oms</artifactId>
    <version>1.0.0</version>
</dependency>
\`\`\`

## Environment Configuration

Evora supports \`.env\` configuration files or standard system environment variables:

\`\`\`env
# PostgreSQL Write Store
EVORA_POSTGRES_JDBC_URL=jdbc:postgresql://localhost:5432/evora
EVORA_POSTGRES_USERNAME=postgres
EVORA_POSTGRES_PASSWORD=postgres

# MongoDB Read Model (Telemetry)
EVORA_MONGO_URI=mongodb://localhost:27017
\`\`\`

## Database Schema Setup

Evora automatically executes \`schema.sql\` on startup to create tables if they do not exist:

\`\`\`sql
CREATE TABLE IF NOT EXISTS jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key   TEXT UNIQUE NOT NULL,
  queue             TEXT NOT NULL DEFAULT 'default',
  priority          INT NOT NULL DEFAULT 5,
  payload           JSONB NOT NULL,
  status            TEXT NOT NULL DEFAULT 'PENDING',
  attempt_count     INT NOT NULL DEFAULT 0,
  max_attempts      INT NOT NULL DEFAULT 3,
  worker_id         TEXT,
  locked_until      TIMESTAMPTZ,
  scheduled_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  last_error        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_poll 
  ON jobs (queue, priority ASC, scheduled_at ASC) 
  WHERE status = 'PENDING';
\`\`\`
`,
  },

  "lock-mechanics": {
    id: "lock-mechanics",
    title: "FOR UPDATE SKIP LOCKED",
    category: "Core Architecture",
    slug: "lock-mechanics",
    description: "Deep dive into lock-free PostgreSQL queue polling mechanics.",
    toc: [
      { id: "the-problem", text: "The Single-Queue Lock Bottleneck", level: 2 },
      { id: "skip-locked-sql", text: "Atomic Claim SQL Query", level: 2 },
      { id: "exactly-once-guarantees", text: "Exactly-Once Processing", level: 2 },
    ],
    content: `
# FOR UPDATE SKIP LOCKED

## The Single-Queue Lock Bottleneck

In traditional database queue designs, multiple concurrent workers executing \`SELECT ... FOR UPDATE\` cause lock contention. Workers block each other waiting for table or row locks, severely limiting throughput.

## Atomic Claim SQL Query

Evora eliminates lock contention using PostgreSQL native \`FOR UPDATE SKIP LOCKED\`. When a worker polls the queue, PostgreSQL automatically skips over any rows locked by other concurrent workers and claims the next available pending job:

\`\`\`sql
UPDATE jobs
SET status        = 'RUNNING',
    worker_id     = ?,
    locked_until  = NOW() + (? || ' seconds')::INTERVAL,
    attempt_count = attempt_count + 1
WHERE id = (
    SELECT id FROM jobs
    WHERE status       = 'PENDING'
      AND queue        = ?
      AND scheduled_at <= NOW()
    ORDER BY priority ASC, scheduled_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
)
RETURNING *;
\`\`\`

## Exactly-Once Processing

1. **Idempotent Submission**: When a job is submitted, PostgreSQL enforces a UNIQUE constraint on \`idempotency_key\`. Duplicate submissions instantly return the existing job record without re-enqueuing.
2. **Atomic Reservation**: The \`SKIP LOCKED\` update atomically transitions status from \`PENDING\` to \`RUNNING\` and assigns the \`worker_id\` lease in a single statement.
`,
  },

  "sweeper": {
    id: "sweeper",
    title: "Visibility Timeout Sweeper",
    category: "Core Architecture",
    slug: "sweeper",
    description: "Lease-based worker crash recovery and dead letter queue escalation.",
    toc: [
      { id: "lease-lifecycle", text: "Worker Lease Lifecycle", level: 2 },
      { id: "sweeper-process", text: "Background Sweeper Process", level: 2 },
    ],
    content: `
# Visibility Timeout Sweeper

## Worker Lease Lifecycle

When a worker node claims a job, Evora sets a lease expiration timestamp (\`locked_until\`, e.g., 30 seconds into the future). While executing a long-running task, the worker sends periodic heartbeat signals to extend the lease.

## Background Sweeper Process

If a worker node crashes, hangs, or experiences network partitioning, heartbeat signals stop. The \`VisibilityTimeoutSweeper\` periodically scans for expired leases:

\`\`\`sql
SELECT * FROM jobs
WHERE status = 'RUNNING'
  AND locked_until < NOW();
\`\`\`

- **Attempt Count < Max Attempts**: The job is reset to \`PENDING\` so another healthy worker node can claim it.
- **Attempt Count >= Max Attempts**: The job is escalated to \`DLQ\` (Dead Letter Queue) for manual operator recovery.
`,
  },

  "cqrs-telemetry": {
    id: "cqrs-telemetry",
    title: "CQRS & Event Projections",
    category: "Core Architecture",
    slug: "cqrs-telemetry",
    description: "Decoupling high-frequency queue writes from analytical monitoring queries.",
    toc: [
      { id: "cqrs-design", text: "CQRS Pattern Design", level: 2 },
      { id: "mongo-projection", text: "MongoDB Read Model Projection", level: 2 },
    ],
    content: `
# CQRS & Event Projections

## CQRS Pattern Design

High-throughput queuing produces heavy write operations. Executing analytical queries (such as calculating queue depth, completion rates, and average latency) directly on PostgreSQL degrades queue polling latency.

Evora implements Command Query Responsibility Segregation (CQRS):
- **Write Store (PostgreSQL)**: Handles job submissions, claims, and status updates.
- **Read Store (MongoDB)**: Maintains projected queue telemetry stats for the Operations Console.

## MongoDB Read Model Projection

Domain events (\`JobSubmittedEvent\`, \`JobCompletedEvent\`, \`JobFailedEvent\`) are published to an \`InMemoryEventBus\` and projected asynchronously into MongoDB collections.
`,
  },

  "java-sdk": {
    id: "java-sdk",
    title: "EvoraClient & Worker SDK",
    category: "Client SDK",
    slug: "java-sdk",
    description: "Complete guide to the com.evora.client Java SDK.",
    toc: [
      { id: "client-initialization", text: "Client Initialization", level: 2 },
      { id: "worker-pool", text: "Multi-Threaded Worker Pool", level: 2 },
      { id: "job-result", text: "JobResult & Exception Handling", level: 2 },
    ],
    content: `
# EvoraClient & Worker SDK

The \`com.evora.client\` package provides a thread-safe SDK for external Java microservices.

## Client Initialization

Initialize the client with your Evora server URL:

\`\`\`java
import com.evora.client.EvoraClient;

EvoraClient client = EvoraClient.create("http://localhost:8080");
\`\`\`

## Multi-Threaded Worker Pool

Use \`EvoraWorker\` to start background worker threads:

\`\`\`java
import com.evora.client.EvoraWorker;
import com.evora.client.JobResult;

EvoraWorker worker = EvoraWorker.builder()
    .client(client)
    .workerId("worker-node-1")
    .queue("critical")
    .concurrency(4)
    .pollIntervalMs(250)
    .handler(job -> {
        System.out.println("Processing payload: " + job.getPayload());
        return JobResult.success();
    })
    .build();

worker.start();
\`\`\`

## JobResult & Exception Handling

Worker handlers return a \`JobResult\`:
- \`JobResult.success()\`: Marks job \`COMPLETED\`.
- \`JobResult.failure("Error details")\`: Triggers attempt count increment and status update.
- Uncaught exceptions inside the handler are caught automatically and reported as job failures.
`,
  },

  "spring-boot": {
    id: "spring-boot",
    title: "Spring Boot Integration",
    category: "Client SDK",
    slug: "spring-boot",
    description: "Integrate Evora into Spring Boot applications as managed beans.",
    toc: [
      { id: "spring-bean", text: "Spring Configuration Bean", level: 2 },
      { id: "graceful-shutdown", text: "Graceful Lifecycle Shutdown", level: 2 },
    ],
    content: `
# Spring Boot Integration

Integrate Evora into Spring Boot using standard \`@Configuration\` and \`@Bean\` definitions.

## Spring Configuration Bean

\`\`\`java
@Configuration
public class EvoraConfig {

    @Bean
    public EvoraClient evoraClient(@Value("\${evora.url:http://localhost:8080}") String url) {
        return EvoraClient.create(url);
    }

    @Bean(destroyMethod = "stop")
    public EvoraWorker orderWorker(EvoraClient client, OrderService orderService) {
        EvoraWorker worker = EvoraWorker.builder()
            .client(client)
            .queue("orders")
            .concurrency(4)
            .pollIntervalMs(200)
            .handler(job -> {
                orderService.processOrder(job.getPayload());
                return JobResult.success();
            })
            .build();
        
        worker.start();
        return worker;
    }
}
\`\`\`

## Graceful Lifecycle Shutdown

Specifying \`destroyMethod = "stop"\` on the \`EvoraWorker\` bean ensures worker threads stop polling and finish in-flight tasks cleanly when Spring shuts down.
`,
  },

  "api-reference": {
    id: "api-reference",
    title: "REST API v1 Specification",
    category: "API Reference",
    slug: "api-reference",
    description: "Complete REST API endpoints specification.",
    toc: [
      { id: "post-jobs", text: "POST /api/v1/jobs", level: 2 },
      { id: "get-poll", text: "GET /api/v1/jobs/poll", level: 2 },
      { id: "post-heartbeat", text: "POST /api/v1/jobs/:id/heartbeat", level: 2 },
      { id: "post-complete", text: "POST /api/v1/jobs/:id/complete", level: 2 },
      { id: "post-fail", text: "POST /api/v1/jobs/:id/fail", level: 2 },
      { id: "get-health", text: "GET /api/v1/health", level: 2 },
    ],
    content: `
# REST API v1 Specification

All endpoints support CORS headers and standard JSON payloads.

## POST /api/v1/jobs

Submits a new job to the specified queue lane.

**Request Body**:
\`\`\`json
{
  "queue": "critical",
  "priority": 1,
  "idempotencyKey": "ORD-9912",
  "payload": { "order_id": "9912", "amount": 149.99 }
}
\`\`\`

**Response (201 Created)**:
\`\`\`json
{
  "id": "c1f7a2b0-84a1-4a11-b0e2-7494f1c65b12",
  "queue": "critical",
  "priority": 1,
  "status": "PENDING",
  "attemptCount": 0,
  "maxAttempts": 3
}
\`\`\`

## GET /api/v1/jobs/poll?worker_id=worker-01

Claims the highest priority pending job for a worker node.

## POST /api/v1/jobs/:id/heartbeat

Renews lease timestamp for a running job.

## POST /api/v1/jobs/:id/complete

Marks job status as \`COMPLETED\`.

## POST /api/v1/jobs/:id/fail

Increments attempt count and marks job \`PENDING\` or \`DLQ\`.

## GET /api/v1/health

Returns system operational status:
\`\`\`json
{
  "status": "UP",
  "service": "Evora Distributed Job Queue Engine",
  "version": "1.0.0"
}
\`\`\`
`,
  },

  "benchmarks": {
    id: "benchmarks",
    title: "Benchmarks & Comparison",
    category: "Performance & Ops",
    slug: "benchmarks",
    description: "Measured throughput and latency numbers across database queues.",
    toc: [
      { id: "throughput-table", text: "Performance Comparison Table", level: 2 },
      { id: "test-environment", text: "Test Environment Details", level: 2 },
    ],
    content: `
# Benchmarks & Comparison

## Performance Comparison Table

| Queue System | Backing Store | Max Throughput | Lock Latency | Dual-Write Protection |
| :--- | :--- | :--- | :--- | :--- |
| **Evora** | PostgreSQL | **15,400+ jobs/sec** | **< 1.8 ms** | **Built-in (Same Transaction)** |
| **Redis BullMQ** | Redis | 16,000+ jobs/sec | < 1.2 ms | Requires 2PC / Manual |
| **RabbitMQ** | Erlang Broker | 12,000+ jobs/sec | < 2.5 ms | Requires Outbox Table |
| **Amazon SQS** | AWS Cloud | 3,000+ jobs/sec | 15 - 30 ms | No atomic database transaction |

## Test Environment Details

- **Database**: PostgreSQL 15 running on Docker, HikariCP max pool size 20.
- **Workers**: 16 concurrent EvoraWorker threads polling on 1Gbps network loopback.
`,
  },

  "faq": {
    id: "faq",
    title: "Troubleshooting & FAQ",
    category: "Performance & Ops",
    slug: "faq",
    description: "Common operational questions and troubleshooting steps.",
    toc: [
      { id: "dlq-recovery", text: "How do I recover DLQ jobs?", level: 2 },
      { id: "lease-eviction", text: "What happens if a job takes longer than lease time?", level: 2 },
    ],
    content: `
# Troubleshooting & FAQ

## How do I recover DLQ jobs?

Failed jobs escalated to the Dead Letter Queue (DLQ) can be retried using:
1. **Operations Console**: Go to the DLQ Recovery tab and click "Retry All" or "Retry Job".
2. **REST API**: Call \`POST /api/v1/jobs/dlq/retry-all\` or \`POST /api/v1/jobs/:id/retry\`.
3. **Java SDK**: Call \`client.getDLQJobs()\` and inspect error traces.

## What happens if a job takes longer than lease time?

If a worker handles a slow job (e.g. image rendering taking 45 seconds):
- \`EvoraWorker\` automatically sends periodic background heartbeats every 15 seconds to extend \`locked_until\`.
- As long as the worker thread is healthy, the lease will not expire and the job will not be evicted.
`,
  },
};
