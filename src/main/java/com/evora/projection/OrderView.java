package com.evora.projection;

import com.evora.domain.order.OrderItem;
import com.evora.domain.order.OrderStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderView(
        String orderId,
        String customerId,
        List<OrderItem> items,
        BigDecimal totalAmount,
        OrderStatus status,
        String sagaStep,
        String failureReason,
        Instant updatedAt,
        List<OrderTimelineEntry> timeline
) {
}
