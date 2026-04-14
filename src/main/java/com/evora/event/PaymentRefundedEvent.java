package com.evora.event;

import com.evora.shared.DomainEvent;

import java.math.BigDecimal;
import java.time.Instant;

public record PaymentRefundedEvent(
        String aggregateId,
        int version,
        Instant occurredAt,
        String refundId,
        BigDecimal amount,
        String idempotencyKey
) implements DomainEvent {
}
