package com.evora.event;

import com.evora.domain.order.OrderItem;
import com.evora.shared.DomainEvent;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderPlacedEvent(
        String aggregateId,
        int version,
        Instant occurredAt,
        String customerId,
        List<OrderItem> items,
        BigDecimal totalAmount,
        String idempotencyKey
) implements DomainEvent {
    public OrderPlacedEvent {
        if (aggregateId == null || aggregateId.isBlank()) {
            throw new IllegalArgumentException("aggregateId is required");
        }
        if (version <= 0) {
            throw new IllegalArgumentException("version must be greater than zero");
        }
        if (occurredAt == null) {
            throw new IllegalArgumentException("occurredAt is required");
        }
        if (customerId == null || customerId.isBlank()) {
            throw new IllegalArgumentException("customerId is required");
        }
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("items must contain at least one item");
        }
        if (totalAmount == null || totalAmount.signum() <= 0) {
            throw new IllegalArgumentException("totalAmount must be greater than zero");
        }
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new IllegalArgumentException("idempotencyKey is required");
        }
        items = List.copyOf(items);
    }
}
