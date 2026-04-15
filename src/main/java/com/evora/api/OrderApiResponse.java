package com.evora.api;

import com.evora.domain.order.OrderStatus;
import com.evora.domain.order.OrderItem;
import com.evora.projection.OrderTimelineEntry;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderApiResponse(
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
