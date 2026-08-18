package com.evora.api.http;

import com.evora.command.SubmitJobCommand;
import com.evora.domain.Job;
import com.evora.domain.JobSubmitResult;
import com.evora.handler.SubmitJobCommandHandler;
import com.evora.lifecycle.JobLifecycleManager;
import com.evora.store.PostgresJobStore;
import com.evora.worker.PriorityWorkerDispatcher;
import io.github.jhanvi857.nioflow.NioFlowApp;
import io.github.jhanvi857.nioflow.plugin.StaticFilesPlugin;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoCollection;
import org.bson.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public class HttpOrderServer {
    private final int port;
    private final ObjectMapper objectMapper;
    private final SubmitJobCommandHandler submitHandler;
    private final PriorityWorkerDispatcher dispatcher;
    private final PostgresJobStore jobStore;
    private final JobLifecycleManager lifecycleManager;
    private final MongoCollection<Document> queueStatsCollection;

    public HttpOrderServer(int port, SubmitJobCommandHandler submitHandler, 
                           PriorityWorkerDispatcher dispatcher, PostgresJobStore jobStore, 
                           JobLifecycleManager lifecycleManager, MongoClient mongoClient) {
        this.port = port;
        this.submitHandler = submitHandler;
        this.dispatcher = dispatcher;
        this.jobStore = jobStore;
        this.lifecycleManager = lifecycleManager;
        this.queueStatsCollection = mongoClient.getDatabase("evora").getCollection("queue_stats");
        this.objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    public void start() {
        NioFlowApp app = new NioFlowApp();

        // Health check endpoint
        app.get("/health", ctx -> {
            ctx.status(200).json(Map.of(
                "status", "UP",
                "service", "Evora Distributed Job Queue Engine",
                "timestamp", Instant.now().toString()
            ));
        });

        app.get("/api/v1/health", ctx -> {
            ctx.status(200).json(Map.of(
                "status", "UP",
                "service", "Evora Distributed Job Queue Engine",
                "version", "1.0.0",
                "timestamp", Instant.now().toString()
            ));
        });

        // 1. Job Creation
        app.post("/jobs", ctx -> {
            try {
                String bodyString = ctx.bodyAsString();
                if (bodyString.length() > 512 * 1024) {
                    ctx.status(413).json(Map.of(
                        "error", "PAYLOAD_TOO_LARGE",
                        "message", "Payload exceeds 512KB limit. Store large data in S3 and pass reference."
                    ));
                    return;
                }

                @SuppressWarnings("unchecked")
                Map<String, Object> bodyMap = objectMapper.readValue(bodyString, Map.class);
                
                String idempotencyKey = (String) bodyMap.getOrDefault("idempotencyKey", UUID.randomUUID().toString());
                String queue = (String) bodyMap.getOrDefault("queue", "default");
                String priority = bodyMap.get("priority") != null ? String.valueOf(bodyMap.get("priority")) : "5";
                String payload = bodyMap.get("payload") != null ? objectMapper.writeValueAsString(bodyMap.get("payload")) : "{}";
                
                SubmitJobCommand cmd = new SubmitJobCommand(
                    UUID.randomUUID().toString(),
                    "user-1",
                    queue,
                    priority,
                    payload,
                    idempotencyKey,
                    Instant.now()
                );
                
                JobSubmitResult result = submitHandler.handle(cmd);
                if (result.isAlreadyExists()) {
                    ctx.status(200).json(Map.of("already_exists", true, "job", result.getJob()));
                } else {
                    ctx.status(201).json(result.getJob());
                }
            } catch (Exception e) {
                ctx.status(400).json(Map.of("error", e.getMessage() != null ? e.getMessage() : "Bad request"));
            }
        });

        app.post("/api/v1/jobs", ctx -> {
            try {
                String bodyString = ctx.bodyAsString();
                if (bodyString.length() > 512 * 1024) {
                    ctx.status(413).json(Map.of(
                        "error", "PAYLOAD_TOO_LARGE",
                        "message", "Payload exceeds 512KB limit."
                    ));
                    return;
                }

                @SuppressWarnings("unchecked")
                Map<String, Object> bodyMap = objectMapper.readValue(bodyString, Map.class);
                
                String idempotencyKey = (String) bodyMap.getOrDefault("idempotencyKey", UUID.randomUUID().toString());
                String queue = (String) bodyMap.getOrDefault("queue", "default");
                String priority = bodyMap.get("priority") != null ? String.valueOf(bodyMap.get("priority")) : "5";
                String payload = bodyMap.get("payload") != null ? objectMapper.writeValueAsString(bodyMap.get("payload")) : "{}";
                
                SubmitJobCommand cmd = new SubmitJobCommand(
                    UUID.randomUUID().toString(),
                    "user-1",
                    queue,
                    priority,
                    payload,
                    idempotencyKey,
                    Instant.now()
                );
                
                JobSubmitResult result = submitHandler.handle(cmd);
                if (result.isAlreadyExists()) {
                    ctx.status(200).json(Map.of("already_exists", true, "job", result.getJob()));
                } else {
                    ctx.status(201).json(result.getJob());
                }
            } catch (Exception e) {
                ctx.status(400).json(Map.of("error", e.getMessage() != null ? e.getMessage() : "Bad request"));
            }
        });

        // 2. Static Endpoints
        app.get("/jobs/poll", ctx -> {
            String workerId = ctx.query("worker_id");
            if (workerId == null || workerId.isBlank()) {
                ctx.status(400).json(Map.of("error", "worker_id required"));
                return;
            }
            Optional<Job> job = dispatcher.pollNextJob(workerId);
            if (job.isPresent()) {
                ctx.json(job.get());
            } else {
                ctx.status(404).json(Map.of("message", "No jobs available"));
            }
        });

        app.get("/api/v1/jobs/poll", ctx -> {
            String workerId = ctx.query("worker_id");
            if (workerId == null || workerId.isBlank()) {
                ctx.status(400).json(Map.of("error", "worker_id required"));
                return;
            }
            Optional<Job> job = dispatcher.pollNextJob(workerId);
            if (job.isPresent()) {
                ctx.json(job.get());
            } else {
                ctx.status(404).json(Map.of("message", "No jobs available"));
            }
        });

        app.get("/jobs/dlq", ctx -> {
            ctx.json(jobStore.findDLQJobs(50, 0));
        });
        app.get("/api/v1/jobs/dlq", ctx -> {
            ctx.json(jobStore.findDLQJobs(50, 0));
        });

        app.get("/system/jobs", ctx -> {
            ctx.json(jobStore.findAllJobs(100));
        });
        app.get("/api/v1/jobs", ctx -> {
            ctx.json(jobStore.findAllJobs(100));
        });

        app.post("/jobs/dlq/retry-all", ctx -> {
            int count = jobStore.retryAllDLQJobs();
            ctx.status(200).json(Map.of("status", "retried_all", "count", count));
        });
        app.post("/api/v1/jobs/dlq/retry-all", ctx -> {
            int count = jobStore.retryAllDLQJobs();
            ctx.status(200).json(Map.of("status", "retried_all", "count", count));
        });

        app.post("/jobs/dlq/purge", ctx -> {
            int count = jobStore.purgeDLQJobs();
            ctx.status(200).json(Map.of("status", "purged", "count", count));
        });
        app.post("/api/v1/jobs/dlq/purge", ctx -> {
            int count = jobStore.purgeDLQJobs();
            ctx.status(200).json(Map.of("status", "purged", "count", count));
        });

        app.post("/admin/reset", ctx -> {
            try {
                jobStore.truncateAllData();
                queueStatsCollection.deleteMany(new Document());
                ctx.status(200).json(Map.of("status", "reset_successful", "message", "All database tables, events, and telemetry stats purged cleanly."));
            } catch (Exception e) {
                ctx.status(500).json(Map.of("error", e.getMessage()));
            }
        });

        app.get("/queues/stats", ctx -> {
            List<Document> stats = new ArrayList<>();
            queueStatsCollection.find().projection(new Document("_id", 0)).into(stats);
            ctx.json(stats);
        });
        app.get("/api/v1/queues/stats", ctx -> {
            List<Document> stats = new ArrayList<>();
            queueStatsCollection.find().projection(new Document("_id", 0)).into(stats);
            ctx.json(stats);
        });

        // 3. Parameterized Endpoints
        app.post("/jobs/:id/heartbeat", ctx -> {
            UUID jobId = UUID.fromString(ctx.pathParam("id"));
            try {
                @SuppressWarnings("unchecked")
                Map<String, String> body = objectMapper.readValue(ctx.bodyAsString(), Map.class);
                String workerId = body.get("worker_id");
                boolean extended = jobStore.extendLock(jobId, workerId, 30);
                if (!extended) {
                    ctx.status(409).json(Map.of("error", "JOB_EVICTED", "message", "Worker lease expired. Discard result."));
                } else {
                    ctx.status(200).json(Map.of("status", "ok"));
                }
            } catch (Exception e) {
                ctx.status(400).json(Map.of("error", e.getMessage()));
            }
        });

        app.post("/api/v1/jobs/:id/heartbeat", ctx -> {
            UUID jobId = UUID.fromString(ctx.pathParam("id"));
            try {
                @SuppressWarnings("unchecked")
                Map<String, String> body = objectMapper.readValue(ctx.bodyAsString(), Map.class);
                String workerId = body.get("worker_id");
                boolean extended = jobStore.extendLock(jobId, workerId, 30);
                if (!extended) {
                    ctx.status(409).json(Map.of("error", "JOB_EVICTED", "message", "Worker lease expired. Discard result."));
                } else {
                    ctx.status(200).json(Map.of("status", "ok"));
                }
            } catch (Exception e) {
                ctx.status(400).json(Map.of("error", e.getMessage()));
            }
        });

        app.post("/jobs/:id/complete", ctx -> {
            UUID jobId = UUID.fromString(ctx.pathParam("id"));
            try {
                @SuppressWarnings("unchecked")
                Map<String, String> body = objectMapper.readValue(ctx.bodyAsString(), Map.class);
                lifecycleManager.complete(jobId, body.get("worker_id"));
                ctx.status(200).json(Map.of("status", "completed"));
            } catch (Exception e) {
                ctx.status(400).json(Map.of("error", e.getMessage()));
            }
        });

        app.post("/api/v1/jobs/:id/complete", ctx -> {
            UUID jobId = UUID.fromString(ctx.pathParam("id"));
            try {
                @SuppressWarnings("unchecked")
                Map<String, String> body = objectMapper.readValue(ctx.bodyAsString(), Map.class);
                lifecycleManager.complete(jobId, body.get("worker_id"));
                ctx.status(200).json(Map.of("status", "completed"));
            } catch (Exception e) {
                ctx.status(400).json(Map.of("error", e.getMessage()));
            }
        });

        app.post("/jobs/:id/fail", ctx -> {
            UUID jobId = UUID.fromString(ctx.pathParam("id"));
            try {
                @SuppressWarnings("unchecked")
                Map<String, String> body = objectMapper.readValue(ctx.bodyAsString(), Map.class);
                lifecycleManager.fail(jobId, body.get("worker_id"), body.getOrDefault("error", "Unknown error"));
                ctx.status(200).json(Map.of("status", "failed"));
            } catch (Exception e) {
                ctx.status(400).json(Map.of("error", e.getMessage()));
            }
        });

        app.post("/api/v1/jobs/:id/fail", ctx -> {
            UUID jobId = UUID.fromString(ctx.pathParam("id"));
            try {
                @SuppressWarnings("unchecked")
                Map<String, String> body = objectMapper.readValue(ctx.bodyAsString(), Map.class);
                lifecycleManager.fail(jobId, body.get("worker_id"), body.getOrDefault("error", "Unknown error"));
                ctx.status(200).json(Map.of("status", "failed"));
            } catch (Exception e) {
                ctx.status(400).json(Map.of("error", e.getMessage()));
            }
        });

        app.post("/jobs/:id/cancel", ctx -> {
            UUID jobId = UUID.fromString(ctx.pathParam("id"));
            try {
                String bodyAsString = ctx.bodyAsString();
                String reason = "Cancelled by user";
                if (bodyAsString != null && !bodyAsString.isBlank()) {
                    @SuppressWarnings("unchecked")
                    Map<String, String> body = objectMapper.readValue(bodyAsString, Map.class);
                    reason = body.getOrDefault("reason", reason);
                }
                lifecycleManager.cancel(jobId, reason);
                ctx.status(200).json(Map.of("status", "cancelled"));
            } catch (Exception e) {
                ctx.status(400).json(Map.of("error", e.getMessage()));
            }
        });

        app.post("/api/v1/jobs/:id/cancel", ctx -> {
            UUID jobId = UUID.fromString(ctx.pathParam("id"));
            try {
                String bodyAsString = ctx.bodyAsString();
                String reason = "Cancelled by user";
                if (bodyAsString != null && !bodyAsString.isBlank()) {
                    @SuppressWarnings("unchecked")
                    Map<String, String> body = objectMapper.readValue(bodyAsString, Map.class);
                    reason = body.getOrDefault("reason", reason);
                }
                lifecycleManager.cancel(jobId, reason);
                ctx.status(200).json(Map.of("status", "cancelled"));
            } catch (Exception e) {
                ctx.status(400).json(Map.of("error", e.getMessage()));
            }
        });

        app.post("/jobs/:id/retry", ctx -> {
            UUID jobId = UUID.fromString(ctx.pathParam("id"));
            jobStore.retryDLQJob(jobId);
            ctx.status(200).json(Map.of("status", "retried"));
        });

        app.post("/api/v1/jobs/:id/retry", ctx -> {
            UUID jobId = UUID.fromString(ctx.pathParam("id"));
            jobStore.retryDLQJob(jobId);
            ctx.status(200).json(Map.of("status", "retried"));
        });

        app.get("/jobs/:id/events", ctx -> {
            UUID jobId = UUID.fromString(ctx.pathParam("id"));
            ctx.json(jobStore.findEventsByJobId(jobId));
        });

        app.get("/api/v1/jobs/:id/events", ctx -> {
            UUID jobId = UUID.fromString(ctx.pathParam("id"));
            ctx.json(jobStore.findEventsByJobId(jobId));
        });

        app.get("/jobs/:id", ctx -> {
            UUID jobId = UUID.fromString(ctx.pathParam("id"));
            jobStore.findById(jobId)
                .ifPresentOrElse(ctx::json, () -> ctx.status(404).json(Map.of("error", "Not found")));
        });

        app.get("/api/v1/jobs/:id", ctx -> {
            UUID jobId = UUID.fromString(ctx.pathParam("id"));
            jobStore.findById(jobId)
                .ifPresentOrElse(ctx::json, () -> ctx.status(404).json(Map.of("error", "Not found")));
        });

        app.register(new StaticFilesPlugin("src/main/resources/static"));

        System.out.println("\n[NioFlow] Evora Job Queue Control Plane running on port " + port);
        app.listen(port);
    }
}
