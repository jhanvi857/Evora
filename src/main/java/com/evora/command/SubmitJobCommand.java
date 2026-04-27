package com.evora.command;

import com.evora.shared.Command;

import java.time.Instant;

public record SubmitJobCommand(
        String aggregateId,
        String userId,
        String jobType,
        String priority,
        String payload,
        String idempotencyKey,
        Instant occurredAt) implements Command {
    public SubmitJobCommand {
        if (aggregateId == null || aggregateId.isBlank()) {
            throw new IllegalArgumentException("aggregateId is required");
        }
        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException("userId is required");
        }
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new IllegalArgumentException("idempotencyKey is required");
        }
        if (occurredAt == null) {
            throw new IllegalArgumentException("occurredAt is required");
        }
        if (jobType == null || jobType.isBlank()) {
            throw new IllegalArgumentException("jobType is required");
        }
        if (priority == null || priority.isBlank()) {
            throw new IllegalArgumentException("priority is required");
        }
    }
}
