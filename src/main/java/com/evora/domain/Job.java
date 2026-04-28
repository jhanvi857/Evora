package com.evora.domain;

import com.evora.command.SubmitJobCommand;
import java.time.Instant;
import java.util.UUID;

public class Job {
    private UUID id;
    private String idempotencyKey;
    private String queue;
    private int priority;
    private String payload;
    private JobStatus status;
    private int attemptCount;
    private int maxAttempts;
    private String workerId;
    private Instant lockedUntil;
    private Instant scheduledAt;
    private Instant completedAt;
    private String lastError;
    private Instant createdAt;

    public Job() {}

    public Job(SubmitJobCommand cmd) {
        String rawId = cmd.aggregateId();
        if (rawId != null && rawId.startsWith("job-")) {
            rawId = rawId.substring(4);
        }
        this.id = UUID.fromString(rawId);
        this.idempotencyKey = cmd.idempotencyKey();
        this.queue = cmd.queue() != null ? cmd.queue().toLowerCase() : "default";
        this.priority = parsePriority(cmd.priority());
        this.payload = cmd.payload();
        this.status = JobStatus.PENDING;
        this.attemptCount = 0;
        this.maxAttempts = 3;
        this.scheduledAt = Instant.now();
        this.createdAt = Instant.now();
    }

    private int parsePriority(String priorityStr) {
        try {
            return Integer.parseInt(priorityStr);
        } catch (Exception e) {
            if ("critical".equalsIgnoreCase(priorityStr)) return 1;
            if ("high".equalsIgnoreCase(priorityStr)) return 3;
            if ("low".equalsIgnoreCase(priorityStr)) return 8;
            return 5;
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
    public String getQueue() { return queue; }
    public void setQueue(String queue) { this.queue = queue; }
    public int getPriority() { return priority; }
    public void setPriority(int priority) { this.priority = priority; }
    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }
    public JobStatus getStatus() { return status; }
    public void setStatus(JobStatus status) { this.status = status; }
    public int getAttemptCount() { return attemptCount; }
    public void setAttemptCount(int attemptCount) { this.attemptCount = attemptCount; }
    public int getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(int maxAttempts) { this.maxAttempts = maxAttempts; }
    public String getWorkerId() { return workerId; }
    public void setWorkerId(String workerId) { this.workerId = workerId; }
    public Instant getLockedUntil() { return lockedUntil; }
    public void setLockedUntil(Instant lockedUntil) { this.lockedUntil = lockedUntil; }
    public Instant getScheduledAt() { return scheduledAt; }
    public void setScheduledAt(Instant scheduledAt) { this.scheduledAt = scheduledAt; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
    public String getLastError() { return lastError; }
    public void setLastError(String lastError) { this.lastError = lastError; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
