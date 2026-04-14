package com.evora.event;

import com.evora.shared.DomainEvent;

import java.time.Instant;

public record InventoryReleasedEvent(
        String aggregateId,
        int version,
        Instant occurredAt,
        String releaseId,
        String idempotencyKey
) implements DomainEvent {
}
