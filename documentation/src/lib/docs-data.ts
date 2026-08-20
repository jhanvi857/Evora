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
    category: "1. Architecture & Topology",
    items: [
      { title: "Lock-Free SKIP LOCKED Mechanics", slug: "lock-mechanics" },
      { title: "Transactional Outbox & Zero Dual-Write", slug: "transactional-outbox" },
      { title: "Event Sourcing & Append-Only Store", slug: "event-sourcing" },
      { title: "CQRS & MongoDB Read Model", slug: "cqrs-telemetry" },
    ],
  },
  {
    category: "2. Integration Patterns",
    items: [
      { title: "In-Transaction SQL Colocation", slug: "sql-colocation" },
      { title: "Spring Boot & Managed Worker Beans", slug: "spring-boot" },
      { title: "Polyglot REST (Python / Go / Node)", slug: "polyglot-rest" },
      { title: "Choreographed Sagas & Rollbacks", slug: "choreographed-sagas" },
    ],
  },
  {
    category: "3. Distributed Systems Core",
    items: [
      { title: "Lease Concurrency & Sweepers", slug: "sweeper-leases" },
      { title: "DLQ Quarantine & Poison Pills", slug: "dlq-triage" },
      { title: "Chaos Resilience & Node Crashes", slug: "chaos-resilience" },
    ],
  },
  {
    category: "4. Operations Runbook",
    items: [
      { title: "PostgreSQL Indexing & Autovacuum", slug: "postgres-tuning" },
      { title: "Connection Pool Sizing (HikariCP)", slug: "pool-sizing" },
      { title: "DLQ Surgical Replay Runbook", slug: "dlq-ops" },
    ],
  },
  {
    category: "5. API & SDK Reference",
    items: [
      { title: "Java Client SDK (com.evora.client)", slug: "java-sdk" },
      { title: "REST API v1 Specification", slug: "api-reference" },
      { title: "Domain Event Schema Catalog", slug: "event-catalog" },
    ],
  },
];

