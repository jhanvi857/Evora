package com.evora.event;

import com.evora.shared.DomainEvent;

import java.time.Instant;

public record ShipmentCreatedEvent(
        String aggregateId,
        int version,
        Instant occurredAt,
        String shipmentId,
        String idempotencyKey
) implements DomainEvent {
}
