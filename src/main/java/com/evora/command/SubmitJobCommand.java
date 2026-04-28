package com.evora.command;

import com.evora.shared.Command;

import java.time.Instant;

public record SubmitJobCommand(
        String aggregateId,
        String submittedBy,
        String queue,
        String priority,
        String payload,
        String idempotencyKey,
        Instant timestamp) implements Command {
    
    @Override
    public Instant occurredAt() {
        return timestamp;
    }

    public SubmitJobCommand {
        if (aggregateId == null || aggregateId.isBlank()) {
            throw new IllegalArgumentException("aggregateId is required");
        }
        if (submittedBy == null || submittedBy.isBlank()) {
            throw new IllegalArgumentException("submittedBy is required");
        }
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new IllegalArgumentException("idempotencyKey is required");
        }
        if (timestamp == null) {
            throw new IllegalArgumentException("timestamp is required");
        }
        if (queue == null || queue.isBlank()) {
            throw new IllegalArgumentException("queue is required");
        }
        if (priority == null || priority.isBlank()) {
            throw new IllegalArgumentException("priority is required");
        }
    }
}
