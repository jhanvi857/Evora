package com.evora.event;

import com.evora.shared.DomainEvent;

import java.time.Instant;

public record OrderConfirmedEvent(
        String aggregateId,
        int version,
        Instant occurredAt,
        String idempotencyKey
) implements DomainEvent {
}
