package com.evora.command;

import com.evora.domain.order.OrderItem;
import com.evora.shared.Command;

import java.time.Instant;
import java.util.List;

public record PlaceOrderCommand(
        String aggregateId,
        String customerId,
        List<OrderItem> items,
        String idempotencyKey,
        Instant occurredAt
) implements Command {
    public PlaceOrderCommand {
        if (aggregateId == null || aggregateId.isBlank()) {
            throw new IllegalArgumentException("aggregateId is required");
        }
        if (customerId == null || customerId.isBlank()) {
            throw new IllegalArgumentException("customerId is required");
        }
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new IllegalArgumentException("idempotencyKey is required");
        }
        if (occurredAt == null) {
            throw new IllegalArgumentException("occurredAt is required");
        }
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("items must contain at least one item");
        }
        items = List.copyOf(items);
    }
}
