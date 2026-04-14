package com.evora.event;

import com.evora.shared.DomainEvent;

import java.math.BigDecimal;
import java.time.Instant;

public record PaymentChargedEvent(
        String aggregateId,
        int version,
        Instant occurredAt,
        String paymentId,
        BigDecimal amount,
        String idempotencyKey
) implements DomainEvent {
}