export const DOC_CONTENT: Record<string, DocSection> = {
  "lock-mechanics": {
    id: "lock-mechanics",
    title: "Lock-Free SKIP LOCKED Mechanics",
    category: "1. Architecture & Topology",
    slug: "lock-mechanics",
    description: "PostgreSQL row-level locking internals, MVCC tuple allocation, and zero-contention concurrent worker polling.",
    toc: [
      { id: "the-lock-contention-problem", text: "The Single-Queue Lock Bottleneck", level: 2 },
      { id: "atomic-skip-locked-sql", text: "Atomic Claim SQL Query", level: 2 },
      { id: "mvcc-tuple-locking", text: "PostgreSQL MVCC & Tuple Locking", level: 2 },
      { id: "partial-indexing", text: "Partial Index Optimization", level: 2 },
    ],
    content: `
# Lock-Free SKIP LOCKED Mechanics

Traditional database queue designs suffer from severe lock contention when multiple worker threads poll the same table simultaneously. Evora leverages PostgreSQL native \`FOR UPDATE SKIP LOCKED\` to achieve 15,000+ claims/sec with **zero thread blocking and sub-2ms claim latencies**.

## The Single-Queue Lock Bottleneck

When 50+ concurrent worker nodes execute standard queries like:
\`\`\`sql
SELECT * FROM jobs WHERE status = 'PENDING' ORDER BY priority ASC LIMIT 1 FOR UPDATE;
\`\`\`
Every worker attempts to obtain an exclusive row-level lock on the **exact same row**. While the first worker processes the row, all other 49 workers block, serializing execution and dropping database throughput to single-digit operations per second.

## Atomic Claim SQL Query

Evora eliminates lock serialization by combining PostgreSQL's \`SKIP LOCKED\` clause with an atomic \`UPDATE ... WHERE id = (SELECT ... LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *\`:

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

### Execution Flow
1. PostgreSQL scans the partial index \`idx_jobs_poll\` in priority order.
2. If the first matching tuple is locked by another transaction, PostgreSQL **skips past it immediately** with 0.0ms lock wait time.
3. The query acquires an exclusive lock on the next unreserved tuple, updates its state to \`RUNNING\`, and returns the payload in a single atomic roundtrip.

## PostgreSQL MVCC & Tuple Locking

Because PostgreSQL uses Multi-Version Concurrency Control (MVCC), an update creates a new tuple version (heap page) and updates the transaction visibility map. \`SKIP LOCKED\` inspects the lock status directly on the tuple header without waiting for the holding transaction to commit or abort.

## Partial Index Optimization

To guarantee sub-millisecond lookups regardless of historical table size (even with 50,000,000 completed jobs), Evora uses a **partial B-Tree index**:

\`\`\`sql
CREATE INDEX idx_jobs_poll 
  ON jobs (queue, priority ASC, scheduled_at ASC) 
  WHERE status = 'PENDING';
\`\`\`

Because completed and running jobs are excluded from the index tree, the index size remains minimal (typically < 2MB), ensuring all poll lookups hit PostgreSQL shared memory cache buffers.
`,
  },

  "transactional-outbox": {
    id: "transactional-outbox",
    title: "Transactional Outbox & Zero Dual-Write",
    category: "1. Architecture & Topology",
    slug: "transactional-outbox",
    description: "Eliminating dual-write anomalies by combining business state mutations and job enqueues into a single ACID transaction.",
    toc: [
      { id: "the-dual-write-vulnerability", text: "The Dual-Write Vulnerability", level: 2 },
      { id: "evora-outbox-pattern", text: "Evora Outbox Architecture", level: 2 },
      { id: "outbox-relay-loop", text: "OutboxRelay Polling Engine", level: 2 },
    ],
    content: `
# Transactional Outbox & Zero Dual-Write

When using external message brokers (RabbitMQ, Redis, AWS SQS), applications must write business records to the database AND publish an event/job to the broker. This two-phase operation inevitably fails under network splits, leading to **phantom jobs or dropped events**.

## The Dual-Write Vulnerability

\`\`\`
[App] ──1. INSERT Order (Postgres)──> SUCCESS
[App] ──2. Publish to RabbitMQ / Redis──> NETWORK TIMEOUT / CRASH
Result: Order exists in SQL, but payment worker never triggers!
\`\`\`

## Evora Outbox Architecture

With Evora, your business write and your background job submission occur in the **exact same database transaction**:

\`\`\`sql
BEGIN;

-- 1. Mutate business state
INSERT INTO orders (id, user_id, amount, status) 
VALUES ('ord_9912', 'usr_42', 299.99, 'CREATED');

-- 2. Enqueue background processing job in the exact same commit
INSERT INTO transactional_outbox (id, aggregate_id, event_type, payload, published)
VALUES (
  gen_random_uuid(), 
  'ord_9912', 
  'OrderCreatedEvent', 
  '{"amount": 299.99, "action": "CHARGE_CARD"}'::jsonb, 
  false
);

COMMIT;
\`\`\`

If the database commits, both the business row and the job exist. If the database rolls back, neither exists. **Dual-write bugs are mathematically impossible.**

## OutboxRelay Polling Engine

The Java \`OutboxRelay\` daemon thread scans the outbox table continuously:

\`\`\`sql
SELECT id, event_type, payload
FROM transactional_outbox
WHERE published = false
ORDER BY created_at ASC, id ASC
LIMIT 100;
\`\`\`

Each event is projected to MongoDB read models and dispatched to workers, followed by an atomic \`UPDATE transactional_outbox SET published = true WHERE id = ?\`.
`,
  },

  "event-sourcing": {
    id: "event-sourcing",
    title: "Event Sourcing & Append-Only Store",
    category: "1. Architecture & Topology",
    slug: "event-sourcing",
    description: "Immutable domain event logs, optimistic concurrency versioning, and state reconstruction.",
    toc: [
      { id: "event-store-schema", text: "Append-Only Event Store Schema", level: 2 },
      { id: "optimistic-concurrency", text: "Optimistic Concurrency Control", level: 2 },
      { id: "snapshots-and-replay", text: "Snapshots & State Rehydration", level: 2 },
    ],
    content: `
# Event Sourcing & Append-Only Store

Evora records all state transitions as an immutable, append-only stream of domain events. State is never overwritten in place — every lifecycle modification is audited for forensic replay.

## Append-Only Event Store Schema

Evora's \`PostgresEventStore\` engine records state in the \`events\` table:

\`\`\`sql
CREATE TABLE events (
    id UUID PRIMARY KEY,
    aggregate_id VARCHAR(128) NOT NULL,
    event_type VARCHAR(128) NOT NULL,
    payload JSONB NOT NULL,
    version INTEGER NOT NULL,
    idempotency_key VARCHAR(256),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_events_aggregate_version UNIQUE (aggregate_id, version)
);
\`\`\`

## Optimistic Concurrency Control

When an aggregate (such as \`JobAggregate\`) appends new events, it asserts the expected aggregate version. 

If two concurrent workers attempt to mutate the same aggregate simultaneously:
1. The first worker inserts event at \`version = 4\`.
2. The second worker also attempts to insert at \`version = 4\`.
3. PostgreSQL enforces the unique constraint \`uq_events_aggregate_version\`, throwing an \`OptimisticConcurrencyException\`.
4. The second worker cleanly retries with rehydrated state.

## Snapshots & State Rehydration

To prevent loading thousands of events on long-lived aggregates, Evora periodically creates snapshots in the \`snapshots\` table:

\`\`\`sql
CREATE TABLE snapshots (
    aggregate_id VARCHAR(128) PRIMARY KEY,
    version INTEGER NOT NULL,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
\`\`\`

When rehydrating an aggregate, Evora loads the latest snapshot and replays only subsequent events recorded after the snapshot version.
`,
  },

  "cqrs-telemetry": {
    id: "cqrs-telemetry",
    title: "CQRS & MongoDB Read Model",
    category: "1. Architecture & Topology",
    slug: "cqrs-telemetry",
    description: "Separating high-frequency queue write operations from analytical monitoring queries.",
    toc: [
      { id: "cqrs-separation", text: "Command vs. Query Responsibility", level: 2 },
      { id: "mongo-projection-pipeline", text: "MongoDB Projection Pipeline", level: 2 },
      { id: "zero-lock-contention", text: "Zero Contention Analytical Dashboards", level: 2 },
    ],
    content: `
# CQRS & MongoDB Read Model

High-throughput distributed queuing creates heavy write churn (10,000+ row locks and updates per second). Running operational analytics (e.g. queue throughput area charts, hourly error rates, status distributions) on PostgreSQL degrades worker poll latency.

## Command vs. Query Responsibility

Evora strictly segregates operational commands from analytical queries:
* **Command Side (PostgreSQL)**: Handles job submissions, SKIP LOCKED claims, lease extensions, and immutable event appending.
* **Query Side (MongoDB)**: Maintains denormalized, query-optimized views for the Operations Console and developer APIs.

## MongoDB Projection Pipeline

When domain events are published to the event bus, the \`JobProjector\` updates MongoDB collections asynchronously:

\`\`\`java
public class JobProjector implements DomainEventSubscriber {
    @Override
    public void onEvent(DomainEvent event) {
        if (event instanceof JobSubmittedEvent e) {
            queueStats.updateOne(
                Filters.eq("queue", e.job().getQueue()),
                Updates.combine(
                    Updates.inc("pending_count", 1),
                    Updates.set("updated_at", Instant.now().toString())),
                new UpdateOptions().upsert(true)
            );
        } else if (event instanceof JobCompletedEvent e) {
            queueStats.updateOne(
                Filters.eq("queue", e.queue()),
                Updates.combine(
                    Updates.inc("completed_last_1h", 1),
                    Updates.inc("pending_count", -1),
                    Updates.set("updated_at", Instant.now().toString())),
                new UpdateOptions().upsert(true)
            );
        }
    }
}
\`\`\`

## Zero Contention Analytical Dashboards

Because the Operations Console reads metrics exclusively from MongoDB \`queue_stats\` and \`worker_health\` collections, operators can refresh dashboards every 500ms without placing a single read lock on the PostgreSQL transactional queue.
`,
  },

  "sql-colocation": {
    id: "sql-colocation",
    title: "In-Transaction SQL Colocation",
    category: "2. Integration Patterns",
    slug: "sql-colocation",
    description: "Embedding job enqueues directly inside your existing SQL business transactions with zero external broker.",
    toc: [
      { id: "colocation-concept", text: "The Colocation Pattern", level: 2 },
      { id: "plain-jdbc-example", text: "Plain JDBC Transaction Example", level: 2 },
      { id: "spring-transaction-example", text: "Spring @Transactional Example", level: 2 },
    ],
    content: `
# In-Transaction SQL Colocation

With traditional queue architectures, your application connects to PostgreSQL for user data and RabbitMQ/Redis for background jobs. In-Transaction SQL Colocation moves the queue directly into your primary PostgreSQL instance, giving you **100% atomic consistency**.

## The Colocation Pattern

\`\`\`
┌────────────────────────────────────────────────────────┐
│ PostgreSQL Instance (port 5432)                        │
│ ┌──────────────────────┐    ┌────────────────────────┐ │
│ │  Business Tables     │    │  Evora Queue Engine    │ │
│ │  - users             │    │  - jobs                │ │
│ │  - orders            │    │  - events              │ │
│ │  - payments          │    │  - transactional_outbox│ │
│ └──────────────────────┘    └────────────────────────┘ │
└────────────────────────────────────────────────────────┘
\`\`\`

## Plain JDBC Transaction Example

\`\`\`java
try (Connection conn = dataSource.getConnection()) {
    conn.setAutoCommit(false);
    try {
        // 1. Insert domain record
        PreparedStatement stmt1 = conn.prepareStatement(
            "INSERT INTO invoices (id, customer_id, total) VALUES (?, ?, ?)");
        stmt1.setString(1, "inv_8812");
        stmt1.setString(2, "cust_01");
        stmt1.setBigDecimal(3, new BigDecimal("499.00"));
        stmt1.executeUpdate();

        // 2. Enqueue background PDF generation job
        PreparedStatement stmt2 = conn.prepareStatement(
            "INSERT INTO jobs (idempotency_key, queue, priority, payload) " +
            "VALUES (?, 'invoices', 2, ?::jsonb)");
        stmt2.setString(1, "INV_PDF_inv_8812");
        stmt2.setString(2, "{\"invoice_id\": \"inv_8812\", \"action\": \"RENDER_PDF\"}");
        stmt2.executeUpdate();

        conn.commit(); // Atomic commit of invoice + background task!
    } catch (Exception e) {
        conn.rollback();
        throw e;
    }
}
\`\`\`

## Spring @Transactional Example

\`\`\`java
@Service
public class OrderService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Transactional
    public void processCheckout(Order order) {
        // Business write
        jdbcTemplate.update("INSERT INTO orders (id, total) VALUES (?, ?)", 
            order.getId(), order.getTotal());

        // Background worker dispatch
        jdbcTemplate.update(
            "INSERT INTO jobs (idempotency_key, queue, priority, payload) " +
            "VALUES (?, 'critical', 1, ?::jsonb)",
            "ORDER_CHARGE_" + order.getId(),
            String.format("{\"order_id\": \"%s\", \"amount\": %.2f}", order.getId(), order.getTotal())
        );
    }
}
\`\`\`
`,
  },

  "spring-boot": {
    id: "spring-boot",
    title: "Spring Boot & Managed Worker Beans",
    category: "2. Integration Patterns",
    slug: "spring-boot",
    description: "Declarative Spring Boot setup with configuration properties, thread pools, and graceful shutdown.",
    toc: [
      { id: "spring-configuration", text: "Spring Configuration Class", level: 2 },
      { id: "worker-bean-definition", text: "Managed EvoraWorker Bean", level: 2 },
      { id: "graceful-shutdown-hook", text: "Graceful Shutdown Lifecycle", level: 2 },
    ],
    content: `
# Spring Boot & Managed Worker Beans

Integrating Evora into modern Spring Boot applications takes under 15 lines of declarative Java configuration.

## Spring Configuration Class

\`\`\`java
@Configuration
public class EvoraWorkerConfig {

    @Value("\${evora.server.url:http://localhost:8080}")
    private String evoraServerUrl;

    @Bean
    public EvoraClient evoraClient() {
        return EvoraClient.create(evoraServerUrl);
    }

    @Bean(destroyMethod = "stop")
    public EvoraWorker paymentWorker(EvoraClient client, PaymentService paymentService) {
        EvoraWorker worker = EvoraWorker.builder()
            .client(client)
            .workerId("payment-worker-spring-01")
            .queue("critical")
            .concurrency(4)
            .pollIntervalMs(200)
            .handler(job -> {
                try {
                    paymentService.executeCharge(job.getPayload());
                    return JobResult.success();
                } catch (Exception ex) {
                    return JobResult.failure(ex.getMessage());
                }
            })
            .build();

        worker.start();
        return worker;
    }
}
\`\`\`

## Graceful Shutdown Lifecycle

By annotating the worker bean with \`@Bean(destroyMethod = "stop")\`:
1. When Spring Boot receives a \`SIGTERM\` (e.g. Kubernetes pod termination), Spring stops the worker's polling loop.
2. Active worker threads are given a grace period to finish in-flight jobs.
3. No jobs are lost or left in a dangling locked state during rolling deployments.
`,
  },

  "polyglot-rest": {
    id: "polyglot-rest",
    title: "Polyglot REST (Python / Go / Node)",
    category: "2. Integration Patterns",
    slug: "polyglot-rest",
    description: "Integrating non-Java microservices with Evora's REST v1 API engine.",
    toc: [
      { id: "python-worker-example", text: "Python AI/ML Worker Example", level: 2 },
      { id: "go-producer-example", text: "Go High-Throughput Producer Example", level: 2 },
      { id: "nodejs-express-example", text: "Node.js / Next.js Integration", level: 2 },
    ],
    content: `
# Polyglot REST (Python / Go / Node)

Evora provides a first-class HTTP/JSON REST interface for polyglot microservice ecosystems. Any language capable of issuing HTTP requests can enqueue or process jobs.

## Python AI/ML Worker Example

\`\`\`python
import requests
import time

EVORA_URL = "http://localhost:8080/api/v1"
WORKER_ID = "python-llm-worker-01"

def run_worker():
    print(f"[{WORKER_ID}] Polling for AI inference jobs...")
    while True:
        try:
            resp = requests.get(f"{EVORA_URL}/jobs/poll?worker_id={WORKER_ID}")
            if resp.status_code == 200:
                job = resp.json()
                job_id = job["id"]
                print(f"Claimed Job: {job_id} | Payload: {job['payload']}")

                # Process AI task...
                time.sleep(2)

                # Mark complete
                requests.post(
                    f"{EVORA_URL}/jobs/{job_id}/complete",
                    json={"worker_id": WORKER_ID}
                )
            else:
                time.sleep(0.5) # Queue empty
        except Exception as e:
            print("Poll error:", e)
            time.sleep(1)

if __name__ == "__main__":
    run_worker()
\`\`\`

## Go High-Throughput Producer Example

\`\`\`go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

type JobRequest struct {
    Queue          string                 \`json:"queue"\`
    Priority       int                    \`json:"priority"\`
    IdempotencyKey string                 \`json:"idempotencyKey"\`
    Payload        map[string]interface{} \`json:"payload"\`
}

func main() {
    payload := JobRequest{
        Queue:          "critical",
        Priority:       1,
        IdempotencyKey: "GO-ORDER-991",
        Payload:        map[string]interface{}{"amount": 149.99, "currency": "USD"},
    }

    body, _ := json.Marshal(payload)
    resp, err := http.Post("http://localhost:8080/api/v1/jobs", "application/json", bytes.NewBuffer(body))
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    fmt.Printf("Job Enqueued! HTTP Status: %d\\n", resp.StatusCode)
}
\`\`\`
`,
  },

  "choreographed-sagas": {
    id: "choreographed-sagas",
    title: "Choreographed Sagas & Rollbacks",
    category: "2. Integration Patterns",
    slug: "choreographed-sagas",
    description: "Coordinating multi-service workflows with automated reverse compensating events.",
    toc: [
      { id: "saga-architecture", text: "Choreography vs Orchestration", level: 2 },
      { id: "evora-saga-workflow", text: "Three-Stage Workflow (Validation -> Execution -> Notification)", level: 2 },
      { id: "compensation-events", text: "Automated Compensation Rollbacks", level: 2 },
    ],
    content: `
# Choreographed Sagas & Rollbacks

When a background job spans multiple independent microservices, a failure in a downstream step requires **compensating actions** to undo earlier mutations.

## Three-Stage Workflow

Evora's \`JobExecutionSaga\` coordinator executes a 3-step pipeline:

\`\`\`
[JobSubmitted] ──> [1. ValidationService]
                         │ (Success)
                         ▼
                   [2. ExecutionService]
                         │ (Success)
                         ▼
                   [3. NotificationService] ──> [JobCompleted]
\`\`\`

## Automated Compensation Rollbacks

If step 3 (Notification) fails:
1. Saga catches failure and records \`NotificationFailedEvent\`.
2. Saga triggers compensation on Execution: \`executionService.rollback()\`, appending \`ExecutionRolledBackEvent\`.
3. Saga triggers compensation on Validation: \`validationService.releaseResources()\`, appending \`ValidationResourcesReleasedEvent\`.
4. The system is returned to a clean, consistent state with a complete audit record.
`,
  },

  "sweeper-leases": {
    id: "sweeper-leases",
    title: "Lease Concurrency & Sweepers",
    category: "3. Distributed Systems Core",
    slug: "sweeper-leases",
    description: "Detecting dead worker nodes, lease heartbeat renewals, and automated requeuing.",
    toc: [
      { id: "lease-lifecycle", text: "Worker Lease Lifecycle", level: 2 },
      { id: "heartbeat-loop", text: "Client SDK Heartbeat Extension", level: 2 },
      { id: "sweeper-algorithm", text: "VisibilityTimeoutSweeper Algorithm", level: 2 },
    ],
    content: `
# Lease Concurrency & Sweepers

When a worker claims a job, Evora sets a visibility timeout (\`locked_until = NOW() + 30 seconds\`). If the worker crashes mid-task, the job must not be stranded forever.

## Client SDK Heartbeat Extension

While processing a long-running workload (e.g. video transcode), the \`EvoraWorker\` thread automatically sends background heartbeats every 15 seconds:

\`\`\`sql
UPDATE jobs
SET locked_until = NOW() + INTERVAL '30 seconds'
WHERE id = ? AND worker_id = ? AND status = 'RUNNING';
\`\`\`

## VisibilityTimeoutSweeper Algorithm

The \`VisibilityTimeoutSweeper\` daemon runs every 10 seconds:

\`\`\`sql
SELECT * FROM jobs
WHERE status = 'RUNNING'
  AND locked_until < NOW();
\`\`\`

* **If attempt_count < max_attempts**: The sweeper resets \`status = 'PENDING'\` and clears \`worker_id\`, allowing another healthy worker to claim the job immediately.
* **If attempt_count >= max_attempts**: The sweeper escalates \`status = 'DLQ'\` and triggers an alarm for human operator review.
`,
  },

  "dlq-triage": {
    id: "dlq-triage",
    title: "DLQ Quarantine & Poison Pills",
    category: "3. Distributed Systems Core",
    slug: "dlq-triage",
    description: "Handling poison-pill payloads, exponential backoff retries, and quarantine isolation.",
    toc: [
      { id: "poison-pill-problem", text: "The Poison-Pill Hazard", level: 2 },
      { id: "retry-escalation", text: "Attempt Counter & Max Retry Threshold", level: 2 },
      { id: "dlq-isolation", text: "Quarantine Isolation", level: 2 },
    ],
    content: `
# DLQ Quarantine & Poison Pills

A **poison pill** is a malformed job payload that causes worker processes to crash immediately (e.g. Out-Of-Memory error, unhandled NullPointerException). Without quarantine safeguards, a poison pill can crash an entire worker cluster in a cascading loop.

## Attempt Counter & Max Retry Threshold

Each time a worker fails or crashes on a job:
1. \`attempt_count\` increments by 1.
2. \`last_error\` records the stack trace summary.
3. If \`attempt_count < max_attempts\` (default 3), the job is retried with exponential backoff.
4. Once \`attempt_count >= max_attempts\`, Evora atomically transitions the job to \`DLQ\`.

## Quarantine Isolation

In \`DLQ\` status:
* The job is excluded from the \`idx_jobs_poll\` partial index.
* Regular worker nodes will **never poll or execute it again**.
* The payload and error context are preserved for operator inspection.
`,
  },

  "chaos-resilience": {
    id: "chaos-resilience",
    title: "Chaos Resilience & Node Crashes",
    category: "3. Distributed Systems Core",
    slug: "chaos-resilience",
    description: "Simulating node failures, network splits, and duplicate burst storms.",
    toc: [
      { id: "worker-crash-test", text: "Worker Hard-Crash Recovery", level: 2 },
      { id: "burst-duplicate-rejection", text: "10,000-Duplicate Idempotency Storm", level: 2 },
    ],
    content: `
# Chaos Resilience & Node Crashes

Evora is battle-tested against extreme failure modes.

## Worker Hard-Crash Recovery

When a worker JVM experiences a \`kill -9\`:
1. The PostgreSQL connection drops; uncommitted in-flight queries abort.
2. The heartbeat stops.
3. Within 10 to 30 seconds, \`VisibilityTimeoutSweeper\` reclaims the job tuple and marks it \`PENDING\`.
4. Surrounding workers pick up the task with zero operator intervention.

## 10,000-Duplicate Idempotency Storm

If an upstream payment gateway replays 10,000 identical charge requests simultaneously:
1. PostgreSQL unique index on \`idempotency_key\` accepts exactly 1 write.
2. All 9,999 subsequent submissions hit the unique index constraint and return HTTP 200 with the existing record (\`already_exists: true\`).
3. Card is charged **exactly once**.
`,
  },

  "postgres-tuning": {
    id: "postgres-tuning",
    title: "PostgreSQL Indexing & Autovacuum",
    category: "4. Operations Runbook",
    slug: "postgres-tuning",
    description: "Index definitions, autovacuum parameters, and table maintenance for 20,000+ jobs/sec.",
    toc: [
      { id: "index-architecture", text: "Required Index Architecture", level: 2 },
      { id: "autovacuum-tuning", text: "Autovacuum Tuning for Queue Tables", level: 2 },
    ],
    content: `
# PostgreSQL Indexing & Autovacuum

High-throughput queues create substantial row churn (inserts, updates, completions). Proper PostgreSQL tuning is required to maintain zero disk bloat and stable query execution plans.

## Required Index Architecture

\`\`\`sql
-- 1. Lock-free poll partial index (Crucial: keep small!)
CREATE INDEX idx_jobs_poll 
  ON jobs (queue, priority ASC, scheduled_at ASC) 
  WHERE status = 'PENDING';

-- 2. Lease sweeper partial index
CREATE INDEX idx_jobs_expired_locks 
  ON jobs (locked_until) 
  WHERE status = 'RUNNING';

-- 3. Idempotency unique constraint
CREATE UNIQUE INDEX idx_jobs_idempotency 
  ON jobs (idempotency_key);
\`\`\`

## Autovacuum Tuning for Queue Tables

Because jobs are constantly inserted and updated, the default PostgreSQL autovacuum settings are too slow. Apply aggressive vacuuming parameters directly to the \`jobs\` table:

\`\`\`sql
ALTER TABLE jobs SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_vacuum_cost_limit = 1000,
  autovacuum_vacuum_cost_delay = 2
);
\`\`\`
`,
  },

  "pool-sizing": {
    id: "pool-sizing",
    title: "Connection Pool Sizing (HikariCP)",
    category: "4. Operations Runbook",
    slug: "pool-sizing",
    description: "Calculating optimal database connections for worker threads and API servers.",
    toc: [
      { id: "pool-formula", text: "Connection Sizing Formula", level: 2 },
      { id: "hikaricp-config", text: "Recommended HikariCP Settings", level: 2 },
    ],
    content: `
# Connection Pool Sizing (HikariCP)

A common mistake in database queue setups is over-allocating database connections, leading to CPU cache thrashing and context switching.

## Connection Sizing Formula

Follow PostgreSQL's standard connection formula:
\`\`\`
max_pool_size = (CPU_CORES * 2) + DISK_SPINDLES
\`\`\`

For an 8-core database server with SSDs:
* Set PostgreSQL \`max_connections = 100\`.
* Set API Server HikariCP pool = **20 connections**.
* Set Worker Nodes HikariCP pool = **10 connections per 16 worker threads**.

## Recommended HikariCP Settings

\`\`\`properties
dataSource.maximumPoolSize=20
dataSource.minimumIdle=10
dataSource.idleTimeout=30000
dataSource.maxLifetime=1800000
dataSource.connectionTimeout=5000
\`\`\`
`,
  },

  "dlq-ops": {
    id: "dlq-ops",
    title: "DLQ Surgical Replay Runbook",
    category: "4. Operations Runbook",
    slug: "dlq-ops",
    description: "Step-by-step runbook for triaging, replaying, and purging Dead Letter Queue items.",
    toc: [
      { id: "inspecting-dlq", text: "Inspecting DLQ Jobs", level: 2 },
      { id: "replay-single-job", text: "Surgical Single-Job Replay", level: 2 },
      { id: "bulk-replay", text: "Bulk Replay & Purge", level: 2 },
    ],
    content: `
# DLQ Surgical Replay Runbook

When jobs land in the DLQ, follow this incident response runbook.

## Inspecting DLQ Jobs

Query DLQ jobs using cURL:
\`\`\`bash
curl -X GET http://localhost:8080/api/v1/jobs/dlq
\`\`\`

Inspect the \`last_error\` field to understand why the worker failed.

## Surgical Single-Job Replay

Once downstream services are healthy, replay a specific job:
\`\`\`bash
curl -X POST http://localhost:8080/api/v1/jobs/c1f7a2b0-84a1-4a11-b0e2-7494f1c65b12/retry
\`\`\`

This resets \`attempt_count = 0\`, clears \`last_error\`, and sets \`status = 'PENDING'\`.

## Bulk Replay & Purge

* **Replay All DLQ Workloads**:
\`\`\`bash
curl -X POST http://localhost:8080/api/v1/jobs/dlq/retry-all
\`\`\`

* **Purge Poison Pills**:
\`\`\`bash
curl -X POST http://localhost:8080/api/v1/jobs/dlq/purge
\`\`\`
`,
  },

  "java-sdk": {
    id: "java-sdk",
    title: "Java Client SDK (com.evora.client)",
    category: "5. API & SDK Reference",
    slug: "java-sdk",
    description: "Complete API specification for EvoraClient, EvoraWorker, JobRequest, and JobResult.",
    toc: [
      { id: "evora-client-api", text: "EvoraClient Methods", level: 2 },
      { id: "evora-worker-builder", text: "EvoraWorker Builder Options", level: 2 },
      { id: "job-request-schema", text: "JobRequest Specification", level: 2 },
    ],
    content: `
# Java Client SDK (com.evora.client)

The \`com.evora.client\` library is a zero-dependency, thread-safe SDK built on standard \`java.net.http.HttpClient\`.

## EvoraClient Methods

| Method | Description | Return Type |
| :--- | :--- | :--- |
| \`create(String baseUrl)\` | Factory method to instantiate client. | \`EvoraClient\` |
| \`enqueue(JobRequest req)\` | Submits job with idempotency deduplication. | \`Job\` |
| \`pollNextJob(String workerId)\` | Claims next highest priority pending job. | \`Optional<Job>\` |
| \`heartbeat(String id, String workerId)\` | Extends worker lease by 30 seconds. | \`boolean\` |
| \`complete(String id, String workerId)\` | Marks job as \`COMPLETED\`. | \`boolean\` |
| \`fail(String id, String workerId, String error)\` | Records error and triggers retry or DLQ. | \`boolean\` |
| \`getDLQJobs()\` | Retrieves dead letter queue items. | \`List<Job>\` |

## EvoraWorker Builder Options

\`\`\`java
EvoraWorker worker = EvoraWorker.builder()
    .client(evoraClient)             // EvoraClient instance
    .workerId("payment-worker-01")    // Unique worker node identifier
    .queue("critical")               // Queue lane to poll
    .concurrency(4)                  // Number of concurrent execution threads
    .pollIntervalMs(250)             // Polling frequency when queue is empty
    .handler(job -> {                // Business logic handler lambda
        // execute task...
        return JobResult.success();
    })
    .build();

worker.start();
\`\`\`
`,
  },

  "api-reference": {
    id: "api-reference",
    title: "REST API v1 Specification",
    category: "5. API & SDK Reference",
    slug: "api-reference",
    description: "Complete HTTP/JSON endpoints, parameters, request/response models, and status codes.",
    toc: [
      { id: "post-jobs", text: "POST /api/v1/jobs", level: 2 },
      { id: "get-poll", text: "GET /api/v1/jobs/poll", level: 2 },
      { id: "post-complete", text: "POST /api/v1/jobs/:id/complete", level: 2 },
      { id: "post-fail", text: "POST /api/v1/jobs/:id/fail", level: 2 },
      { id: "get-stats", text: "GET /api/v1/queues/stats", level: 2 },
    ],
    content: `
# REST API v1 Specification

All endpoints accept and return \`application/json\` and support CORS headers.

## POST /api/v1/jobs
Submits a workload into the queue fabric.

**Request Body**:
\`\`\`json
{
  "queue": "critical",
  "priority": 1,
  "idempotencyKey": "ORDER-9912",
  "payload": { "amount": 299.99, "action": "CHARGE_CARD" }
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
  "maxAttempts": 3,
  "createdAt": "2026-08-19T12:00:00Z"
}
\`\`\`

## GET /api/v1/jobs/poll?worker_id=worker-01
Claims the next highest priority pending job.

**Response (200 OK)**: Returns the claimed \`Job\` object.
**Response (404 Not Found)**: Returned when no pending jobs match.

## POST /api/v1/jobs/:id/complete
Marks a job successfully finished.
`,
  },

  "event-catalog": {
    id: "event-catalog",
    title: "Domain Event Schema Catalog",
    category: "5. API & SDK Reference",
    slug: "event-catalog",
    description: "Catalog of all immutable domain events published across the Evora fabric.",
    toc: [
      { id: "job-lifecycle-events", text: "Job Lifecycle Events", level: 2 },
      { id: "saga-compensation-events", text: "Saga & Compensation Events", level: 2 },
    ],
    content: `
# Domain Event Schema Catalog

Evora emits domain events to the event bus and transactional outbox.

## Job Lifecycle Events

* \`JobSubmittedEvent\`: Emitted when a new workload is enqueued.
* \`JobCompletedEvent\`: Emitted when a worker finishes execution.
* \`JobFailedEvent\`: Emitted when an attempt fails or lease expires.

## Saga & Compensation Events

* \`ValidationPassedEvent\` / \`ValidationFailedEvent\`
* \`ExecutionSuccessEvent\` / \`ExecutionFailedEvent\`
* \`ValidationResourcesReleasedEvent\` (Compensating action)
* \`ExecutionRolledBackEvent\` (Compensating action)
* \`NotificationSentEvent\` / \`NotificationFailedEvent\`
`,
  },
};
