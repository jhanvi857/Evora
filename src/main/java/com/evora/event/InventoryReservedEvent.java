package com.evora.event;

import com.evora.shared.DomainEvent;

import java.time.Instant;

public record InventoryReservedEvent(
        String aggregateId,
        int version,
        Instant occurredAt,
        String reservationId,
        String idempotencyKey
) implements DomainEvent {
}
