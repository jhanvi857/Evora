package com.evora.event;

import com.evora.shared.DomainEvent;

import java.time.Instant;

public record OrderFailedEvent(
        String aggregateId,
        int version,
        Instant occurredAt,
        String reason,
        String idempotencyKey
) implements DomainEvent {
}
