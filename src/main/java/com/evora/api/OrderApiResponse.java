package com.evora.api;

import com.evora.domain.order.OrderStatus;
import com.evora.domain.order.OrderItem;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderApiResponse(
        String orderId,
        String customerId,
        List<OrderItem> items,
        BigDecimal totalAmount,
        OrderStatus status,
        String failureReason,
        Instant updatedAt
) {
}
