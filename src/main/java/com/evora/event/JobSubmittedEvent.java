package com.evora.event;

import com.evora.shared.DomainEvent;

import java.time.Instant;

public record JobSubmittedEvent(
        String aggregateId,
        int version,
        Instant occurredAt,
        String userId,
        String jobType,
        String priority,
        String payload,
        String idempotencyKey
) implements DomainEvent {
    public JobSubmittedEvent {
        if (aggregateId == null || aggregateId.isBlank()) {
            throw new IllegalArgumentException("aggregateId is required");
        }
        if (version <= 0) {
            throw new IllegalArgumentException("version must be greater than zero");
        }
        if (occurredAt == null) {
            throw new IllegalArgumentException("occurredAt is required");
        }
        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException("userId is required");
        }
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new IllegalArgumentException("idempotencyKey is required");
        }
    }
}
